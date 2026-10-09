import apiClient from "./apiClient";
import { PATIENT_ENDPOINTS } from "../constants/endpoints";
import type { UpdateUserRequest, User, ApiResponse } from "../types";
import { setAppLanguage } from "../utils/translationUtils";

export const getUser = async (): Promise<ApiResponse<User>> => {
  const response = await apiClient.get(PATIENT_ENDPOINTS.GET_USER);
  const data = response?.data;
  const userData = data?.data || data;
  const lang = userData?.preferredLanguage || userData?.preferred_language;
  if (lang) {
    setAppLanguage(lang);
  }
  return response.data;
};

export const updateUser = async (
  userId: string,
  data: UpdateUserRequest,
): Promise<ApiResponse<User>> => {
  const endpoint = PATIENT_ENDPOINTS.UPDATE_USER.replace("{id}", userId);

  const response = await apiClient.put(endpoint, data);
  const resData = response?.data;
  const userData = resData?.data || resData;
  const lang =
    userData?.preferredLanguage ||
    userData?.preferred_language ||
    (data as any)?.preferredLanguage;
  if (lang) {
    setAppLanguage(lang);
  }
  return response.data;
};

export const deleteUserAccount = async (): Promise<ApiResponse<void>> => {
  const user = await getUser();
  const userId = user?.data?.id;

  if (!userId) {
    throw new Error("User ID not found.");
  }

  const endpoint = PATIENT_ENDPOINTS.DELETE_USER.replace("{id}", userId);

  const response = await apiClient.delete(endpoint);
  return response.data;
};
