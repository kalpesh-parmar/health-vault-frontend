import axios from "axios";
import * as SecureStore from "expo-secure-store";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_LIVE_API_URL,
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

    console.log("\n========== API REQUEST ==========");
    console.log("ENDPOINT :", `${config.url}`);
    console.log("METHOD   :", config.method?.toUpperCase());
    console.log("TOKEN    :", token);
    console.log("BODY     :", config.data);
    console.log("=================================\n");

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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