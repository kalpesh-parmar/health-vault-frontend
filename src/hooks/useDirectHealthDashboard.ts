import { useState, useRef, useCallback, useEffect } from 'react';
import {
  initialize,
  getSdkStatus,
  getGrantedPermissions,
  requestPermission,
  readRecords,
  aggregateRecord,
  SdkAvailabilityStatus,
  Permission,
  RecordType,
} from 'react-native-health-connect';
import type { WearableMetricType } from '../services/wearable/types';

export type MetricCardStatus = 'success' | 'no_data' | 'denied' | 'error';

export interface MetricCardData {
  status: MetricCardStatus;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  latest?: number;
  unit?: string;
  has30dData?: boolean;
}

export type DirectDashboardData = Record<WearableMetricType, MetricCardData>;

const ALL_DASHBOARD_METRICS: WearableMetricType[] = [
  'steps',
  'distance',
  'active_energy',
  'sleep',
  'heart_rate',
  'resting_heart_rate',
  'spo2',
  'hrv',
  'respiratory_rate',
  'body_temperature',
  'weight',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'blood_glucose',
];

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
  { accessType: 'read', recordType: 'BodyTemperature' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BloodPressure' },
  { accessType: 'read', recordType: 'BloodGlucose' },
];

function createDefaultData(status: MetricCardStatus = 'no_data'): DirectDashboardData {
  return ALL_DASHBOARD_METRICS.reduce<DirectDashboardData>((acc, metric) => {
    acc[metric] = { status };
    return acc;
  }, {} as DirectDashboardData);
}

function getLocalTodayWindows() {
  const now = new Date();
  // Device Local Start of Day (00:00:00.000 local time)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  // Device Local Yesterday 18:00 (18:00:00.000 local time)
  const yesterday18 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0, 0, 0);
  // 30 Days Ago for Wide Probe Window
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const windows = {
    todayWindow: {
      operator: 'between' as const,
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    },
    sleepWindow: {
      operator: 'between' as const,
      startTime: yesterday18.toISOString(),
      endTime: now.toISOString(),
    },
    probeWindow: {
      operator: 'between' as const,
      startTime: thirtyDaysAgo.toISOString(),
      endTime: now.toISOString(),
    },
    todayStartMs: startOfDay.getTime(),
    todayEndMs: now.getTime(),
  };

  console.log('[DirectDashboard] Local Windows (ISO):', {
    localTime: now.toString(),
    todayStartISO: windows.todayWindow.startTime,
    todayEndISO: windows.todayWindow.endTime,
    sleepStartISO: windows.sleepWindow.startTime,
  });

  return windows;
}

function computeStats(values: number[]): { avg: number; min: number; max: number; latest: number } | null {
  if (!values || values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1]; // last element assuming chronological order
  return { avg, min, max, latest };
}

