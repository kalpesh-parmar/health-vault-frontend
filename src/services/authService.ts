import { AUTH_ENDPOINTS } from "../constants/endpoints";
import * as SecureStore from "expo-secure-store";

type loginRequestBody = {
  email: string;
  password: string;
};

type signupRequestBody = {
  username: string;
  email: string;
  password: string;
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
    throw new Error(result?.status?.description?.message);
  }
  return result;
};

export const registerUser = async ({
  username,
  email,
  password,
}: signupRequestBody) => {
  const response = await fetch(AUTH_ENDPOINTS.SIGNUP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName: username,
      email: email,
      password: password,
    }),
  });

  const result = await response.json();
  console.log("Result :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description?.message);
  }

  return result;
};

export const createSession = async (token: string) => {
  const response = await fetch(AUTH_ENDPOINTS.SESSION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
    }),
  });

  const result = await response.json();

  if (!response.ok) throw new Error(result?.status?.description?.message);

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
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.status?.description?.message);
  }

  return result;
};

export const logoutSession = async () => {
  const sessionId = await SecureStore.getItemAsync("sessionId");
  const numSessionId = parseInt(sessionId || "0");
  console.log("Session Id :- ", numSessionId);

  if (!numSessionId) {
    throw new Error("Session not found. Please login again.");
  }

  const response = await fetch(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId: numSessionId }),
  });

  const result = await response.json();
  console.log("Result :- ", result);

  if (!response.ok) {
    throw new Error(result?.status?.description);
  }

  return result;
};
