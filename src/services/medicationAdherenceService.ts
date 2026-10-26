import apiClient from "./apiClient";
import { MEDICATION_REMINDER_ENDPOINTS } from "../constants/endpoints";
import {
  WeeklyAdherenceResponse,
  WeeklyAdherenceQuery,
  MonthlyAdherenceResponse,
  MonthlyAdherenceQuery,
  DailyDetailsResponse,
  DailyDetailsQuery,
  RefillAlertsResponse,
  RefillsQuery,
} from "../types/adherence";

function cleanParams<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

export const getWeeklyAdherence = async (
  query: WeeklyAdherenceQuery = {},
): Promise<WeeklyAdherenceResponse> => {
  const params = cleanParams({
    timezone: query.timezone,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  const response = await apiClient.get(
    MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_WEEKLY,
    { params },
  );
  return response.data?.data ?? response.data;
};

export const getMonthlyAdherence = async (
  query: MonthlyAdherenceQuery = {},
): Promise<MonthlyAdherenceResponse> => {
  const params = cleanParams({
    month: query.month,
    year: query.year,
    timezone: query.timezone,
  });

  const response = await apiClient.get(
    MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_MONTHLY,
    { params },
  );
  return response.data?.data ?? response.data;
};

export const getDailyDetails = async (
  query: DailyDetailsQuery,
): Promise<DailyDetailsResponse> => {
  const params = cleanParams({
    date: query.date,
    timezone: query.timezone,
  });

  const response = await apiClient.get(
    MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_DAILY_DETAILS,
    { params },
  );
  return response.data?.data ?? response.data;
};

export const getRefillAlerts = async (
  query: RefillsQuery = {},
): Promise<RefillAlertsResponse> => {
  const params = cleanParams({
    timezone: query.timezone,
  });

  const response = await apiClient.get(
    MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_REFILLS,
    { params },
  );
  return response.data?.data ?? response.data;
};
