import axios from "axios";
import * as SecureStore from "expo-secure-store";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "Bypass-Tunnel-Reminder": "true"
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
    console.log("\n========== API ERROR ==========");
    console.log("URL      :", error.config?.url || error.request?._url);
    console.log("METHOD   :", error.config?.method?.toUpperCase());
    console.log("MESSAGE  :", error.message);
    console.log("RESPONSE DATA:", error.response?.data || "No response data");
    console.log("STATUS   :", error.response?.status || "No status");
    console.log("===============================\n");

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