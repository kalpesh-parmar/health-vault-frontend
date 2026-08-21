export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  VERIFY_OTP: "/auth/verify-otp",
  REQUEST_OTP: "/auth/request-otp",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  REFRESH_TOKEN: "/auth/refresh-token",
} as const;

export const PATIENT_ENDPOINTS = {
  SIGNUP: "/patient/add",
  GET_USER: "/patient/profile",
  UPDATE_USER: "/patient/{id}",
  DELETE_USER: "/patient/soft-delete/{id}",
} as const;

export const DOCUMENT_ENDPOINTS = {
  UPLOAD_DOCUMENT: "/documents/upload",
  PATIENT_DOCUMENTS_UPLOAD: (patientId: string) => `/patient/${patientId}/documents/upload`,
  RETRY_DOCUMENT: "/documents/retry",
  SSE_BATCH_STREAM: (batchId: string) => `/sse/batches/${batchId}/stream`,
  SSE_FILE_STREAM: (fileKey: string) => `/sse/files/${fileKey}/stream`,
  OCR_JOB_START: (jobId: string) => `/ocr/jobs/${jobId}/start`,
  OCR_JOB_STATUS: (jobId: string) => `/ocr/jobs/${jobId}`,
  OCR_JOB_RESULT: (jobId: string) => `/ocr/jobs/${jobId}/result`,
  OCR_BATCH_START: "/ocr/jobs/batch-start",
  RUN_OCR: "/documents/run-ocr",
  OCR_PROGRESS: "/documents/run-ocr-status/{fileKey}",
  ADD_DOCUMENT: "/documents/add",
  LIST_DOCUMENT: "/documents/list", // Normal GetAllDocument API.
  DOCUMENT_LIST_PAGINATED: "/documents/list-paginated",
  GET_DOCUMENT: "/documents/{id}",
  GET_SIGNED_URL: "/documents/download-url",
  DELETE_DOCUMENT: "/documents/{id}",
  UPDATE_DOCUMENT: "/documents/update/{id}",
  SHARE_DOCUMENT: "/documents/{id}/share",
  REVOKE_SHARE_LINK: "/documents/{id}/share/revoke",
  GET_SHARED_LINKS: "/documents/{id}/shares",
  FILTER_AND_SORT: "/documents/list", // Filter and sort API.
  NEW_OCR_STATUS: "/v1/ocr/status/{documentId}",
  NEW_OCR_CANCEL: "/v1/ocr/cancel/{documentId}",
  OCR_EXTRACT: "/v1/ocr/extract",
  OCR_STATUS: "/v1/ocr/status/{documentId}",
} as const;


export const MEDICATION_REMINDER_ENDPOINTS = {
  CREATE_MEDICATION_REMINDER: "/medication-reminders/create",
  GET_ALL_MAIN_REMINDERS_OCCURENCES: "/medication-reminders",
  GET_ALL_SUB_REMINDERS_OCCURRENCES: "/medication-reminders/occurrences",
  LIST_TODAY_OCCURRENCES: "/medication-reminders/occurrences/today",
  UPDATE_REMINDER_OCCURRENCE_STATUS: "/medication-reminders/occurrences/{id}",
  FILTER_AND_SORT_OCCURRENCES: "/medication-reminders/occurrences/list",
} as const;

export const NOTIFICATION_ENDPOINTS = {
  LIST_NOTIFICATION: "/notifications/list-paginated",
  GET_NOTIFICATION_COUNT: "/notifications/badge-count",
  MARK_AS_READ: "/notifications/mark-read/{id}",
  MARK_ALL_READ: "/notifications/mark-all-read",
} as const;

export const MEDICATION_ENDPOINTS = {
  ADD_MEDICATION: "/medications/create",
  CHECK_DUPLICATE: "/medications/check-duplicate",
  LIST_MEDICATION_PAGINATED: "/medications/list-paginated", // Pagination API.
  GET_MEDICATION: "/medications/list", // Normal API.
  UPDATE_MEDICATION: "/medications/{id}",
  DELETE_MEDICATION: "/medications/{id}",
  LIST_ALL_MEDICATIONS: "/medications/list",
  FILTER_AND_SORT: "/medications/list", // Filter and sort API.
  REFILL_MEDICATION: "/medications/refill/{id}",
} as const;

export const REMINDER_ENDPOINTS = {
  ADD_REMINDER: "/reminders/create",
  LIST_REMINDERS_PAGINATED: "/reminders/list-paginated",
  UPDATE_REMINDER: "/reminders/{id}",
  DELETE_REMINDER: "/reminders/{id}",
} as const;

export const FILE_ENDPOINTS = {
  UPLOAD: "/file/upload",
  GET_SIGNED_URL: "/file/view",
  HARD_DELETE: "/file/hard-delete",
} as const;

export const CHAT_ENDPOINTS = {
  GET_MESSAGES: "/chat/session/{id}/messages",
  SEND_MESSAGE: "/chat/message",
} as const;
