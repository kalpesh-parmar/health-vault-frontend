// Registers a periodic background wearable sync via expo-background-task
// (WorkManager on Android / BGTaskScheduler on iOS). The task is defined at
// module top-level so it is restored on app relaunch; import this module once
// (side-effect) from App.tsx and call registerWearableBackgroundSync() there.

import * as BackgroundTask from "expo-background-task"
import * as TaskManager from "expo-task-manager"
import { syncWearables } from "./wearableSyncService"

import { AppState } from "react-native"
import { getHealthProvider } from "./providerFactory"
import { isBackgroundReadGranted } from "./healthConnectProvider"
import { syncQueueManager } from "./SyncQueueManager"
import { syncDiagnosticsManager } from "./SyncDiagnosticsManager"

export const WEARABLE_BACKGROUND_SYNC = "WEARABLE_BACKGROUND_SYNC"

// Minutes. OS-enforced minimum is 15; treated as a lower bound, not exact.
const MINIMUM_INTERVAL_MINUTES = 30

// Must be defined in the global scope (module top-level), not in a component.
TaskManager.defineTask(WEARABLE_BACKGROUND_SYNC, async () => {
	const startMs = Date.now();
	try {
		const isForeground = AppState.currentState === "active";
		const provider = getHealthProvider() as any;
		const grantedList = await provider.getGrantedPermissions().catch(() => []);
		const bgGranted = isBackgroundReadGranted(grantedList);

		if (!isForeground && !bgGranted) {
			console.log("[BACKGROUND-TASK] Skipping background sync: READ_HEALTH_DATA_IN_BACKGROUND is not granted. Sync deferred to foreground.");
			return BackgroundTask.BackgroundTaskResult.Success;
		}

		console.log("[BACKGROUND-TASK] Triggering background synchronization...");
		const result = await syncQueueManager.enqueue("BACKGROUND_SYNC", () =>
			syncWearables()
		)
		const durationMs = Date.now() - startMs;

		await syncDiagnosticsManager.logDiagnostics({
			source: "background_sync",
			durationMs,
			samplesReceived: result.samplesReceived,
			samplesWritten: result.samplesWritten,
			duplicatesIgnored: result.samplesReceived - result.samplesWritten,
			status: result.ok ? "SUCCESS" : "FAILED",
			error: result.reason,
		});

		return result.ok
			? BackgroundTask.BackgroundTaskResult.Success
			: BackgroundTask.BackgroundTaskResult.Failed
	} catch (e: any) {
		console.error("[BACKGROUND-TASK] Sync execution crashed:", e);
		await syncDiagnosticsManager.logDiagnostics({
			source: "background_sync",
			durationMs: Date.now() - startMs,
			samplesReceived: 0,
			samplesWritten: 0,
			duplicatesIgnored: 0,
			status: "FAILED",
			error: e?.message || "Native background execution crash",
		});
		return BackgroundTask.BackgroundTaskResult.Failed
	}
})

// Register the periodic background sync. Idempotent and safe to call on every
// app start. Returns false when the OS reports background tasks as restricted.
export async function registerWearableBackgroundSync(): Promise<boolean> {
	try {
		const status = await BackgroundTask.getStatusAsync()
		if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
			return false
		}
		const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(
			WEARABLE_BACKGROUND_SYNC,
		)
		if (!alreadyRegistered) {
			await BackgroundTask.registerTaskAsync(WEARABLE_BACKGROUND_SYNC, {
				minimumInterval: MINIMUM_INTERVAL_MINUTES,
			})
		}
		return true
	} catch {
		return false
	}
}

export async function unregisterWearableBackgroundSync(): Promise<void> {
	try {
		const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(
			WEARABLE_BACKGROUND_SYNC,
		)
		if (alreadyRegistered) {
			await BackgroundTask.unregisterTaskAsync(WEARABLE_BACKGROUND_SYNC)
		}
	} catch {
		// no-op
	}
}