// Helper to merge overlapping sleep interval ranges to avoid overcounting multiple sources
function mergeIntervals(intervals: Array<{ startMs: number; endMs: number }>): Array<{ startMs: number; endMs: number }> {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const merged: Array<{ startMs: number; endMs: number }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, current.endMs);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export function useDirectHealthDashboard() {
  const [data, setData] = useState<DirectDashboardData>(createDefaultData('no_data'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isRefreshingRef = useRef<boolean>(false);

  const fetchDashboardData = useCallback(async (isInitial = false) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    setError(null);

    try {
      // Step 1: SDK Initialization
      let isInitialized = false;
      try {
        isInitialized = await initialize();
      } catch (err: any) {
        setError(`Health Connect initialization failed: ${err?.message || 'Unknown error'}`);
        setData(createDefaultData('error'));
        return;
      }

      if (!isInitialized) {
        setError('Health Connect failed to initialize.');
        setData(createDefaultData('error'));
        return;
      }

      // Step 2: Check SDK Status
      const status = await getSdkStatus();
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
          setError('Health Connect update required.');
        } else {
          setError('Health Connect SDK is unavailable on this device.');
        }
        setData(createDefaultData('error'));
        return;
      }

      // Step 3: Permissions Audit
      let grantedPerms = await getGrantedPermissions();
      console.log('[DirectDashboard] Runtime Granted Permissions Count:', grantedPerms.length);
      console.log('[DirectDashboard] Granted Permissions List:', JSON.stringify(grantedPerms));

      const missingPermissions = REQUIRED_PERMISSIONS.filter(
        (req) =>
          !grantedPerms.some(
            (g) => g.accessType === req.accessType && g.recordType === req.recordType
          )
      );

      if (missingPermissions.length > 0) {
        console.log('[DirectDashboard] Missing Permissions:', JSON.stringify(missingPermissions));
        try {
          await requestPermission(missingPermissions);
          grantedPerms = await getGrantedPermissions();
        } catch (e) {
          console.warn('[DirectDashboard] Permission request failed or dismissed:', e);
        }
      }

      const isGranted = (recordType: RecordType): boolean => {
        return grantedPerms.some(
          (g) => g.accessType === 'read' && g.recordType === recordType
        );
      };

      const { todayWindow, sleepWindow, probeWindow, todayStartMs, todayEndMs } = getLocalTodayWindows();
      const resultData: DirectDashboardData = createDefaultData('no_data');

      // 30-Day Wide Window Probe Helper (Gated behind __DEV__)
      const check30DayProbe = async (recordType: RecordType): Promise<boolean> => {
        if (!__DEV__ || !isGranted(recordType)) return false;
        try {
          const res = await readRecords(recordType, {
            timeRangeFilter: probeWindow,
            pageSize: 1,
          });
          return (res?.records?.length ?? 0) > 0;
        } catch {
          return false;
        }
      };

      // Metric Task 1: Steps (aggregateRecord)
      const fetchSteps = async (): Promise<MetricCardData> => {
        if (!isGranted('Steps')) return { status: 'denied' };
        try {
          const res = await aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: todayWindow,
          });
          const total = res?.COUNT_TOTAL;
          const has30d = await check30DayProbe('Steps');
          if (typeof total === 'number' && total > 0) {
            return { status: 'success', sum: total, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying Steps:', err);
          return { status: 'error' };
        }
      };

      // Metric Task 2: Distance (aggregateRecord)
      const fetchDistance = async (): Promise<MetricCardData> => {
        if (!isGranted('Distance')) return { status: 'denied' };
        try {
          const res = await aggregateRecord({
            recordType: 'Distance',
            timeRangeFilter: todayWindow,
          });
          console.log(`[KP] ==> res: ${JSON.stringify(res)}`);
          const distanceObj = (res as any)?.DISTANCE;
          const meters =
            typeof distanceObj === 'object' && distanceObj !== null
              ? distanceObj.inMeters ?? (distanceObj.inKilometers ? distanceObj.inKilometers * 1000 : undefined)
              : Number(distanceObj);

          const has30d = await check30DayProbe('Distance');
          if (typeof meters === 'number' && meters > 0) {
            return { status: 'success', sum: meters, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying Distance:', err);
          return { status: 'error' };
        }
      };

      // Metric Task 3: Active Calories (aggregateRecord)
      const fetchActiveEnergy = async (): Promise<MetricCardData> => {
        if (!isGranted('ActiveCaloriesBurned')) return { status: 'denied' };
        try {
          const res = await aggregateRecord({
            recordType: 'ActiveCaloriesBurned',
            timeRangeFilter: todayWindow,
          });
          const energyObj = (res as any)?.ACTIVE_CALORIES_TOTAL;
          const kcal =
            typeof energyObj === 'object' && energyObj !== null
              ? energyObj.inKilocalories ?? energyObj.value
              : Number(energyObj);

          const has30d = await check30DayProbe('ActiveCaloriesBurned');
          if (typeof kcal === 'number' && kcal > 0) {
            return { status: 'success', sum: kcal, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying Active Energy:', err);
          return { status: 'error' };
        }
      };

      // Metric Task 4: Sleep Session (readRecords 18:00 yesterday -> now with overlap merging)
      const fetchSleep = async (): Promise<MetricCardData> => {
        if (!isGranted('SleepSession')) return { status: 'denied' };
        try {
          const res = await readRecords('SleepSession', {
            timeRangeFilter: sleepWindow,
            pageSize: 100,
          });
          const recordsList = res?.records ?? [];
          const has30d = await check30DayProbe('SleepSession');
          if (recordsList.length === 0) return { status: 'no_data', has30dData: has30d };

          const validIntervals: Array<{ startMs: number; endMs: number }> = [];

          for (const session of recordsList) {
            if (session.stages && session.stages.length > 0) {
              for (const stage of session.stages) {
                const stageType = (stage as any).stage;
                const stageName = String(stageType).toUpperCase();
                if (stageName.includes('AWAKE')) continue;

                const startMs = new Date(stage.startTime).getTime();
                const endMs = new Date(stage.endTime).getTime();
                if (endMs > startMs) {
                  validIntervals.push({ startMs, endMs });
                }
              }
            } else {
              const startMs = new Date(session.startTime).getTime();
              const endMs = new Date(session.endTime).getTime();
              if (endMs > startMs) {
                validIntervals.push({ startMs, endMs });
              }
            }
          }

          const merged = mergeIntervals(validIntervals);
          const totalMs = merged.reduce((acc, inv) => acc + (inv.endMs - inv.startMs), 0);
          const totalMinutes = totalMs / (1000 * 60);

          if (totalMinutes > 0) {
            return { status: 'success', sum: totalMinutes, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying Sleep:', err);
          return { status: 'error' };
        }
      };

      // Metric Task 5: Heart Rate Series
      const fetchHeartRate = async (): Promise<MetricCardData> => {
        if (!isGranted('HeartRate')) return { status: 'denied' };
        try {
          const res = await readRecords('HeartRate', {
            timeRangeFilter: todayWindow,
            pageSize: 500,
          });
          const recordsList = res?.records ?? [];
          const has30d = await check30DayProbe('HeartRate');
          const validBpms: number[] = [];

          for (const record of recordsList) {
            if (record.samples && record.samples.length > 0) {
              const sortedSamples = [...record.samples].sort(
                (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
              );
              for (const sample of sortedSamples) {
                const sampleTimeMs = new Date(sample.time).getTime();
                if (sampleTimeMs >= todayStartMs && sampleTimeMs <= todayEndMs) {
                  if (typeof sample.beatsPerMinute === 'number' && sample.beatsPerMinute > 0) {
                    validBpms.push(sample.beatsPerMinute);
                  }
                }
              }
            }
          }

          const stats = computeStats(validBpms);
          if (stats) {
            return { status: 'success', ...stats, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying HeartRate:', err);
          return { status: 'error' };
        }
      };

      // Metric Task 6: Blood Pressure (Single Read -> Systolic & Diastolic)
      const fetchBloodPressure = async (): Promise<{
        systolic: MetricCardData;
        diastolic: MetricCardData;
      }> => {
        if (!isGranted('BloodPressure')) {
          return { systolic: { status: 'denied' }, diastolic: { status: 'denied' } };
        }
        try {
          const res = await readRecords('BloodPressure', {
            timeRangeFilter: todayWindow,
            pageSize: 500,
          });
          const recordsList = res?.records ?? [];
          const has30d = await check30DayProbe('BloodPressure');
          const sysValues: number[] = [];
          const diaValues: number[] = [];

          // Sort chronologically
          const sorted = [...recordsList].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          );

          for (const record of sorted) {
            const timeMs = new Date(record.time).getTime();
            if (timeMs >= todayStartMs && timeMs <= todayEndMs) {
              const rawSys = (record as any).systolic;
              const rawDia = (record as any).diastolic;

              const sys =
                typeof rawSys === 'object' && rawSys !== null
                  ? rawSys.inMillimetersOfMercury ?? rawSys.value
                  : Number(rawSys);
              const dia =
                typeof rawDia === 'object' && rawDia !== null
                  ? rawDia.inMillimetersOfMercury ?? rawDia.value
                  : Number(rawDia);

              if (typeof sys === 'number' && sys > 0) sysValues.push(sys);
              if (typeof dia === 'number' && dia > 0) diaValues.push(dia);
            }
          }

          const sysStats = computeStats(sysValues);
          const diaStats = computeStats(diaValues);

          return {
            systolic: sysStats ? { status: 'success', ...sysStats, has30dData: has30d } : { status: 'no_data', has30dData: has30d },
            diastolic: diaStats ? { status: 'success', ...diaStats, has30dData: has30d } : { status: 'no_data', has30dData: has30d },
          };
        } catch (err) {
          console.warn('[DirectDashboard] Error querying BloodPressure:', err);
          return { systolic: { status: 'error' }, diastolic: { status: 'error' } };
        }
      };

      // Helper for generic Instantaneous & Vitals Records
      const fetchGenericRateMetric = async <T extends RecordType>(
        recordType: T,
        extractValue: (record: any) => number | null
      ): Promise<MetricCardData> => {
        if (!isGranted(recordType)) return { status: 'denied' };
        try {
          const res = await readRecords(recordType, {
            timeRangeFilter: todayWindow,
            pageSize: 500,
          });
          const recordsList = res?.records ?? [];
          const has30d = await check30DayProbe(recordType);
          const values: number[] = [];

          // Sort chronologically
          const sorted = [...recordsList].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          );

          for (const record of sorted) {
            const timeMs = new Date(record.time).getTime();
            if (timeMs >= todayStartMs && timeMs <= todayEndMs) {
              const val = extractValue(record);
              if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
                values.push(val);
              }
            }
          }

          const stats = computeStats(values);
          if (stats) {
            return { status: 'success', ...stats, has30dData: has30d };
          }
          return { status: 'no_data', has30dData: has30d };
        } catch (err) {
          console.warn(`[DirectDashboard] Error querying ${recordType}:`, err);
          return { status: 'error' };
        }
      };

      // Dispatch All Tasks in Parallel
      const [
        stepsRes,
        distRes,
        energyRes,
        sleepRes,
        hrRes,
        rhrRes,
        spo2Res,
        hrvRes,
        respRes,
        tempRes,
        weightRes,
        glucoseRes,
        bpRes,
      ] = await Promise.allSettled([
        fetchSteps(),
        fetchDistance(),
        fetchActiveEnergy(),
        fetchSleep(),
        fetchHeartRate(),
        fetchGenericRateMetric('RestingHeartRate', (r) => Number(r.beatsPerMinute)),
        fetchGenericRateMetric('OxygenSaturation', (r) => Number(r.percentage)),
        fetchGenericRateMetric('HeartRateVariabilityRmssd', (r) => Number(r.heartRateVariabilityMillis)),
        fetchGenericRateMetric('RespiratoryRate', (r) => Number(r.rate)),
        fetchGenericRateMetric('BodyTemperature', (r) => {
          const t = r.temperature;
          return typeof t === 'object' && t !== null ? t.inCelsius ?? t.value : Number(t);
        }),
        fetchGenericRateMetric('Weight', (r) => {
          const w = r.weight;
          return typeof w === 'object' && w !== null ? w.inKilograms ?? w.value : Number(w);
        }),
        fetchGenericRateMetric('BloodGlucose', (r) => {
          const g = r.level;
          return typeof g === 'object' && g !== null ? g.inMilligramsPerDeciliter ?? g.value : Number(g);
        }),
        fetchBloodPressure(),
      ]);

      const getVal = <T>(res: PromiseSettledResult<T>, fallback: T): T =>
        res.status === 'fulfilled' ? res.value : fallback;

      resultData.steps = getVal(stepsRes, { status: 'error' });
      resultData.distance = getVal(distRes, { status: 'error' });
      resultData.active_energy = getVal(energyRes, { status: 'error' });
      resultData.sleep = getVal(sleepRes, { status: 'error' });
      resultData.heart_rate = getVal(hrRes, { status: 'error' });
      resultData.resting_heart_rate = getVal(rhrRes, { status: 'error' });
      resultData.spo2 = getVal(spo2Res, { status: 'error' });
      resultData.hrv = getVal(hrvRes, { status: 'error' });
      resultData.respiratory_rate = getVal(respRes, { status: 'error' });
      resultData.body_temperature = getVal(tempRes, { status: 'error' });
      resultData.weight = getVal(weightRes, { status: 'error' });
      resultData.blood_glucose = getVal(glucoseRes, { status: 'error' });

      const bpObj = getVal(bpRes, {
        systolic: { status: 'error' },
        diastolic: { status: 'error' },
      });
      resultData.blood_pressure_systolic = bpObj.systolic;
      resultData.blood_pressure_diastolic = bpObj.diastolic;

      if (__DEV__) {
        console.log('[DirectDashboard] Audit Summary:', {
          steps: resultData.steps.status,
          sleep: resultData.sleep.status,
          hrv: resultData.hrv.status,
          resp: resultData.respiratory_rate.status,
          temp: resultData.body_temperature.status,
          glucose: resultData.blood_glucose.status,
        });
      }

      setData(resultData);
    } catch (err: any) {
      console.error('[DirectDashboard] Unexpected error:', err);
      setError(`Failed to load health metrics: ${err?.message || 'Unknown error'}`);
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const refetch = useCallback(() => {
    return fetchDashboardData(false);
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  };
}
