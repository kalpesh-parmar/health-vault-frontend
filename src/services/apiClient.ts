import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { BASE_URL, API_TIMEOUT, ENABLE_API_LOGS } from "../config/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "Bypass-Tunnel-Reminder": "true"
  },
});

// Sensitive keys to mask
const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "token",
  "apikey",
  "aiapikey",
  "client_secret",
  "otp",
  "accesstoken",
  "refreshtoken",
  "secret",
]);

function shouldMask(): boolean {
  const isDev = (typeof __DEV__ !== "undefined" && __DEV__) || process.env.NODE_ENV === "development";
  return !isDev;
}

function maskSensitiveData(data: any): any {
  if (!data) return data;

  // If in local development, clone structure but do not mask values
  if (!shouldMask()) {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return JSON.stringify(maskSensitiveData(parsed));
        }
      } catch {
        // not JSON
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(maskSensitiveData);
    }

    if (typeof data === "object") {
      if (data.constructor && data.constructor.name === "FormData") {
        return data;
      }
      const clone: any = {};
      for (const key of Object.keys(data)) {
        clone[key] = maskSensitiveData(data[key]);
      }
      return clone;
    }

    return data;
  }

  // Production masking flow
  if (typeof data === "string") {
    if (data.toLowerCase().startsWith("bearer ")) {
      return "Bearer ***";
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        return JSON.stringify(maskSensitiveData(parsed));
      }
    } catch {
      // not JSON
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (typeof data === "object") {
    if (data.constructor && data.constructor.name === "FormData") {
      return data;
    }
    const masked: any = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        const val = data[key];
        if (typeof val === "string" && val.toLowerCase().startsWith("bearer ")) {
          masked[key] = "Bearer ***";
        } else {
          masked[key] = "***";
        }
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    }
    return masked;
  }

  return data;
}

function truncatePayload(payload: any, maxLength = 1000): any {
  if (!payload) return payload;

  if (typeof payload === "string") {
    if (payload.length > maxLength) {
      return payload.slice(0, maxLength) + `... [TRUNCATED - Total length: ${payload.length}]`;
    }
    return payload;
  }

  try {
    const str = JSON.stringify(payload);
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + `... [TRUNCATED - Total length: ${str.length}]`;
    }
    return payload;
  } catch {
    return "[Unserializable Payload]";
  }
}

/**
 * Resolves a full URL safely without double prepending the base URL or introducing duplicate slashes.
 */
function resolveFullUrl(baseURL?: string, url?: string): string {
  const actualUrl = url || "";
  if (actualUrl.startsWith("http://") || actualUrl.startsWith("https://")) {
    return actualUrl;
  }
  const base = baseURL || "";
  const separator = base.endsWith("/") || actualUrl.startsWith("/") ? "" : "/";
  if (base.endsWith("/") && actualUrl.startsWith("/")) {
    return `${base}${actualUrl.slice(1)}`;
  }
  return `${base}${separator}${actualUrl}`;
}

type ForceLogoutCallback = () => void;
let forceLogoutHandler: ForceLogoutCallback | null = null;
let isForceLoggedOut = false;
const pendingRequestControllers = new Set<AbortController>();

export const registerForceLogoutHandler = (handler: ForceLogoutCallback) => {
  forceLogoutHandler = handler;
};

export const resetForceLogout = () => {
  isForceLoggedOut = false;
};

