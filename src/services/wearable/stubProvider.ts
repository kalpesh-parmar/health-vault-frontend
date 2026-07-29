import type { HealthProvider } from "./HealthProvider";
import {
  ConnectionState,
  NormalizedSample,
  Reliability,
  WearableMetricType,
} from "./types";

export class StubProvider implements HealthProvider {
  readonly id = "stub_provider";
  readonly displayName = "Stub Provider";
  readonly reliability: Reliability = "indirect";

  private _currentState: ConnectionState = "not_connected";
  private _isAvailable = true;
  private _lastSyncedAt: Date | null = null;
  private _mockSamples: NormalizedSample[] = [];
  private listeners: ((state: ConnectionState) => void)[] = [];

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emitState() {
    for (const listener of this.listeners) {
      try {
        listener(this._currentState);
      } catch (err) {
        console.error("[StubProvider] Listener error:", err);
      }
    }
  }

  setMockState(state: ConnectionState) {
    this._currentState = state;
    this.emitState();
  }

  setMockAvailable(available: boolean) {
    this._isAvailable = available;
    if (!available) {
      this._currentState = "needs_companion_app";
      this.emitState();
    }
  }

  setMockLastSyncedAt(date: Date | null) {
    this._lastSyncedAt = date;
  }

  setMockSamples(samples: NormalizedSample[]) {
    this._mockSamples = samples;
  }

  async isAvailable(): Promise<boolean> {
    return this._isAvailable;
  }

  async getState(): Promise<ConnectionState> {
    if (!this._isAvailable) {
      return "needs_companion_app";
    }
    return this._currentState;
  }

  async connect(): Promise<ConnectionState> {
    this._currentState = "connecting";
    this.emitState();

    // Simulate async connection delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!this._isAvailable) {
      this._currentState = "needs_companion_app";
    } else {
      this._currentState = "connected";
    }
    
    this.emitState();
    return this._currentState;
  }

  getSupportedMetrics(): WearableMetricType[] {
    return ["steps", "distance", "active_energy", "heart_rate", "resting_heart_rate", "sleep"];
  }

  async read(metric: WearableMetricType, _range: { startTime: Date; endTime: Date }): Promise<NormalizedSample[]> {
    return this._mockSamples.filter((s) => s.metricType === metric);
  }

  async lastSyncedAt(): Promise<Date | null> {
    return this._lastSyncedAt;
  }
}
