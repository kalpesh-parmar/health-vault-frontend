import axios from "axios";
import * as SecureStore from "expo-secure-store";

let onServerErrorCallback: (() => void) | null = null;

export const setServerErrorCallback = (callback: () => void) => {
  onServerErrorCallback = callback;
};

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status && (status >= 500 || status === 401)) {
      if (onServerErrorCallback) {
        onServerErrorCallback();
      }
    }

    const data = error.response?.data;

    const message =
      data?.status?.description?.message ||
      data?.status?.description ||
      data?.message ||
      error.message ||
      "An unexpected error occurred";

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
