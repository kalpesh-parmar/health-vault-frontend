// Orchestrates wearable sync:
//   1. gate on Health Connect availability + granted read permissions,
//   2. ensure a backend connection (cached id in SecureStore),
//   3. read new samples per metric (30-day backfill first run, then incremental
//      via per-metric anchors),
//   4. push to POST /v1/wearables/sync in <=500-sample chunks.
// Backend payloads/response shapes match the backend contract exactly.

import * as SecureStore from "expo-secure-store";
import apiClient from "../apiClient";
import { getHealthProvider } from "./providerFactory";
import { syncDiagnosticsManager } from "./SyncDiagnosticsManager";
import {
	SUPPORTED_METRICS,
	type NormalizedSample,
	type WearableMetricType,
	type SyncResult,
} from "./types";

const WEARABLES_BASE = "/v1/wearables";
const SOURCE = "health_connect";
const CONNECTION_ID_KEY = "wearable_connection_id_health_connect";
const BACKFILL_DAYS = 30;
const CHUNK_SIZE = 500;

const HEALTH_PERMISSION_BY_METRIC: Record<WearableMetricType, string> = {
	steps: "android.permission.health.READ_STEPS",
	distance: "android.permission.health.READ_DISTANCE",
	active_energy: "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
	heart_rate: "android.permission.health.READ_HEART_RATE",
	resting_heart_rate: "android.permission.health.READ_RESTING_HEART_RATE",
	sleep: "android.permission.health.READ_SLEEP",
	spo2: "android.permission.health.READ_OXYGEN_SATURATION",
	hrv: "android.permission.health.READ_HEART_RATE_VARIABILITY",
	body_temperature: "android.permission.health.READ_BODY_TEMPERATURE",
	respiratory_rate: "android.permission.health.READ_RESPIRATORY_RATE",
	weight: "android.permission.health.READ_WEIGHT",
	blood_pressure_systolic: "android.permission.health.READ_BLOOD_PRESSURE",
	blood_pressure_diastolic: "android.permission.health.READ_BLOOD_PRESSURE",
	blood_glucose: "android.permission.health.READ_BLOOD_GLUCOSE",
};

function anchorKey(metric: WearableMetricType): string {
	return `wearable_sync_anchor_${metric}`;
}

