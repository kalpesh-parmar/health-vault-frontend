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
  const formData = new FormData();

  // Profile Picture
  if (payload.profilePicture) {
    formData.append("profilePicture", {
      uri: payload.profilePicture.uri,
      name: payload.profilePicture.name,
      type: payload.profilePicture.type,
    } as any);
  }
  formData.append("userName", payload.userName);
  formData.append("firstName", payload.firstName);
  formData.append("lastName", payload.lastName);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("gender", payload.gender);
  formData.append("age", String(payload.age));
  formData.append("phone", payload.phone);

  const response = await apiClient.post(PATIENT_ENDPOINTS.SIGNUP, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGOUT, {});
  return response.data;
};

export const sendOTP = async ({ email }: ForgotPasswordRequest) => {
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
