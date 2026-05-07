import { ENV } from "../env";

const URL = ENV.BASE_URL;

export const AUTH_ENDPOINTS = {
  LOGIN: `${URL}/auth/login`,
  LOGOUT: `${URL}/auth/logout`,
  VERIFY_OTP: `${URL}/auth/verify-otp`,
  REQUEST_OTP: `${URL}/auth/request-otp`,
  FORGOT_PASSWORD: `${URL}/auth/forgot-password`,
  RESET_PASSWORD: `${URL}/auth/reset-password`,
} as const;

export const PATIENT_ENDPOINTS = {
  SIGNUP: `${URL}/patient/add`,
  GET_USER: `${URL}/patient/profile`,
  UPDATE_USER: `${URL}/patient/{id}`,
  DELETE_USER: `${URL}/patient/soft-delete/{id}`,
} as const;

export const DOCUMENT_ENDPOINTS = {
  ADD_DOCUMENT: `${URL}/documents/add`,
  LIST_DOCUMENT: `${URL}/documents/list`,
  DOCUMENT_LIST_PAGINATED: `${URL}/documents/list-paginated`,
  GET_DOCUMENT: `${URL}/documents/{id}`,
  GET_SIGNED_URL: `${URL}/documents/download-url`,
  DELETE_DOCUMENT: `${URL}/documents/{id}`,
  UPDATE_DOCUMENT: `${URL}/documents/{id}`,
} as const;