function isoDaysAgo(from: Date, days: number): string {
	return new Date(from.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}

export async function clearWearableSession(): Promise<void> {
	try {
		await SecureStore.deleteItemAsync(CONNECTION_ID_KEY);
		await SecureStore.deleteItemAsync("wearable_sync_last_time_health_connect");
		for (const metric of SUPPORTED_METRICS) {
			await SecureStore.deleteItemAsync(anchorKey(metric));
		}
		console.log("[HC-SYNC] Cleared stored wearable connection ID and anchors for user switch/logout.");
	} catch (e: any) {
		console.warn("[HC-SYNC] Failed to clear wearable session:", e.message || e);
	}
}

export async function resetWearableSyncAnchors(): Promise<void> {
	for (const metric of SUPPORTED_METRICS) {
		try {
			await SecureStore.deleteItemAsync(anchorKey(metric));
		} catch { }
	}
	try {
		await SecureStore.deleteItemAsync("wearable_sync_last_time_health_connect");
	} catch { }
	console.log("[HC-SYNC] Reset all wearable sync anchors to force fresh 30-day BACKFILL on next run.");
}

// Reuse the cached connection id, else register one.
export async function ensureConnection(
	grantedMetrics: WearableMetricType[],
	forceRefresh = false
): Promise<string | null> {
	console.log("[HC-READ-DIAGNOSTIC] Cached connectionId:", await SecureStore.getItemAsync(CONNECTION_ID_KEY));
	if (!forceRefresh) {
		const cached = await SecureStore.getItemAsync(CONNECTION_ID_KEY);
		if (cached) return cached;
	}
	const grantedScopes = grantedMetrics.map((m) => HEALTH_PERMISSION_BY_METRIC[m]);
	console.log(`[HC-SYNC] Requesting backend POST ${WEARABLES_BASE}/connections with ${grantedScopes.length} scopes...`);
	const res = await apiClient.post(`${WEARABLES_BASE}/connections`, {
		source: SOURCE,
		grantedScopes,
		status: "ACTIVE",
	});
	const id: unknown = res?.data?.data?.id;
	if (typeof id === "string" && id.length > 0) {
		await SecureStore.setItemAsync(CONNECTION_ID_KEY, id);
		console.log(`[HC-SYNC] Successfully stored connectionId ${id} in SecureStore.`);
		return id;
	}
	return null;
}

export async function isWearableAvailable(): Promise<boolean> {
	return getHealthProvider().isAvailable();
}

// Explicit permission prompt (call from onboarding / a "Connect" button).
export async function requestWearablePermissions(): Promise<WearableMetricType[]> {
	const provider = getHealthProvider() as any;
	if (!(await provider.isAvailable())) return [];
	await provider.initialize();
	const result = await provider.requestPermissions([...SUPPORTED_METRICS]);
	return result.grantedMetrics;
}

let lastSyncCompletedTimestamp = 0;
let inFlightSyncPromise: Promise<SyncResult> | null = null;

export async function syncWearables(options?: { interactive?: boolean; force?: boolean }): Promise<SyncResult> {
	if (inFlightSyncPromise) {
		console.log("[HC-SYNC] Coalescing duplicate sync request: returning active in-flight sync promise.");
		return inFlightSyncPromise;
	}

	const nowMs = Date.now();
	// if (!options?.force && !options?.interactive && nowMs - lastSyncCompletedTimestamp < 60000) {
	// 	const elapsedSec = Math.round((nowMs - lastSyncCompletedTimestamp) / 1000);
	// 	console.log(`[HC-SYNC] Throttling sync request: last sync was ${elapsedSec}s ago (< 60s threshold).`);
	// 	return {
	// 		ok: true,
	// 		reason: "throttled_recent_sync",
	// 		metrics: [],
	// 		samplesReceived: 0,
	// 		samplesWritten: 0,
	// 	};
	// }

	inFlightSyncPromise = _executeSyncWearables(options).finally(() => {
		lastSyncCompletedTimestamp = Date.now();
		inFlightSyncPromise = null;
	});

	return inFlightSyncPromise;
}

async function _executeSyncWearables(options?: { interactive?: boolean; force?: boolean }): Promise<SyncResult> {
	const startTimeMs = Date.now();
	const base: SyncResult = {
		ok: false,
		metrics: [],
		samplesReceived: 0,
		samplesWritten: 0,
	};
	const provider = getHealthProvider() as any;

	if (!(await provider.isAvailable())) {
		await syncDiagnosticsManager.logDiagnostics({
			source: SOURCE,
			durationMs: Date.now() - startTimeMs,
			samplesReceived: 0,
			samplesWritten: 0,
			duplicatesIgnored: 0,
			status: "FAILED",
			errorMessage: "Health Connect SDK is not available on this device",
		});
		return { ...base, reason: "unavailable" };
	}

	if (provider.setTransientState) {
		provider.setTransientState("syncing");
	}

	let syncSuccess = false;
	try {
		await provider.initialize();

		const granted = options?.interactive
			? (await provider.requestPermissions([...SUPPORTED_METRICS])).grantedMetrics
			: await provider.getGrantedPermissions([...SUPPORTED_METRICS]);

		const coreMetrics: WearableMetricType[] = ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
		const hasAllCore = coreMetrics.every((m) => granted.includes(m));

		if (!hasAllCore) {
			const cachedId = await SecureStore.getItemAsync(CONNECTION_ID_KEY);
			if (cachedId) {
				try {
					console.log(`[HC-SYNC] Core permissions missing/revoked. Soft-revoking connection ${cachedId} on backend...`);
					await apiClient.delete(`${WEARABLES_BASE}/connections/${cachedId}`);
				} catch (e: any) {
					console.error("[HC-SYNC] Failed to revoke connection on backend:", e.message || e);
				}
				await SecureStore.deleteItemAsync(CONNECTION_ID_KEY);
			}
			await syncDiagnosticsManager.logDiagnostics({
				source: SOURCE,
				durationMs: Date.now() - startTimeMs,
				samplesReceived: 0,
				samplesWritten: 0,
				duplicatesIgnored: 0,
				status: "FAILED",
				errorMessage: "Core permissions missing or revoked",
				recordTypesRequested: granted,
			});
			return { ...base, reason: "no_permissions", metrics: granted };
		}

		let connectionId: string | null;
		try {
			connectionId = await ensureConnection(granted);
		} catch (connErr: any) {
			const httpStatus = connErr?.response?.status || connErr?.status;
			const errorCode = connErr?.response?.data?.errorCode || connErr?.response?.data?.code || connErr?.code;
			const errorMessage = connErr?.response?.data?.message || connErr?.response?.data?.error?.message || connErr?.message || String(connErr);

			await syncDiagnosticsManager.logDiagnostics({
				source: SOURCE,
				durationMs: Date.now() - startTimeMs,
				samplesReceived: 0,
				samplesWritten: 0,
				duplicatesIgnored: 0,
				status: "FAILED",
				errorMessage,
				errorCode,
				httpStatus,
				recordTypesRequested: granted,
			});
			return { ...base, metrics: granted, reason: errorMessage };
		}
		if (!connectionId) {
			const errorMessage = "Failed to establish connection ID with backend";
			await syncDiagnosticsManager.logDiagnostics({
				source: SOURCE,
				durationMs: Date.now() - startTimeMs,
				samplesReceived: 0,
				samplesWritten: 0,
				duplicatesIgnored: 0,
				status: "FAILED",
				errorMessage,
				recordTypesRequested: granted,
			});
			return { ...base, metrics: granted, reason: errorMessage };
		}

		const now = new Date();
		const nowIso = now.toISOString();

		if (options?.force) {
			console.log("[HC-SYNC] Force sync requested: resetting all metric anchors to force 30-day BACKFILL mode.");
			for (const m of granted) {
				try {
					await SecureStore.deleteItemAsync(anchorKey(m));
				} catch { }
			}
		}

		// Read new samples for each granted metric since its anchor.
		const collected: NormalizedSample[] = [];
		const perRecordCounts: Record<string, number> = {};
		let earliestStartIso = nowIso;

		for (const metric of granted) {
			const anchor = await SecureStore.getItemAsync(anchorKey(metric));
			console.log(`[HC-ANCHOR] ${metric} anchor = ${anchor ?? "NONE (backfill mode)"}`);
			const isBackfill = !anchor;
			const mode = isBackfill ? "BACKFILL" : "INCREMENTAL";
			const startTime = anchor ? anchor : isoDaysAgo(now, BACKFILL_DAYS);
			if (startTime < earliestStartIso) earliestStartIso = startTime;

			console.log(`[HC-READ] Mode: ${mode} | Metric: ${metric} | Range: [${startTime} -> ${nowIso}]`);
			const samples = await provider.readSamples({
				metric,
				startTime,
				endTime: nowIso,
			});
			perRecordCounts[metric] = samples.length;
			console.log(`[HC-READ] Found ${samples.length} raw samples for ${metric} (Mode: ${mode})`);
			for (const s of samples) collected.push(s);
		}

		let samplesReceived = 0;
		let samplesWritten = 0;

		// PART B: If 0 samples collected, short-circuit and log INFO without making empty batch POST
		if (collected.length === 0) {
			console.log(`[HC-READ] INFO: 0 samples collected across ${granted.length} granted metrics. Skipping batch POST.`);
			syncSuccess = true;
			await syncDiagnosticsManager.logDiagnostics({
				source: SOURCE,
				durationMs: Date.now() - startTimeMs,
				samplesReceived: 0,
				samplesWritten: 0,
				duplicatesIgnored: 0,
				status: "SUCCESS",
				recordTypesRequested: granted,
				dateRangeStart: earliestStartIso,
				dateRangeEnd: nowIso,
				perRecordCounts,
			});
			return {
				ok: true,
				connectionId,
				metrics: granted,
				samplesReceived: 0,
				samplesWritten: 0,
			};
		}

		// Batch POST to backend with throttling and 429 handling
		let didReRegister = false;
		const batches = chunk(collected, CHUNK_SIZE);
		for (let i = 0; i < batches.length; i++) {
			if (i > 0) {
				// 200ms throttle delay between batch POST requests
				await new Promise((r) => setTimeout(r, 200));
			}

			const batch = batches[i];
			try {
				const token = await SecureStore.getItemAsync("accessToken");
				console.log(`[HC-POST] Syncing batch ${i + 1}/${batches.length} (${batch.length} samples) to POST ${WEARABLES_BASE}/sync. Auth token present: ${Boolean(token)}`);

				const res = await apiClient.post(`${WEARABLES_BASE}/sync`, {
					connectionId,
					samples: batch,
				});
				const data = res?.data?.data ?? {};
				const received = Number(data.samplesReceived ?? batch.length);
				const written = Number(data.samplesWritten ?? 0);
				console.log(`[HC-READ] Sync batch ${i + 1} complete: samplesReceived=${received} samplesWritten=${written}`);
				samplesReceived += received;
				samplesWritten += written;
			} catch (error: any) {
				const httpStatus = error?.response?.status || error?.status;
				const errorCode = error?.response?.data?.errorCode || error?.response?.data?.code || error?.code || (httpStatus ? `HTTP_${httpStatus}` : undefined);
				const fullErrorMessage = error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || String(error);
				const fullErrorStack = error?.stack || "";

				// Handle 429 Rate Limiting gracefully
				const isRateLimited = httpStatus === 429 || errorCode === "RATE_LIMIT_EXCEEDED" || fullErrorMessage.toLowerCase().includes("rate limit");
				if (isRateLimited) {
					const retryAfterHeader = error?.response?.headers?.["retry-after"];
					const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) || 60 : 60;
					console.warn(`[HC-READ] 429 Rate Limit Exceeded. Pausing sync for ${retryAfterSec} seconds.`);
					await syncDiagnosticsManager.logDiagnostics({
						source: SOURCE,
						durationMs: Date.now() - startTimeMs,
						samplesReceived,
						samplesWritten,
						duplicatesIgnored: 0,
						status: "FAILED",
						errorMessage: `Rate limit exceeded. Sync paused for ${retryAfterSec}s.`,
						errorCode: "RATE_LIMIT_EXCEEDED",
						httpStatus: 429,
						recordTypesRequested: granted,
						dateRangeStart: earliestStartIso,
						dateRangeEnd: nowIso,
						perRecordCounts,
					});
					return {
						ok: false,
						reason: `Syncing paused due to rate limit (${retryAfterSec}s retry)`,
						connectionId,
						metrics: granted,
						samplesReceived,
						samplesWritten,
					};
				}

				const isNotFound = httpStatus === 404 || errorCode === "NOT_FOUND" || fullErrorMessage.toLowerCase().includes("not found");

				if (isNotFound && !didReRegister) {
					console.warn(`[HC-READ] sync 404 / connection not found ("${fullErrorMessage}") — self-healing: re-registering ACTIVE connection...`);
					await SecureStore.deleteItemAsync(CONNECTION_ID_KEY);
					const fresh = await ensureConnection(granted, true);
					if (fresh) {
						connectionId = fresh;
						didReRegister = true;
						i--; // retry this same batch with the new connectionId
						continue;
					}
				}

				console.error(`[HC-READ] Error posting sync batch (${fullErrorMessage}):`, error);

				await syncDiagnosticsManager.logDiagnostics({
					source: SOURCE,
					durationMs: Date.now() - startTimeMs,
					samplesReceived,
					samplesWritten,
					duplicatesIgnored: 0,
					status: "FAILED",
					errorMessage: fullErrorMessage,
					errorCode,
					errorStack: fullErrorStack,
					httpStatus,
					recordTypesRequested: granted,
					dateRangeStart: earliestStartIso,
					dateRangeEnd: nowIso,
					perRecordCounts,
				});

				return {
					ok: false,
					reason: fullErrorMessage,
					connectionId,
					metrics: granted,
					samplesReceived,
					samplesWritten,
				};
			}
		}

		// Update anchors ONLY for metrics that actually collected samples
		for (const metric of granted) {
			const sampleCount = perRecordCounts[metric] || 0;
			const existingAnchor = await SecureStore.getItemAsync(anchorKey(metric));

			if (sampleCount > 0) {
				console.log(`[HC-READ] Advancing checkpoint for ${metric} (imported ${sampleCount} samples). New anchor: ${nowIso}`);
				await SecureStore.setItemAsync(anchorKey(metric), nowIso);
			} else if (!existingAnchor && samplesWritten > 0) {
				console.log(`[HC-READ] Initial backfill completed for ${metric}. Setting anchor: ${nowIso}`);
				await SecureStore.setItemAsync(anchorKey(metric), nowIso);
			} else {
				console.log(`[HC-READ] Preserving checkpoint state for ${metric} (0 samples collected). Anchor remains: ${existingAnchor || "NONE (BACKFILL pending)"}`);
			}
		}
		await SecureStore.setItemAsync("wearable_sync_last_time_health_connect", nowIso);

		syncSuccess = true;
		await syncDiagnosticsManager.logDiagnostics({
			source: SOURCE,
			durationMs: Date.now() - startTimeMs,
			samplesReceived,
			samplesWritten,
			duplicatesIgnored: 0,
			status: "SUCCESS",
			recordTypesRequested: granted,
			dateRangeStart: earliestStartIso,
			dateRangeEnd: nowIso,
			perRecordCounts,
		});

		return {
			ok: true,
			connectionId,
			metrics: granted,
			samplesReceived,
			samplesWritten,
		};
	} catch (err: any) {
		const fullErrorMessage = err?.message || String(err);
		console.error("[HC-SYNC] Sync process crashed:", fullErrorMessage, err);
		await syncDiagnosticsManager.logDiagnostics({
			source: SOURCE,
			durationMs: Date.now() - startTimeMs,
			samplesReceived: 0,
			samplesWritten: 0,
			duplicatesIgnored: 0,
			status: "FAILED",
			errorMessage: fullErrorMessage,
			errorStack: err?.stack,
		});
		return {
			...base,
			reason: "sync_failed",
		};
	} finally {
		if (provider.setTransientState) {
			provider.setTransientState(syncSuccess ? null : "error");
		}
	}
}
