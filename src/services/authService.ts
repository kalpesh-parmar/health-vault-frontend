import { AUTH_ENDPOINTS } from "../constants/endpoints";
import * as SecureStore from "expo-secure-store";

type loginRequestBody = {
  email: string;
  password: string;
};

type signupRequestBody = {
  username: string;
  fullname: string;
  email: string;
  mobile: string;
  password: string;
  gender: string | null;
  date: Date | null;
};

export const login = async ({ email, password }: loginRequestBody) => {
  const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.status?.description);
  }
  return result;
};

export const registerUser = async ({
  username,
  fullname,
  email,
  mobile,
  password,
  gender,
  date,
}: signupRequestBody) => {
  const response = await fetch(AUTH_ENDPOINTS.SIGNUP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName: username,
      fullName: fullname,
      email: email,
      password: password,
      gender: gender,
      dateOfBirth: date,
      phone: mobile,
    }),
  });

  const result = await response.json();
  console.log("Result :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description?.message);
  }

  return result;
};

export const deleteUserAccount = async () => {
  const userId = await SecureStore.getItemAsync("userId");

  if (!userId) {
    throw new Error("User ID not found in secure storage.");
  }

  const endpoint = AUTH_ENDPOINTS.DELETE_USER.replace("{id}", userId);

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.status?.description?.message);
  }

  return result;
};

export const getUserById = async (userId: string) => {
  const endpoint = AUTH_ENDPOINTS.GET_USER_BY_ID.replace("{id}", userId);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();
  console.log("User Data :- ",result);

  if (!response.ok) {
    throw new Error(result?.status?.description?.message);
  }

  return result;
};

export const updateUser = async (userId: string, data: any) => {
  const endpoint = AUTH_ENDPOINTS.UPDATE_USER.replace("{id}", userId);

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName: data?.userName,
      fullName: data?.fullName,
      email: data?.email,
      password: data?.password,
      gender: data?.gender,
      dateOfBirth: data?.dateOfBirth,
      phone: data?.phone,
    }),
  });

  const result = await response.json();
  console.log("Updated Data :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description);
  }

  return result;
};

export const logoutUser = async () => {
  const response = await fetch(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await SecureStore.getItemAsync("authToken")}`,
    },
  });

  const result = await response.json();
  console.log("Result :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description);
  }

  return result;
};

export const documentUpload = async (formData: FormData) => {
  const response = await fetch(AUTH_ENDPOINTS.DOCUMENT_UPLOAD, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: formData,
  });

  const result = await response.json();
  console.log("Document Upload Result :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description);
  }

  return result;
};
