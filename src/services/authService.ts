import apiClient from "./apiClient";
import { AUTH_ENDPOINTS, PATIENT_ENDPOINTS } from "../constants/endpoints";
import type {
  LoginRequest,
  SignupRequest,
  ForgotPasswordRequest,
  VerifyOTPRequest,
  ResetPasswordRequest,
} from "../types";

export const login = async ({ email, password, deviceToken }: LoginRequest) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, {
    email,
    password,
    deviceToken,
  });

  return response.data;
};

export const registerUser = async (payload: SignupRequest) => {
  const response = await apiClient.post(PATIENT_ENDPOINTS.SIGNUP, {
    userName: payload.userName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    gender: payload.gender,
    age: payload.age ? Number(payload.age) : null,
    phone: payload.phone,
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGOUT, {});
  return response.data;
};

export const sendForgotPasswordOTP = async ({ email }: ForgotPasswordRequest) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
    email,
  });
  return response.data;
};

export const verifyOTP = async ({ email, otp }: VerifyOTPRequest) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.VERIFY_OTP, {
    email,
    otp,
  });
  return response.data;
};

export const resendOTP = async ({ email }: ForgotPasswordRequest) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REQUEST_OTP, {
    email,
  });
  return response.data;
};

export const resetPassword = async ({ email, password }: ResetPasswordRequest) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
    email,
    password,
  });
  return response.data;
};
