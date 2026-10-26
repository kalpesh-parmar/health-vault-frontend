import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getWeeklyAdherence,
  getMonthlyAdherence,
  getDailyDetails,
  getRefillAlerts,
} from "../services/medicationAdherenceService";
import {
  WeeklyAdherenceQuery,
  MonthlyAdherenceQuery,
  DailyDetailsQuery,
  RefillsQuery,
} from "../types/adherence";

export const ADHERENCE_QUERY_KEYS = {
  WEEKLY: "adherenceDashboardWeekly",
  MONTHLY: "adherenceDashboardMonthly",
  DAILY: "adherenceDashboardDaily",
  REFILLS: "adherenceDashboardRefills",
} as const;

export function useWeeklyAdherence(
  query: WeeklyAdherenceQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [ADHERENCE_QUERY_KEYS.WEEKLY, query.timezone, query.startDate, query.endDate],
    queryFn: () => getWeeklyAdherence(query),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useMonthlyAdherence(
  query: MonthlyAdherenceQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [ADHERENCE_QUERY_KEYS.MONTHLY, query.month, query.year, query.timezone],
    queryFn: () => getMonthlyAdherence(query),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useDailyDetails(
  query: DailyDetailsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [ADHERENCE_QUERY_KEYS.DAILY, query.date, query.timezone],
    queryFn: () => getDailyDetails(query),
    staleTime: 30 * 1000,
    enabled: (options?.enabled ?? true) && Boolean(query.date),
  });
}

export function useRefillAlerts(
  query: RefillsQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [ADHERENCE_QUERY_KEYS.REFILLS, query.timezone],
    queryFn: () => getRefillAlerts(query),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useInvalidateAdherenceDashboard() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ADHERENCE_QUERY_KEYS.WEEKLY] }),
      queryClient.invalidateQueries({ queryKey: [ADHERENCE_QUERY_KEYS.MONTHLY] }),
      queryClient.invalidateQueries({ queryKey: [ADHERENCE_QUERY_KEYS.DAILY] }),
      queryClient.invalidateQueries({ queryKey: [ADHERENCE_QUERY_KEYS.REFILLS] }),
      queryClient.invalidateQueries({ queryKey: ["allReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] }),
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["todayOccurrencesCount"] }),
    ]);
  }, [queryClient]);

  return { invalidateAll };
}
