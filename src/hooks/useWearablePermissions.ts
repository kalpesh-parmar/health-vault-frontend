// Custom hook for progressive Health Connect permissions.
import { useState, useCallback, useEffect } from "react";
import {
  getGrantedPermissions,
  getSdkStatus,
  requestPermission,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { healthConnectSession } from "../services/wearable/HealthConnectSession";

export const CORE_PERMISSIONS = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "Distance" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "SleepSession" },
] as const;

export const ADVANCED_PERMISSIONS = [
  { accessType: "read", recordType: "OxygenSaturation" },
  { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
  { accessType: "read", recordType: "BodyTemperature" },
  { accessType: "read", recordType: "RespiratoryRate" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "BloodPressure" },
  { accessType: "read", recordType: "BloodGlucose" },
] as const;

export const PERMISSION_STRING_BY_RECORD_TYPE: Record<string, string> = {
  Steps: "android.permission.health.READ_STEPS",
  Distance: "android.permission.health.READ_DISTANCE",
  ActiveCaloriesBurned: "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
  HeartRate: "android.permission.health.READ_HEART_RATE",
  RestingHeartRate: "android.permission.health.READ_RESTING_HEART_RATE",
  SleepSession: "android.permission.health.READ_SLEEP",
  OxygenSaturation: "android.permission.health.READ_OXYGEN_SATURATION",
  HeartRateVariability: "android.permission.health.READ_HEART_RATE_VARIABILITY",
  HeartRateVariabilityRmssd: "android.permission.health.READ_HEART_RATE_VARIABILITY",
  BodyTemperature: "android.permission.health.READ_BODY_TEMPERATURE",
  RespiratoryRate: "android.permission.health.READ_RESPIRATORY_RATE",
  Weight: "android.permission.health.READ_WEIGHT",
  BloodPressure: "android.permission.health.READ_BLOOD_PRESSURE",
  BloodGlucose: "android.permission.health.READ_BLOOD_GLUCOSE",
};

function extractPermissionStrings(granted: any[]): string[] {
  return granted
    .filter((p: any) => p && p.accessType === "read" && p.recordType)
    .map((p: any) => PERMISSION_STRING_BY_RECORD_TYPE[p.recordType])
    .filter((s): s is string => typeof s === "string");
}

export const useWearablePermissions = () => {
  const [sdkStatus, setSdkStatus] = useState<number>(SdkAvailabilityStatus_SDK_UNAVAILABLE());
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper helper to get SdkAvailabilityStatus values
  function SdkAvailabilityStatus_SDK_UNAVAILABLE() {
    return SdkAvailabilityStatus.SDK_UNAVAILABLE ?? 3;
  }

  const checkPermissions = useCallback(async () => {
    setLoading(true);
    try {
      // Lazy initialize session check
      const sessionOk = await healthConnectSession.refreshSession();
      if (!sessionOk) {
        setSdkStatus(SdkAvailabilityStatus_SDK_UNAVAILABLE());
        setLoading(false);
        return;
      }

      const status = await getSdkStatus();
      setSdkStatus(status);

      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        const granted = await getGrantedPermissions();
        setGrantedPermissions(extractPermissionStrings(granted));
      }
    } catch (e) {
      console.error("[useWearablePermissions] Check failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(
    async (typeOrRecordTypes: "core" | "advanced" | "all" | string[]): Promise<boolean> => {
      try {
        const sessionOk = await healthConnectSession.refreshSession();
        if (!sessionOk) return false;

        let targetPermissions: any[] = [];
        if (Array.isArray(typeOrRecordTypes)) {
          targetPermissions = typeOrRecordTypes.map((recType) => ({
            accessType: "read",
            recordType: recType,
          }));
        } else if (typeOrRecordTypes === "core") {
          targetPermissions = [...CORE_PERMISSIONS];
        } else if (typeOrRecordTypes === "advanced") {
          targetPermissions = [...ADVANCED_PERMISSIONS];
        } else {
          targetPermissions = [...CORE_PERMISSIONS, ...ADVANCED_PERMISSIONS];
        }

        console.log(`[useWearablePermissions] Requesting permissions:`, targetPermissions);
        const response = await requestPermission(targetPermissions);
        
        // Refresh permissions state
        const granted = await getGrantedPermissions();
        setGrantedPermissions(extractPermissionStrings(granted));
        
        return response.length > 0;
      } catch (e) {
        console.error("[useWearablePermissions] Request failed:", e);
        return false;
      }
    },
    []
  );

  const openSettings = useCallback(async () => {
    try {
      console.log("[useWearablePermissions] Deep linking to Health Connect settings...");
      await openHealthConnectSettings();
    } catch (e) {
      console.error("[useWearablePermissions] Failed to open settings:", e);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const hasCorePermissions = CORE_PERMISSIONS.every((p) =>
    grantedPermissions.includes(PERMISSION_STRING_BY_RECORD_TYPE[p.recordType])
  );

  return {
    sdkStatus,
    grantedPermissions,
    loading,
    checkPermissions,
    requestPermissions,
    openSettings,
    hasCorePermissions,
    isAvailable: sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE,
  };
};
