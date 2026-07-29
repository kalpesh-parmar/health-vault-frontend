import type {
  ConnectionState,
  NormalizedSample,
  Reliability,
  WearableMetricType,
} from "./types";

export interface HealthProvider {
  readonly id: string;
  readonly displayName: string;
  readonly reliability: Reliability;

  isAvailable(): Promise<boolean>;
  getState(): Promise<ConnectionState>;
  connect(): Promise<ConnectionState>;
  getSupportedMetrics(): WearableMetricType[];
  read(metric: WearableMetricType, range: { startTime: Date; endTime: Date }): Promise<NormalizedSample[]>;
  lastSyncedAt(): Promise<Date | null>;
  onStateChange(listener: (state: ConnectionState) => void): () => void;
}
