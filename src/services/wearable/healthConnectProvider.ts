// Android Health Connect implementation of HealthProvider, backed by
// react-native-health-connect v3.

import {
	getGrantedPermissions,
	getSdkStatus,
	initialize,
	readRecords,
	requestPermission,
	SdkAvailabilityStatus,
} from "react-native-health-connect"
import { METRIC_UNITS } from "./types"
import type {
	LegacyProviderApi,
	NormalizedSample,
	PermissionResult,
	ReadSamplesOptions,
	WearableMetricType,
} from "./types"
import { resolveXcodeBuildSetting } from "@expo/config-plugins/build/ios/utils/Xcodeproj.js"

type HcRecordType =
	| "Steps"
	| "Distance"
	| "ActiveCaloriesBurned"
	| "HeartRate"
	| "RestingHeartRate"
	| "SleepSession"
	| "OxygenSaturation"
	| "HeartRateVariabilityRmssd"
	| "BodyTemperature"
	| "RespiratoryRate"
	| "Weight"
	| "BloodPressure"
	| "BloodGlucose"

const RECORD_TYPE_BY_METRIC: Record<WearableMetricType, HcRecordType> = {
	steps: "Steps",
	distance: "Distance",
	active_energy: "ActiveCaloriesBurned",
	heart_rate: "HeartRate",
	resting_heart_rate: "RestingHeartRate",
	sleep: "SleepSession",
	spo2: "OxygenSaturation",
	hrv: "HeartRateVariabilityRmssd",
	body_temperature: "BodyTemperature",
	respiratory_rate: "RespiratoryRate",
	weight: "Weight",
	blood_pressure_systolic: "BloodPressure",
	blood_pressure_diastolic: "BloodPressure",
	blood_glucose: "BloodGlucose",
}

// react-native-health-connect has represented metadata.dataOrigin as either a
// bare package-name string or an object { packageName }. Handle both.
function extractSource(record: Record<string, unknown>): string {
	const metadata = record?.metadata as { dataOrigin?: unknown } | undefined
	const origin = metadata?.dataOrigin
	if (!origin) return "unknown"
	if (typeof origin === "string") return origin || "unknown"
	const pkg = (origin as { packageName?: string }).packageName
	return pkg || "unknown"
}

function toIso(value: unknown): string {
	if (typeof value === "string" || typeof value === "number") {
		const d = new Date(value)
		if (!Number.isNaN(d.getTime())) return d.toISOString()
	}
	return new Date(0).toISOString()
}

function num(value: unknown): number {
	const n = Number(value)
	return Number.isFinite(n) ? n : 0
}

