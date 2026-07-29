import { healthConnectProvider } from "./healthConnectProvider";
import type { HealthProvider } from "./HealthProvider";
import {
  ConnectionState,
  NormalizedSample,
  Reliability,
  WearableMetricType,
  LegacyProviderApi,
  STALE_THRESHOLD_MS,
} from "./types";
import * as SecureStore from "expo-secure-store";
import { getSdkStatus, SdkAvailabilityStatus } from "react-native-health-connect";

const CONNECTION_ID_KEY = "wearable_connection_id_health_connect";
const LAST_SYNC_TIME_KEY = "wearable_sync_last_time_health_connect";

export class HealthConnectAdapter implements HealthProvider, LegacyProviderApi {
  readonly id = "health_connect";
  readonly displayName = "Health Connect";
  readonly reliability: Reliability = "recommended";

  private _currentState: ConnectionState | null = null;
  private listeners: ((state: ConnectionState) => void)[] = [];

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  setTransientState(state: ConnectionState | null) {
    this._currentState = state;
    this.emitState();
  }

  private async emitState() {
    const state = await this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("[HealthConnectAdapter] Listener error:", err);
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return await healthConnectProvider.isAvailable();
  }

  async getState(): Promise<ConnectionState> {
    if (this._currentState) {
      return this._currentState;
    }

    try {
      const status = await getSdkStatus();
      // NOTE: Currently fires for ANY non-SDK_AVAILABLE status.
      // TODO (Phase C): Distinguish SDK_UNAVAILABLE (unsupported device / OS < Android 8)
      // from SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED / NOT_INSTALLED (installable/updatable -> real companion/store action).
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        return "needs_companion_app";
      }
    } catch {
      return "needs_companion_app";
    }

    const coreMetrics: WearableMetricType[] = ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
    const granted = await healthConnectProvider.getGrantedPermissions(coreMetrics);
    const hasCore = coreMetrics.every((m) => granted.includes(m));

    if (!hasCore) {
      return "needs_permission";
    }

    const cachedId = await SecureStore.getItemAsync(CONNECTION_ID_KEY);
    if (!cachedId) {
      return "not_connected";
    }

    const lastSyncStr = await SecureStore.getItemAsync(LAST_SYNC_TIME_KEY);
    if (lastSyncStr) {
      const lastSync = new Date(lastSyncStr);
      if (Date.now() - lastSync.getTime() > STALE_THRESHOLD_MS) {
        return "stale";
      }
    }

    return "connected";
  }

  async connect(): Promise<ConnectionState> {
    this.setTransientState("connecting");
    try {
      const available = await this.isAvailable();
      if (!available) {
        this.setTransientState(null);
        return "needs_companion_app";
      }

      await healthConnectProvider.initialize();
      const coreMetrics: WearableMetricType[] = ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
      
      const permResult = await healthConnectProvider.requestPermissions(coreMetrics);
      const hasCore = coreMetrics.every((m) => permResult.grantedMetrics.includes(m));
      
      if (!hasCore) {
        this.setTransientState(null);
        return "needs_permission";
      }

      // Re-trigger ensures connection and sets cache
      const { syncWearables } = require("./wearableSyncService");
      const result = await syncWearables({ interactive: true });
      
      if (!result.ok) {
        this.setTransientState(null);
        return "error";
      }

      this.setTransientState(null);
      return "connected";
    } catch (err) {
      this.setTransientState("error");
      return "error";
    }
  }

  getSupportedMetrics(): WearableMetricType[] {
    return ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
  }

  async read(metric: WearableMetricType, range: { startTime: Date; endTime: Date }): Promise<NormalizedSample[]> {
    return await healthConnectProvider.readSamples({
      metric,
      startTime: range.startTime.toISOString(),
      endTime: range.endTime.toISOString(),
    });
  }

  async lastSyncedAt(): Promise<Date | null> {
    const val = await SecureStore.getItemAsync(LAST_SYNC_TIME_KEY);
    return val ? new Date(val) : null;
  }

  // --- Legacy Compatibility Shims ---
  async initialize(): Promise<boolean> {
    return await healthConnectProvider.initialize();
  }

  async requestPermissions(metrics: WearableMetricType[]) {
    return await healthConnectProvider.requestPermissions(metrics);
  }

  async getGrantedPermissions(metrics: WearableMetricType[]) {
    return await healthConnectProvider.getGrantedPermissions(metrics);
  }

  async readSamples(options: { metric: WearableMetricType; startTime: string; endTime: string }) {
    return await healthConnectProvider.readSamples(options);
  }
}
