import apiClient from "./apiClient";
import { PATIENT_ENDPOINTS } from "../constants/endpoints";
import * as SecureStore from "expo-secure-store";
import type { UpdateUserRequest } from "../types";

export const getUser = async () => {
  const response = await apiClient.get(PATIENT_ENDPOINTS.GET_USER);
  return response.data;
};

export const updateUser = async (userId: string, data: UpdateUserRequest) => {
  const endpoint = PATIENT_ENDPOINTS.UPDATE_USER.replace("{id}", userId);

  const response = await apiClient.put(endpoint, {
    userName: data?.userName,
    firstName: data?.firstName,
    lastName: data?.lastName,
  });
  return response.data;
};

export const deleteUserAccount = async () => {
  const userId = await SecureStore.getItemAsync("userId");

  if (!userId) {
    throw new Error("User ID not found in secure storage.");
  }

  const endpoint = PATIENT_ENDPOINTS.DELETE_USER.replace("{id}", userId);

  const response = await apiClient.delete(endpoint);
  return response.data;
};