export const triggerForceLogout = async () => {
  if (isForceLoggedOut) return;
  isForceLoggedOut = true;

  // 1. Cancel all pending requests
  for (const controller of pendingRequestControllers) {
    try {
      console.log("[API LOG] AbortController Abort: Cancelling pending request due to force logout");
      controller.abort();
    } catch (e) {
      // ignore
    }
  }
  pendingRequestControllers.clear();

  // 2. Clear AsyncStorage
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.multiRemove([
      "ACCESS_TOKEN",
      "REFRESH_TOKEN",
      "SESSION_ID",
      "USER_ID",
      "PATIENT_DATA",
      "ONBOARDING_STATE"
    ]);
  } catch (err) {
    console.error("[apiClient] Failed to clear AsyncStorage:", err);
  }

  // 3. Clear SecureStore
  try {
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("userId");
    await SecureStore.deleteItemAsync("refreshDate");
  } catch (err) {
    console.error("[apiClient] Failed to clear SecureStore:", err);
  }

  // 4. Sign out Firebase
  try {
    const { signOut } = require("firebase/auth");
    const { auth } = require("../firebase/config");
    await signOut(auth);
  } catch (err) {
    console.error("[apiClient] Failed to sign out Firebase:", err);
  }

  // 5. Trigger navigation / reset AuthContext
  if (forceLogoutHandler) {
    forceLogoutHandler();
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    if (config.url && config.url.includes("/ocr/extract")) {
      config.timeout = 240000;
    }
    const isAuthRequest = config.url && (
      config.url === "/auth/firebase-login" ||
      config.url === "/auth/login" ||
      config.url === "/auth/verify-otp" ||
      config.url === "/auth/request-otp" ||
      config.url === "/auth/refresh-token"
    );

    // If in force logout state, abort immediately and do not request (except for auth requests)
    if (isForceLoggedOut && !isAuthRequest) {
      console.log(`[API LOG] Axios Cancel: Request cancelled due to force logout for url: ${config.url}`);
      const controller = new AbortController();
      controller.abort();
      config.signal = controller.signal;
      return config;
    }

    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequestControllers.add(controller);
    (config as any).abortController = controller;

    // Add auth token if present
    const token = await SecureStore.getItemAsync("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const enabled = ENABLE_API_LOGS;
    if (enabled) {
      (config as any).metadata = { startTime: Date.now() };

      const fullUrl = resolveFullUrl(config.baseURL, config.url);

      const reqLog: any = {
        type: "OUTGOING_REQUEST",
        timestamp: new Date().toISOString(),
        method: config.method ? config.method.toUpperCase() : "GET",
        url: fullUrl,
        queryParams: config.params || {},
        headers: maskSensitiveData(config.headers || {}),
      };

      if (config.data) {
        if (config.data.constructor && config.data.constructor.name === "FormData") {
          reqLog.body = "[FormData Outgoing Payload]";
        } else {
          reqLog.body = truncatePayload(maskSensitiveData(config.data));
        }
      }

      console.log(`[API LOG] OUTGOING REQUEST:\n${JSON.stringify(reqLog, null, 2)}`);
    }

    return config;
  },
  (error) => {
    const enabled = ENABLE_API_LOGS;
    if (enabled) {
      const errLog = {
        type: "OUTGOING_REQUEST_ERROR",
        timestamp: new Date().toISOString(),
        message: error.message,
      };
      console.error(`[API LOG] OUTGOING REQUEST ERROR:\n${JSON.stringify(errLog, null, 2)}`);
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as any;
    if (config?.abortController) {
      pendingRequestControllers.delete(config.abortController);
    }

    const enabled = ENABLE_API_LOGS;
    if (enabled && config && config.metadata) {
      const duration = Date.now() - config.metadata.startTime;
      const fullUrl = resolveFullUrl(config.baseURL, config.url);

      const resLog = {
        type: "OUTGOING_RESPONSE",
        timestamp: new Date().toISOString(),
        method: config.method ? config.method.toUpperCase() : "GET",
        url: fullUrl,
        statusCode: response.status,
        responseTimeMs: `${duration}ms`,
        responseBody: truncatePayload(maskSensitiveData(response.data)),
      };

      console.log(`[API LOG] OUTGOING RESPONSE:\n${JSON.stringify(resLog, null, 2)}`);
    }

    return response;
  },
  async (error) => {
    const config = error?.config as any;
    if (config?.abortController) {
      pendingRequestControllers.delete(config.abortController);
    }

    const data = error.response?.data;
    
    const isAuthRequest = config?.url && (
      config.url === "/auth/firebase-login" ||
      config.url === "/auth/login" ||
      config.url === "/auth/verify-otp" ||
      config.url === "/auth/request-otp" ||
      config.url === "/auth/refresh-token"
    );

    // Check if response indicates session expired or force logout (except for auth requests)
    if (
      !isAuthRequest &&
      error.response?.status === 401 &&
      data &&
      (data.forceLogout === true || data.errorCode === "SESSION_EXPIRED")
    ) {
      await triggerForceLogout();
      // Return a pending promise to cancel downstream request chains and prevent retries/errors in UI
      return new Promise(() => {});
    }

    const enabled = ENABLE_API_LOGS;
    const message =
      data?.error?.message ||
      data?.status?.description?.message ||
      data?.status?.description ||
      data?.reason ||
      data?.message ||
      error.message ||
      "An unexpected error occurred";

    if (enabled && config && config.metadata) {
      const duration = Date.now() - config.metadata.startTime;
      const fullUrl = resolveFullUrl(config.baseURL, config.url);

      const errorLog = {
        type: "OUTGOING_RESPONSE_ERROR",
        timestamp: new Date().toISOString(),
        method: config.method ? config.method.toUpperCase() : "UNKNOWN",
        url: fullUrl,
        statusCode: error.response ? error.response.status : undefined,
        responseTimeMs: `${duration}ms`,
        message: message,
        responseBody: error.response ? truncatePayload(maskSensitiveData(error.response.data)) : undefined,
      };

      console.error(`[API LOG] OUTGOING RESPONSE ERROR:\n${JSON.stringify(errorLog, null, 2)}`);
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
