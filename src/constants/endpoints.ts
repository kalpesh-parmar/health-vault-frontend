const URL = process.env.EXPO_PUBLIC_NEGLIGEE_API_URL;

export const AUTH_ENDPOINTS = {
  LOGIN: `${URL}/auth/login`,
  LOGOUT: `${URL}/auth/logout`,
  VERIFY_OTP: `${URL}/auth/verify-otp`,
  REQUEST_OTP: `${URL}/auth/request-otp`,
  FORGOT_PASSWORD: `${URL}/auth/forgot-password`,
  RESET_PASSWORD: `${URL}/auth/reset-password`,
  REFRESH_TOKEN: `${URL}/auth/refresh-token`,
} as const;

export const FILE_ENDPOINTS = {
  UPLOAD: `${URL}/file/upload`,
  GET_SIGNED_URL: `${URL}/file/getUrl`,
  HARD_DELETE: `${URL}/file/hard-delete`,
} as const;

export const PATIENT_ENDPOINTS = {
  SIGNUP: `${URL}/patient/add`,
  GET_USER: `${URL}/patient/profile`,
  UPDATE_USER: `${URL}/patient/{id}`,
  DELETE_USER: `${URL}/patient/soft-delete/{id}`,
} as const;

export const DOCUMENT_ENDPOINTS = {
  ADD_DOCUMENT: `${URL}/documents/add`,
  LIST_DOCUMENT: `${URL}/documents/list`, // Normal GetAllDocument API.
  DOCUMENT_LIST_PAGINATED: `${URL}/documents/list-paginated`,
  GET_DOCUMENT: `${URL}/documents/{id}`,
  GET_SIGNED_URL: `${URL}/documents/download-url`,
  DELETE_DOCUMENT: `${URL}/documents/{id}`,
  UPDATE_DOCUMENT: `${URL}/documents/{id}`,
  FILTER_AND_SORT: `${URL}/documents/list`, // Filter and sort API.
} as const;

export const NOTIFICATION_ENDPOINTS = {
  LIST_NOTIFICATION: `${URL}/notifications/list`, // Normal Listing.
  GET_NOTIFICATION_COUNT: `${URL}/notifications/badge-count`,
  MARK_AS_READ: `${URL}/notifications/mark-read/{id}`,
  MARK_ALL_READ: `${URL}/notifications/mark-all-read`
} as const;

export const MEDICATION_ENDPOINTS = {
  ADD_MEDICATION: `${URL}/medications/create`,
  LIST_MEDICATION_PAGINATED: `${URL}/medications/list-paginated`, // Pagination API.
  GET_MEDICATION: `${URL}/medications/list`, // Normal API.
  UPDATE_MEDICATION: `${URL}/medications/{id}`,
  DELETE_MEDICATION: `${URL}/medications/{id}`,
  LIST_ALL_MEDICATIONS: `${URL}/medications/list`,
  FILTER_AND_SORT: `${URL}/medications/list`, // Filter and sort API.
  REFILL_MEDICATION: `${URL}/medications/refill/{id}`,
} as const;

export const MEDICATION_REMINDER_ENDPOINTS = {
  CREATE_MEDICATION_REMINDER: `${URL}/medication-reminders/create`,
  GET_ALL_MAIN_REMINDERS_OCCURENCES: `${URL}/medication-reminders`,
  GET_ALL_SUB_REMINDERS_OCCURRENCES: `${URL}/medication-reminders/occurrences`,
  LIST_TODAY_OCCURRENCES: `${URL}/medication-reminders/occurrences/today`,
  UPDATE_REMINDER_OCCURRENCE_STATUS: `${URL}/medication-reminders/occurrences/{id}`,
  FILTER_AND_SORT_OCCURRENCES: `${URL}/medication-reminders/occurrences/list`,
} as const;
