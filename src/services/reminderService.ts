import apiClient from "./apiClient";
import { MEDICATION_REMINDER_ENDPOINTS } from "../constants/endpoints";
import { CreateMedicationReminderRequest, ListRemindersRequest } from "../types";

export const createMedicationReminder = async (data: CreateMedicationReminderRequest) => {
  const response = await apiClient.post(MEDICATION_REMINDER_ENDPOINTS.CREATE_MEDICATION_REMINDER, data);
  return response.data;
};

export const listMainReminders = async () => {
  const response = await apiClient.get(MEDICATION_REMINDER_ENDPOINTS.GET_ALL_MAIN_REMINDERS_OCCURENCES);
  return response.data;
};

export const filterAndSortReminders = async (payload: ListRemindersRequest) => {
  const response = await apiClient.post(MEDICATION_REMINDER_ENDPOINTS.FILTER_AND_SORT_OCCURRENCES, payload);
  return response.data;
};

export const listSubReminders = async () => {
  const response = await apiClient.get(MEDICATION_REMINDER_ENDPOINTS.GET_ALL_SUB_REMINDERS_OCCURRENCES);
  return response.data;
};

export const listTodayOccurrences = async () => {
  const response = await apiClient.get(MEDICATION_REMINDER_ENDPOINTS.LIST_TODAY_OCCURRENCES);
  return response.data;
};

export const updateReminderOccurrenceStatus = async ({
  occurrenceId,
  status,
}: {
  occurrenceId: string;
  status: string;
}) => {
  const endpoint = MEDICATION_REMINDER_ENDPOINTS.UPDATE_REMINDER_OCCURRENCE_STATUS.replace("{id}", occurrenceId);
  const response = await apiClient.patch(endpoint, {status});
  return response.data;
};

export const listTodayOccurrencesCount = async (payload: { startDate: string; endDate: string }) => {
  const response = await apiClient.post(MEDICATION_REMINDER_ENDPOINTS.LIST_TODAY_OCCURENCES_COUNT, payload);
  return response.data;
};
