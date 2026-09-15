import Toast from "react-native-toast-message";
import { statusCodes } from "@react-native-google-signin/google-signin";

interface LoginSuccessParams {
  authContextLogin: (data: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    createdAt?: string;
  }) => Promise<void>;
  backendResponse: any;
  customSuccessTitle?: string;
  customSuccessMessage?: string;
}

/**
 * Handles common auth context updating and success toast notification across all social logins.
 */
export const handleSuccessfulSocialLogin = async ({
  authContextLogin,
  backendResponse,
  customSuccessTitle = "Logged In Successfully! 🎉",
  customSuccessMessage = "Welcome to your secure health vault.",
}: LoginSuccessParams): Promise<boolean> => {
  const data = backendResponse?.data || backendResponse;
  const user = data?.user;
  const userId = user?.id || user?._id || data?.userId;
  const accessToken = data?.accessToken || data?.token;
  const refreshToken = data?.refreshToken;

  if (userId && accessToken && refreshToken) {
    await authContextLogin({
      accessToken: String(accessToken),
      refreshToken: String(refreshToken),
      userId: String(userId),
      createdAt: new Date().toISOString(),
    });

    Toast.show({
      type: "success",
      text1: customSuccessTitle,
      text2: customSuccessMessage,
    });

    return true;
  }

  return false;
};

/**
 * Checks if a login error was triggered by user cancellation.
 */
export const isAuthCancelled = (error: any): boolean => {
  if (!error) return false;
  if (
    error.code === statusCodes.SIGN_IN_CANCELLED ||
    error.code === statusCodes.IN_PROGRESS ||
    error.code === "ERR_REQUEST_CANCELED"
  ) {
    return true;
  }
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("cancel") || msg.includes("dismiss");
};

/**
 * Checks if a login error was network related.
 */
export const isNetworkAuthError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("network") ||
    error.code === "auth/network-request-failed" ||
    error.code === "ECONNABORTED"
  );
};
