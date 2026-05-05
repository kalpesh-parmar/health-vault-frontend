import { MedicalDocument } from "../components/Documents/DocumentCard";
import { AUTH_ENDPOINTS } from "../constants/endpoints";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

type loginRequestBody = {
  email: string;
  password: string;
  deviceToken: string | null;
};

export type signupRequestBody = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  gender: string;
  age: number;
  phone: string;
};

export const login = async ({
  email,
  password,
  deviceToken,
}: loginRequestBody) => {
  try {
    const response = await axios.post(AUTH_ENDPOINTS.LOGIN, {
      email: email,
      password: password,
      deviceToken: deviceToken,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const registerUser = async (payload: signupRequestBody) => {
  console.log("Payload :- ", payload);
  try {
    const response = await axios.post(AUTH_ENDPOINTS.SIGNUP, {
      userName: payload.userName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      gender: payload.gender,
      age: payload.age ? Number(payload.age) : null,
      phone: payload.phone,
    });
    console.log("Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const deleteUserAccount = async () => {
  const userId = await SecureStore.getItemAsync("userId");

  if (!userId) {
    throw new Error("User ID not found in secure storage.");
  }

  const endpoint = AUTH_ENDPOINTS.DELETE_USER.replace("{id}", userId);

  try {
    const response = await axios.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.status?.description?.message || error.message,
    );
  }
};

export const getUser = async () => {
  const endpoint = AUTH_ENDPOINTS.GET_USER;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.status?.description?.message || error.message,
    );
  }
};

export const updateUser = async (userId: string, data: any) => {
  const endpoint = AUTH_ENDPOINTS.UPDATE_USER.replace("{id}", userId);

  try {
    const response = await axios.put(
      endpoint,
      {
        userName: data?.userName,
        firstName: data?.firstName,
        lastName: data?.lastName,
      },
      {
        headers: {
          Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const logoutUser = async () => {
  try {
    const response = await axios.post(
      AUTH_ENDPOINTS.LOGOUT,
      {},
      {
        headers: {
          Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
        },
      },
    );
    console.log("Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const sendForgotPasswordOTP = async ({ email }: { email: string }) => {
  try {
    const response = await axios.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
      email: email,
    });
    console.log("Forgot Password (Send OTP) Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const verifyOTP = async ({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) => {
  try {
    const response = await axios.post(AUTH_ENDPOINTS.VERIFY_OTP, {
      email: email,
      otp: otp,
    });
    console.log("Verify OTP Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const resendOTP = async ({ email }: { email: string }) => {
  try {
    const response = await axios.post(AUTH_ENDPOINTS.REQUEST_OTP, {
      email: email,
    });
    console.log("Resend OTP Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const resetPassword = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const response = await axios.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
      email: email,
      password: password,
    });
    console.log("Reset Password Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const documentUpload = async (formData: FormData) => {
  console.log("Document Upload FormData :- ", formData);
  try {
    const response = await axios.post(AUTH_ENDPOINTS.ADD_DOCUMENT, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    console.log("Document Upload Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const listDocument = async () => {
  try {
    const response = await axios.get(AUTH_ENDPOINTS.LIST_DOCUMENT, {
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    console.log("List Document Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const documentListpaginated = async ({
  activeCategory,
  page,
  pageLimit,
}: {
  activeCategory: string;
  page: number;
  pageLimit: number;
}) => {
  try {
    const response = await axios.post(
      AUTH_ENDPOINTS.DOCUMENT_LIST_PAGINATED,
      {
        filter: {
          search: activeCategory,
        },
        page: {
          pageNumber: page,
          pageLimit: pageLimit,
        },
        sort: {
          sortBy: "documentType",
          orderBy: "desc",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const updateDocument = async (document: Partial<MedicalDocument>) => {
  const endpoint = AUTH_ENDPOINTS.UPDATE_DOCUMENT.replace(
    "{id}",
    document?.id || "",
  );

  try {
    await axios.put(endpoint, {
      title: document.fileName,
      notes: document.notes,
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.status?.description || error.message);
  }
};

export const deleteDocument = async (documentId: number) => {
  const endpoint = AUTH_ENDPOINTS.DELETE_DOCUMENT.replace(
    "{id}",
    String(documentId),
  );

  try {
    const response = await axios.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    console.log("Delete Document Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.status?.description?.message || error.message,
    );
  }
};

export const getDocument = async (documentId: number) => {
  const endpoint = AUTH_ENDPOINTS.GET_DOCUMENT.replace(
    "{id}",
    String(documentId),
  );

  try {
    const response = await axios.get(endpoint);
    console.log("Get Document Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.status?.description?.message || error.message,
    );
  }
};

export const getSignedUrl = async (fileKey: string) => {
  console.log("File Key :- ", fileKey);
  const endpoint = AUTH_ENDPOINTS.GET_SIGNED_URL;
  console.log("Endpoint :- ", endpoint);

  try {
    const response = await axios.get(endpoint, {
      params: {
        fileKey: fileKey,
      },
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("authToken")}`,
      },
    });
    console.log("Get Signed URL Result :- ", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.status?.description || error.message,
    );
  }
};
