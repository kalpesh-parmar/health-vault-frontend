import apiClient from "./apiClient";
import { PATIENT_ENDPOINTS } from "../constants/endpoints";
import type { UpdateUserRequest, User, ApiResponse } from "../types";

export const getUser = async (): Promise<ApiResponse<User>> => {
  const response = await apiClient.get(PATIENT_ENDPOINTS.GET_USER);
  console.log("User Data:", response.data);
  return response.data;
};

export const updateUser = async (
  userId: string,
  data: UpdateUserRequest,
): Promise<ApiResponse<User>> => {
  const endpoint = PATIENT_ENDPOINTS.UPDATE_USER.replace("{id}", userId);

  const formData = new FormData();

  if (data?.profilePicture) {
    formData.append("profilePicture", {
      uri: data.profilePicture.uri,
      name: data.profilePicture.name,
      type: data.profilePicture.type,
    } as any);
  }
  formData.append("userName", data?.userName!);
  formData.append("firstName", data?.firstName!);
  formData.append("lastName", data?.lastName!);

  const response = await apiClient.put(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
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