// Map one raw Health Connect record into zero or more normalized samples.
function mapRecord(
	metric: WearableMetricType,
	raw: unknown,
): NormalizedSample[] {
	const record = (raw ?? {}) as Record<string, unknown>
	const unit = METRIC_UNITS[metric]
	const source = extractSource(record)

	switch (metric) {
		case "steps":
			return [
				{
					metricType: metric,
					value: num(record.count),
					unit,
					startTs: toIso(record.startTime),
					endTs: toIso(record.endTime),
					source,
				},
			]
		case "distance": {
			const distance = record.distance as { inMeters?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(distance?.inMeters),
					unit,
					startTs: toIso(record.startTime),
					endTs: toIso(record.endTime),
					source,
				},
			]
		}
		case "active_energy": {
			const energy = record.energy as
				| { inKilocalories?: unknown }
				| undefined
			return [
				{
					metricType: metric,
					value: num(energy?.inKilocalories),
					unit,
					startTs: toIso(record.startTime),
					endTs: toIso(record.endTime),
					source,
				},
			]
		}
		case "heart_rate": {
			// Series record: flatten instantaneous samples.
			const samples = Array.isArray(record.samples)
				? (record.samples as Array<Record<string, unknown>>)
				: []
			return samples.map((s) => {
				const ts = toIso(s.time)
				return {
					metricType: metric,
					value: num(s.beatsPerMinute),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				}
			})
		}
		case "resting_heart_rate": {
			const ts = toIso(record.time)
			return [
				{
					metricType: metric,
					value: num(record.beatsPerMinute),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "sleep": {
			const startMs = new Date(toIso(record.startTime)).getTime()
			const endMs = new Date(toIso(record.endTime)).getTime()
			const minutes = Math.max(0, Math.round((endMs - startMs) / 60000))
			return [
				{
					metricType: metric,
					value: minutes,
					unit,
					startTs: toIso(record.startTime),
					endTs: toIso(record.endTime),
					source,
				},
			]
		}
		case "spo2": {
			const ts = toIso(record.time)
			return [
				{
					metricType: metric,
					value: num(record.percentage),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "hrv": {
			const ts = toIso(record.time)
			const val = record.heartRateVariabilityMillis !== undefined
				? num(record.heartRateVariabilityMillis)
				: num(record.value)
			return [
				{
					metricType: metric,
					value: val,
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "body_temperature": {
			const ts = toIso(record.time)
			const temp = record.temperature as { inCelsius?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(temp?.inCelsius),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "respiratory_rate": {
			const ts = toIso(record.time)
			return [
				{
					metricType: metric,
					value: num(record.rate),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "weight": {
			const ts = toIso(record.time)
			const w = record.weight as { inKilograms?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(w?.inKilograms),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "blood_pressure_systolic": {
			const ts = toIso(record.time)
			const bp = record.systolic as { inMillimetersOfMercury?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(bp?.inMillimetersOfMercury),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "blood_pressure_diastolic": {
			const ts = toIso(record.time)
			const bp = record.diastolic as { inMillimetersOfMercury?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(bp?.inMillimetersOfMercury),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		case "blood_glucose": {
			const ts = toIso(record.time)
			const bg = record.level as { inMilligramsPerDeciliter?: unknown } | undefined
			return [
				{
					metricType: metric,
					value: num(bg?.inMilligramsPerDeciliter),
					unit,
					startTs: ts,
					endTs: ts,
					source,
				},
			]
		}
		default:
			return []
	}
}

function isRecordTypeGranted(grantedList: any[], recordType: HcRecordType): boolean {
	if (!Array.isArray(grantedList)) return false;
	const upperRec = recordType.toUpperCase();
	return grantedList.some((p) => {
		if (typeof p === "string") {
			return p.toUpperCase().includes(upperRec);
		}
		if (p && typeof p === "object") {
			if (p.recordType && String(p.recordType).toUpperCase() === upperRec) {
				return !p.accessType || p.accessType === "read";
			}
			if (p.permission && String(p.permission).toUpperCase().includes(upperRec)) {
				return true;
			}
		}
		return false;
	});
}

function mapGrantedToMetrics(
	granted: any[],
	requested: WearableMetricType[],
): WearableMetricType[] {
	return requested.filter((m) =>
		isRecordTypeGranted(granted, RECORD_TYPE_BY_METRIC[m]),
	)
}

async function hcIsAvailable(): Promise<boolean> {
	try {
		const status = await getSdkStatus()
		return status === SdkAvailabilityStatus.SDK_AVAILABLE
	} catch {
		return false
	}
}
export function isBackgroundReadGranted(grantedList: any[]): boolean {
	if (!Array.isArray(grantedList)) return false;
	return grantedList.some((p: any) => {
		if (typeof p === "string") {
			return p.toUpperCase().includes("READ_HEALTH_DATA_IN_BACKGROUND") || p.includes("HealthDataInBackground");
		}
		const recordType = String(p?.recordType || "").toUpperCase();
		const permission = String(p?.permission || "").toUpperCase();
		return (
			recordType === "HEALTHDATAINBACKGROUND" ||
			recordType.includes("READ_HEALTH_DATA_IN_BACKGROUND") ||
			permission.includes("READ_HEALTH_DATA_IN_BACKGROUND")
		);
	});
}

export const healthConnectProvider: LegacyProviderApi & { isAvailable(): Promise<boolean>; platform: string; isBackgroundReadGranted(grantedList: any[]): boolean } = {
	platform: "health_connect",

	isBackgroundReadGranted(grantedList: any[]): boolean {
		return isBackgroundReadGranted(grantedList);
	},

	async isAvailable(): Promise<boolean> {
		return hcIsAvailable()
	},

	async initialize(): Promise<boolean> {
		try {
			if (!(await hcIsAvailable())) return false
			return await initialize()
		} catch {
			return false
		}
	},

	async requestPermissions(
		metrics: WearableMetricType[],
	): Promise<PermissionResult> {
		const permissions: any[] = metrics
			.map((m) => RECORD_TYPE_BY_METRIC[m])
			.filter(Boolean)
			.map((rt) => ({
				accessType: "read" as const,
				recordType: rt,
			}))

		// Include background read permission
		permissions.push({ accessType: "read" as const, recordType: "HealthDataInBackground" as any })

		console.log(`[HC-READ] Requesting ${permissions.length} Health Connect permissions...`);
		try {
			const granted = await requestPermission(permissions)
			const grantedMetrics = mapGrantedToMetrics(granted, metrics)
			return { granted: grantedMetrics.length > 0, grantedMetrics }
		} catch (e) {
			console.warn("[HC-READ] Permission prompt dismissed or failed:", e)
			return { granted: false, grantedMetrics: [] }
		}
	},

	async getGrantedPermissions(
		metrics: WearableMetricType[],
	): Promise<WearableMetricType[]> {
		try {
			const granted = await getGrantedPermissions()
			return mapGrantedToMetrics(granted, metrics)
		} catch {
			return []
		}
	},

	async readSamples(
		options: ReadSamplesOptions,
	): Promise<NormalizedSample[]> {
		const recordType = RECORD_TYPE_BY_METRIC[options.metric]
		if (!recordType) {
			console.warn(`[HC-READ] No mapping for metric: ${options.metric}`);
			return []
		}
		try {
			// 1) Sdk status check:
			const isAvail = await this.isAvailable()
			if (!isAvail) return []

			// 2) Initialize:
			const initialized = await initialize()
			console.log(`[HC-READ] initialize() => ${initialized}`);

			// 3) Permission check:
			const granted = await getGrantedPermissions()
			const hasRead = isRecordTypeGranted(granted, recordType);
			console.log(`[KP] ==> granted: ${JSON.stringify(granted)} : hasRead: ${hasRead}`);
			if (!hasRead) {
				console.warn(`[HC-READ] Read requested for ${recordType} but permission not granted`);
				return []
			}

			// 4) Read records with date range filter and pagination:
			console.log(`[HC-READ] Reading ${recordType} from ${options.startTime} to ${options.endTime}`);
			const now = new Date();
			const startTime = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
			).toISOString();

			const endTime = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
			).toISOString();
			let allRecords: any[] = [];
			let pageToken: string | undefined = undefined;
			let result: any = null;

			try {
				do {
					console.log(`[KP]: check request: ${JSON.stringify({
						timeRangeFilter: {
							operator: "between",
							startTime: startTime,
							endTime: endTime,
						},
						pageSize: 5000,
						pageToken,
					})}`)
					result = await readRecords(recordType, {
						timeRangeFilter: {
							operator: "after",
							startTime: options.startTime,
							// endTime: options.endTime,
						},
						ascendingOrder: false,
						pageSize: 1,
						pageToken,
					});
					console.log(`[KP] ==> recordType: ${recordType}, result: ${JSON.stringify(result)}`);
					const records = Array.isArray(result) ? result : (result?.records ?? []);
					allRecords = allRecords.concat(records);
					pageToken = result?.pageToken;
				} while (pageToken && allRecords.length < 25000);

				if (allRecords.length === 0) {
					console.warn(
						`[HC-DEBUG] Zero records for ${recordType}.\n  startTime: ${options.startTime},\n  endTime: ${options.endTime},\n  anchor used: ${options.startTime}`,
					);
					console.warn(`[HC-ORIGINS] dataOrigins for ${recordType}: ${JSON.stringify(result?.dataOrigins ?? [])}`);
				}
			} catch (e: any) {
				const msg = e?.message || String(e);
				if (msg.includes("must be in foreground") || msg.includes("READ_HEALTH_DATA_IN_BACKGROUND")) {
					console.warn(`[HC-READ] RemoteException: App must be in foreground to read ${recordType} without background permission. Deferring read to foreground.`);
					return [];
				}
				console.error(`[HC-READ] Error reading ${recordType} records:`, e);
				return [];
			}

			const origins = Array.from(new Set(allRecords.map((r: any) => extractSource(r))));
			console.log(`[HC-READ] Debug Read: metric=${options.metric} | recordType=${recordType} | rawCount=${allRecords.length} | dataOrigins=[${origins.join(", ")}]`);

			const mapped = allRecords.flatMap((r) => mapRecord(options.metric, r))
			console.log(`[HC-READ] ${recordType} mappedSamples=${mapped.length}`);
			return mapped
		} catch (e: any) {
			console.error(`[HC-READ] Error reading ${recordType}:`, e);
			return []
		}
	},
}
