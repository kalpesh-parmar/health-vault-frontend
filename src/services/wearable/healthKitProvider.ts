// iOS HealthKit provider — stub only. Filled in after iOS prebuild + an Apple
// Developer account (deferred). It reports unavailable so the rest of the app
// degrades gracefully on iOS / unsupported platforms.

import type {
  LegacyProviderApi,
  NormalizedSample,
  PermissionResult,
  WearableMetricType,
} from "./types";

export const healthKitProvider: LegacyProviderApi & { isAvailable(): Promise<boolean>; platform: string } = {
  platform: "healthkit",

  async isAvailable(): Promise<boolean> {
    return false;
  },

  async initialize(): Promise<boolean> {
    return false;
  },

  async requestPermissions(
    _metrics: WearableMetricType[]
  ): Promise<PermissionResult> {
    return { granted: false, grantedMetrics: [] };
  },

  async getGrantedPermissions(
    _metrics: WearableMetricType[]
  ): Promise<WearableMetricType[]> {
    return [];
  },

  async readSamples(
    _options: { metric: WearableMetricType; startTime: string; endTime: string }
  ): Promise<NormalizedSample[]> {
    return [];
  },
};
