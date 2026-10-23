export interface DailyBreakdownItem {
  date: string;
  dayLabel: string;
  isToday: boolean;
  completedEarly: number;
  completedOnTime: number;
  completedLate: number;
  completedUnknown: number;
  overdue: number;
  missed: number;
  pending: number;
  skipped: number;
  total: number;
}

export interface WeeklyKpiSummary {
  totalScheduled: number;
  completedEarly: number;
  completedOnTime: number;
  completedLate: number;
  completedUnknown: number;
  totalCompleted: number;
  overdue: number;
  missed: number;
  pending: number;
  skipped: number;
  adherencePercentage: number | null;
  hasData: boolean;
}

export interface WeeklyAdherenceResponse {
  dateRange: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  kpiSummary: WeeklyKpiSummary;
  dailyBreakdown: DailyBreakdownItem[];
}

export interface MonthlyAdherenceMetrics {
  totalScheduled?: number;
  eligibleScheduledDoses: number;
  completedEarly: number;
  completedOnTime: number;
  completedLate: number;
  completedUnknown: number;
  totalCompleted: number;
  overdue: number;
  missed: number;
  totalOverdueAndMissed: number;
  pending: number;
  skipped: number;
}

export interface MonthlyAdherencePercentages {
  hasData: boolean;
  overallAdherence: number | null;
  earlyAdherence: number | null;
  onTimeAdherence: number | null;
  lateCompletion: number | null;
  unknownCompletion: number | null;
  overdueAndMissed: number | null;
  pending: number;
  skipped: number;
  completedDistribution?: number;
  pendingDistribution?: number;
  overdueDistribution?: number;
  skippedDistribution?: number;
}

export interface MonthlySegmentedRatios {
  overdueRatio: number;
  completedRatio: number;
  pendingRatio: number;
  skippedRatio: number;
}

export interface MonthlyAdherenceResponse {
  month: number;
  year: number;
  monthLabel: string;
  timezone: string;
  metrics: MonthlyAdherenceMetrics;
  percentages: MonthlyAdherencePercentages;
  segmentedRatios: MonthlySegmentedRatios;
}

export interface DailyDoseDetail {
  occurrenceId: string;
  medicationId: string;
  medicationName: string;
  medicationType: string;
  dosePerIntake: number;
  unit: string;
  scheduledTime: string;
  scheduledTimeFormatted: string | null;
  completedAt: string | null;
  completedAtFormatted: string | null;
  delayMinutes: number | null;
  delayFormatted: string | null;
  status: "COMPLETED" | "PENDING" | "SKIPPED" | "CANCELLED" | string;
  completionClassification: "EARLY" | "ON_TIME" | "LATE" | "UNKNOWN" | null;
  retrospectivelyDerived: boolean;
  isOverdue: boolean;
  skipReason: string | null;
  actionable: boolean;
}

export interface DailyDetailsResponse {
  date: string;
  timezone: string;
  totalOccurrences: number;
  doses: DailyDoseDetail[];
}

export interface RefillAlertMedication {
  medicationId: string;
  medicationName: string;
  medicationType: string;
  totalQuantity: number;
  remainingQuantity: number;
  dailyConsumption: number | null;
  dosePerIntake: number;
  unit: string;
  daysRemaining: number | null;
  estimatedRefillDate: string | null;
  urgency: "OUT_OF_STOCK" | "LOW_STOCK" | "DUE_SOON" | "HEALTHY";
  stockPercentage: number;
  hasRefillHistory: boolean;
}

export interface RefillAlertsResponse {
  hasRefillAlerts: boolean;
  totalAlertsCount: number;
  medications: RefillAlertMedication[];
}

export interface WeeklyAdherenceQuery {
  timezone?: string;
  startDate?: string;
  endDate?: string;
}

export interface MonthlyAdherenceQuery {
  month?: number;
  year?: number;
  timezone?: string;
}

export interface DailyDetailsQuery {
  date: string;
  timezone?: string;
}

export interface RefillsQuery {
  timezone?: string;
}
