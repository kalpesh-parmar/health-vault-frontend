import axios from "axios";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import Toast from "react-native-toast-message";
import { auth } from "../firebase/config";
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

function truncatePayload(payload: any, maxLength = 10000): any {
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

/**
 * Recursively decodes S3 key filenames in the response payload to display spaces correctly.
 */
function decodeFileNamesInPayload(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(decodeFileNamesInPayload);
  }
  
  const res: any = {};
  for (const key of Object.keys(obj)) {
    let value = obj[key];
    if (typeof value === "string") {
      if (
        (key === "fileName" ||
          key === "name" ||
          key === "originalFileName" ||
          key === "originalName" ||
          key === "fileKey" ||
          key === "displayName" ||
          key === "documentName") &&
        value.includes("%20")
      ) {
        try {
          value = decodeURIComponent(value).replace(/%20/g, " ");
        } catch (e) {
          value = value.replace(/%20/g, " ");
        }
      }
    } else if (typeof value === "object") {
      value = decodeFileNamesInPayload(value);
    }
    res[key] = value;
  }
  return res;
}

type ForceLogoutCallback = () => void;
let forceLogoutHandler: ForceLogoutCallback | null = null;
let isForceLoggedOut = false;
const pendingRequestControllers = new Set<AbortController>();

import { jwtDecode } from "jwt-decode";

export const registerForceLogoutHandler = (handler: ForceLogoutCallback) => {
  forceLogoutHandler = handler;
};

export const resetForceLogout = () => {
  isForceLoggedOut = false;
};

function isTokenExpired(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return false;
    // Buffer in seconds to refresh proactively before the token actually expires
    return decoded.exp * 1000 < Date.now() + bufferSeconds * 1000;
  } catch (e) {
    return true; // Assume expired if it fails to decode
  }
}

function isRefreshTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch (e) {
    // If refreshToken is not a JWT (e.g. opaque string or UUID), do not treat as expired locally
    return false;
  }
}

export const triggerForceLogout = async () => {
  if (isForceLoggedOut) return;
  isForceLoggedOut = true;

  Toast.show({
    type: "error",
    text1: "Session Expired",
    text2: "Your session has expired. Please log in again.",
  });

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
    await signOut(auth);
  } catch (err) {
    console.error("[apiClient] Failed to sign out Firebase:", err);
  }

  // 5. Trigger navigation / reset AuthContext
  if (forceLogoutHandler) {
    forceLogoutHandler();
  }
};

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const onRerefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

/**
 * Returns a valid access token, automatically refreshing it if expired or nearing expiry.
 */
