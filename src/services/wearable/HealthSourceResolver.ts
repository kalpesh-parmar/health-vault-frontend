// Metadata-based health source identification.
export interface OEMAppInfo {
  packageName: string;
  displayName: string;
  iconName: string;
  accentColor: string;
}

export const APP_MAPPING: Record<string, Omit<OEMAppInfo, "packageName">> = {
  "com.sec.android.app.shealth": {
    displayName: "Samsung Health",
    iconName: "heart-outline",
    accentColor: "#00b2a9",
  },
  "com.google.android.apps.fitness": {
    displayName: "Google Fit",
    iconName: "logo-google",
    accentColor: "#4285f4",
  },
  "com.noisefit": {
    displayName: "NoiseFit",
    iconName: "fitness-outline",
    accentColor: "#e11d48",
  },
  "com.garmin.android.apps.connect": {
    displayName: "Garmin Connect",
    iconName: "navigate-outline",
    accentColor: "#0f172a",
  },
  "com.fitbit.Fitbit": {
    displayName: "Fitbit",
    iconName: "pulse-outline",
    accentColor: "#00b0b9",
  },
  "com.withings.wiscale2": {
    displayName: "Withings",
    iconName: "water-outline",
    accentColor: "#000000",
  },
  "com.xiaomi.hm.health": {
    displayName: "Mi Fitness",
    iconName: "watch-outline",
    accentColor: "#ea580c",
  },
  "com.google.android.apps.wearable.healthservices": {
    displayName: "Google Health Services",
    iconName: "pulse",
    accentColor: "#34d399",
  },
};

class HealthSourceResolver {
  /**
   * Resolves the package name from record metadata dataOrigin.
   * Handles both string package origins and object representations { packageName }.
   */
  resolvePackageName(record: any): string {
    const origin = record?.metadata?.dataOrigin;
    if (!origin) return "unknown";
    if (typeof origin === "string") return origin || "unknown";
    return origin.packageName || "unknown";
  }

  /**
   * Returns human-readable OEM application details based on package name.
   */
  getSourceInfo(packageName: string): OEMAppInfo {
    const config = APP_MAPPING[packageName];
    if (config) {
      return {
        packageName,
        ...config,
      };
    }
    return {
      packageName,
      displayName: packageName.startsWith("com.")
        ? packageName.split(".")[1].toUpperCase()
        : packageName,
      iconName: "help-circle-outline",
      accentColor: "#64748b", // Slate fallback
    };
  }

}

export const healthSourceResolver = new HealthSourceResolver();
