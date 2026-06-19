import { AUTH_ENDPOINTS } from "../constants/endpoints";
import apiClient from "./apiClient";

// Singleton storage to avoid passing non-serializable objects in React Navigation params
let activeConfirmationResult: any = null;

export const setConfirmationResult = (result: any) => {
  activeConfirmationResult = result;
};

export const getConfirmationResult = () => {
  return activeConfirmationResult;
};

export const loginWithFirebaseToken = async (
  firebaseToken: string,
  deviceToken?: string | null,
) => {
  const response = await apiClient.post("/auth/firebase-login", {
    firebaseToken,
    deviceToken,
  });
  return response?.data?.data || {};
};

export const logoutUser = async () => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGOUT, {});
  return response.data;
};

export const refreshAuthToken = async (refreshToken: string) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
    refreshToken,
  });
  return response.data;
};
