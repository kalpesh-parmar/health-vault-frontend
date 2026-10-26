export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:4002";
export const API_TIMEOUT = 90000;
export const UPLOAD_TIMEOUT = 300000; // 5 minutes dedicated for document uploads
export const ENABLE_API_LOGS = process.env.EXPO_PUBLIC_ENABLE_API_LOGS === "true" || true;
