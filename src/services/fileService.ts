import apiClient from "./apiClient";
import { FILE_ENDPOINTS } from "../constants/endpoints";
import type { ApiResponse } from "../types";

export const uploadFileToS3 = async (
  uri: string,
  uploadType: "PATIENT_DOCUMENT" | "PATIENT_PROFILE"
): Promise<ApiResponse<any>> => {
  const formData = new FormData();
  
  const file = uri.split("/").pop();
  const extension = file?.split(".").pop() || "jpg";

  formData.append("file", {
    uri,
    name: file || `upload.${extension}`,
    type: extension === "pdf" ? "application/pdf" : `image/${extension}`,
  } as any);

  formData.append("uploadType", uploadType);

  const response = await apiClient.post(FILE_ENDPOINTS.UPLOAD, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  
  return response.data;
};

export const getSignedUrlForFile = async (
  fileKey: string
): Promise<ApiResponse<string>> => {
  const response = await apiClient.get(FILE_ENDPOINTS.GET_SIGNED_URL, {
    params: {
      fileKey,
    },
  });
  return response.data;
};

export const deleteFileFromS3 = async (
  fileKey: string
): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.delete(FILE_ENDPOINTS.HARD_DELETE, {
    data: {
      fileKey,
    },
  });
  return response.data;
};
