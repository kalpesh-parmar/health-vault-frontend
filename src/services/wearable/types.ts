// Shared types for the wearable/health provider layer (frontend).
// Metric names + sample shape are aligned with the backend sync contract:
//   POST /v1/wearables/sync  { connectionId, samples: NormalizedSample[] }
// and the backend dedup hash: `${userId}_${metricType}_${startTs}_${endTs}_${source}_${value}`.

// MVP subset of the backend wearable_metric_type enum that the frontend reads.
export type WearableMetricType =
	| "steps"
	| "distance"
	| "active_energy"
	| "heart_rate"
	| "resting_heart_rate"
	| "sleep"
	| "spo2"
	| "hrv"
	| "body_temperature"
	| "respiratory_rate"
	| "weight"
	| "blood_pressure_systolic"
	| "blood_pressure_diastolic"
	| "blood_glucose"

// All metrics the frontend attempts to read/sync in the MVP.
export const SUPPORTED_METRICS: readonly WearableMetricType[] = [
	"steps",
	"distance",
	"active_energy",
	"heart_rate",
	"resting_heart_rate",
	"sleep",
	"spo2",
	"hrv",
	"body_temperature",
	"respiratory_rate",
	"weight",
	"blood_pressure_systolic",
	"blood_pressure_diastolic",
	"blood_glucose",
] as const

// Canonical unit per metric, sent to the backend alongside each sample.
export const METRIC_UNITS: Record<WearableMetricType, string> = {
	steps: "count",
	distance: "m",
	active_energy: "kcal",
	heart_rate: "bpm",
	resting_heart_rate: "bpm",
	sleep: "min",
	spo2: "%",
	hrv: "ms",
	body_temperature: "C",
	respiratory_rate: "rpm",
	weight: "kg",
	blood_pressure_systolic: "mmHg",
	blood_pressure_diastolic: "mmHg",
	blood_glucose: "mg/dL",
}

// Which underlying platform SDK a provider wraps.
export type HealthPlatform = "health_connect" | "healthkit"

// A single normalized sample, ready to POST to the backend sync endpoint.
// Timestamps are ISO-8601 in UTC (backend re-buckets per user timezone).
export interface NormalizedSample {
	metricType: WearableMetricType
	value: number
	unit: string
	startTs: string
	endTs: string
	source: string
}

// Result of a permission request/inspection.
export interface PermissionResult {
	granted: boolean
	grantedMetrics: WearableMetricType[]
}

// Inclusive-exclusive time window for a single-metric read.
export interface ReadSamplesOptions {
	metric: WearableMetricType
	startTime: string
	endTime: string
}

export interface SyncResult {
	ok: boolean
	reason?: string
	connectionId?: string
	metrics: WearableMetricType[]
	samplesReceived: number
	samplesWritten: number
}

export type ConnectionState =
  | "not_connected"
  | "connecting"
  | "needs_permission"
  | "needs_companion_app"
  | "connected"
  | "syncing"
  | "stale"
  | "error";

export type Reliability = "recommended" | "direct" | "indirect";

export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface LegacyProviderApi {
  initialize(): Promise<boolean>;
  requestPermissions(metrics: WearableMetricType[]): Promise<{ granted: boolean; grantedMetrics: WearableMetricType[] }>;
  getGrantedPermissions(metrics: WearableMetricType[]): Promise<WearableMetricType[]>;
  readSamples(options: ReadSamplesOptions): Promise<NormalizedSample[]>;
}