export async function getValidAccessToken(forceRefresh = false): Promise<string | null> {
  if (isForceLoggedOut) {
    return null;
  }

  let token = await SecureStore.getItemAsync("accessToken");
  const needsRefresh = forceRefresh || !token || isTokenExpired(token, 60);

  if (!needsRefresh && token) {
    return token;
  }

  if (isRefreshing) {
    return new Promise<string | null>((resolve) => {
      addRefreshSubscriber((newToken) => resolve(newToken));
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = await SecureStore.getItemAsync("authToken"); // refreshToken is stored as authToken

    if (!refreshToken || isRefreshTokenExpired(refreshToken)) {
      isRefreshing = false;
      onRerefreshed(null);
      await triggerForceLogout();
      return null;
    }

    const refreshUrl = resolveFullUrl(BASE_URL, "/auth/refresh-token");

    const refreshResponse = await axios.post(
      refreshUrl,
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "Bypass-Tunnel-Reminder": "true",
        },
        timeout: 15000,
      }
    );

    const resData = refreshResponse.data?.data || refreshResponse.data;
    const newAccessToken =
      resData?.accessToken ||
      resData?.token;
    const newRefreshToken =
      resData?.refreshToken;

    if (newAccessToken) {
      await SecureStore.setItemAsync("accessToken", String(newAccessToken));
      if (newRefreshToken) {
        await SecureStore.setItemAsync("authToken", String(newRefreshToken));
      }

      const newRefreshDate = new Date();
      newRefreshDate.setDate(newRefreshDate.getDate() + 6);
      const yyyy = newRefreshDate.getFullYear();
      const mm = String(newRefreshDate.getMonth() + 1).padStart(2, "0");
      const dd = String(newRefreshDate.getDate()).padStart(2, "0");
      await SecureStore.setItemAsync("refreshDate", `${yyyy}-${mm}-${dd}`);

      isRefreshing = false;
      onRerefreshed(newAccessToken);
      return newAccessToken;
    } else {
      isRefreshing = false;
      onRerefreshed(null);
      await triggerForceLogout();
      return null;
    }
  } catch (refreshErr: any) {
    console.error("[apiClient] Token refresh failed:", refreshErr?.response?.data || refreshErr?.message || refreshErr);
    isRefreshing = false;
    onRerefreshed(null);

    const status = refreshErr?.response?.status;
    const errMsg = String(refreshErr?.response?.data?.message || refreshErr?.message || "").toLowerCase();
    if (
      status === 401 ||
      status === 403 ||
      errMsg.includes("expired") ||
      errMsg.includes("user not found") ||
      errMsg.includes("invalid")
    ) {
      await triggerForceLogout();
    }
    return null;
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    if (config.url && config.url.includes("/ocr/extract")) {
      config.timeout = 240000;
    }
    const isAuthRequest = Boolean(
      config.url && (
        config.url === "/auth/firebase-login" ||
        config.url === "/auth/login" ||
        config.url === "/auth/verify-otp" ||
        config.url === "/auth/request-otp" ||
        config.url === "/auth/refresh-token" ||
        config.url.endsWith("/auth/refresh-token") ||
        config.url.includes("/auth/refresh-token")
      )
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

    if (!isAuthRequest) {
      const token = await getValidAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (isForceLoggedOut) {
        controller.abort();
        return config;
      }
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

    // Decode document names inside all response payloads to show spaces instead of %20
    if (response.data) {
      response.data = decodeFileNamesInPayload(response.data);
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
      config.url === "/auth/refresh-token" ||
      config.url.endsWith("/auth/refresh-token") ||
      config.url.includes("/auth/refresh-token")
    );

    const message =
      data?.error?.message ||
      data?.status?.description?.message ||
      data?.status?.description ||
      data?.reason ||
      data?.message ||
      error.message ||
      "An unexpected error occurred";

    const isMedicationUrl = config?.url && (
      config.url.includes("/medications/create") ||
      config.url.includes("/medications/")
    );
    const isDuplicate = isMedicationUrl && (
      error.response?.status === 409 ||
      data?.errorCode === "CONFLICT" ||
      data?.errorCode === "MEDICINE_ALREADY_EXISTS" ||
      (typeof message === "string" && (
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("medicine already exists") ||
        message.toLowerCase().includes("similar medication already exists")
      ))
    );

    if (isDuplicate) {
      const dupError = new Error(message || "Medicine already exists in your profile.");
      (dupError as any).isDuplicate = true;
      (dupError as any).responseData = data;
      return Promise.reject(dupError);
    }

    const enabled = ENABLE_API_LOGS;
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

    const isSessionExpiredError = 
      error.response?.status === 401 ||
      data?.forceLogout === true || 
      data?.errorCode === "SESSION_EXPIRED" ||
      (typeof message === "string" && (
        message.toLowerCase().includes("session expired") ||
        message.toLowerCase().includes("user not found") ||
        message.toLowerCase().includes("unauthorized")
      ));

    if (
      !isAuthRequest &&
      isSessionExpiredError &&
      !config?._retry
    ) {
      config._retry = true;
      const newToken = await getValidAccessToken(true);
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } else {
        return Promise.reject(new Error(message));
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
