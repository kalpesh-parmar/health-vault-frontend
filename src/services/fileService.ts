import apiClient, { getValidAccessToken } from "./apiClient";
import { FILE_ENDPOINTS } from "../constants/endpoints";
import type { ApiResponse } from "../types";
import { BASE_URL } from "../config/api";

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

  const response = await apiClient.post(FILE_ENDPOINTS.UPLOAD, formData);

  return response.data;
};

export const getFileSource = async (
  fileKey: string
): Promise<{ uri: string; headers?: Record<string, string> } | null> => {
  if (!fileKey || typeof fileKey !== "string") return null;
  const trimmed = fileKey.trim();
  if (!trimmed || trimmed === "[object Object]") return null;

  // Handle existing full URLs or local device URIs safely
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("ph://")
  ) {
    // Forward auth headers ONLY if calling our own backend BASE_URL
    if (trimmed.startsWith(BASE_URL)) {
      const token = await getValidAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (BASE_URL.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "true";
      return { uri: trimmed, headers };
    }
    // External pre-signed S3 or local URI: do NOT send bearer tokens
    return { uri: trimmed };
  }

  const token = await getValidAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (BASE_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  return {
    uri: `${BASE_URL}${FILE_ENDPOINTS.GET_SIGNED_URL}?fileKey=${encodeURIComponent(trimmed)}`,
    headers,
  };
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
