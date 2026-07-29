import { healthKitProvider } from "./healthKitProvider";
import type { HealthProvider } from "./HealthProvider";
import {
  ConnectionState,
  NormalizedSample,
  Reliability,
  WearableMetricType,
  LegacyProviderApi,
} from "./types";

export class HealthKitAdapter implements HealthProvider, LegacyProviderApi {
  readonly id = "healthkit";
  readonly displayName = "Apple Health";
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
        console.error("[HealthKitAdapter] Listener error:", err);
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return await healthKitProvider.isAvailable();
  }

  async getState(): Promise<ConnectionState> {
    if (this._currentState) {
      return this._currentState;
    }
    return "needs_companion_app"; // iOS stub is unavailable on standard Android test devices
  }

  async connect(): Promise<ConnectionState> {
    return "needs_companion_app";
  }

  getSupportedMetrics(): WearableMetricType[] {
    return ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
  }

  async read(metric: WearableMetricType, range: { startTime: Date; endTime: Date }): Promise<NormalizedSample[]> {
    return await healthKitProvider.readSamples({
      metric,
      startTime: range.startTime.toISOString(),
      endTime: range.endTime.toISOString(),
    });
  }

  async lastSyncedAt(): Promise<Date | null> {
    return null;
  }

  // --- Legacy Compatibility Shims ---
  async initialize(): Promise<boolean> {
    return await healthKitProvider.initialize();
  }

  async requestPermissions(metrics: WearableMetricType[]) {
    return await healthKitProvider.requestPermissions(metrics);
  }

  async getGrantedPermissions(metrics: WearableMetricType[]) {
    return await healthKitProvider.getGrantedPermissions(metrics);
  }

  async readSamples(options: { metric: WearableMetricType; startTime: string; endTime: string }) {
    return await healthKitProvider.readSamples(options);
  }
}
