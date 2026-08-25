import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
} from "react-native-fbsdk-next";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { configureGoogleSignIn } from "../config/googleConfig";
import { AUTH_ENDPOINTS } from "../constants/endpoints";
import apiClient from "./apiClient";
import type { DummyConfirmationResult } from "./dummyAuth.service";
import * as AppleAuthentication from "expo-apple-authentication";

// Singleton storage to avoid passing non-serializable objects in React Navigation params
let activeConfirmationResult: any = null;

export const setConfirmationResult = (result: any) => {
  activeConfirmationResult = result;
};

export const getConfirmationResult = () => {
  return activeConfirmationResult;
};

export const reportAuthFailure = async (payload: { identifier: string; provider: string; loginType: string }) => {
  try {
    const response = await apiClient.post("/auth/auth-failure", payload);
    return response?.data;
  } catch (error) {
    console.error("[AUTH] Auth Failure Report Error:", error);
  }
};

export const loginWithFirebaseToken = async (
  firebaseToken: string,
  deviceToken?: string | null,
) => {
  const response = await apiClient.post("/auth/firebase-login", {
    firebaseToken,
    deviceToken,
  });
  return response?.data?.data || {};
};

interface SocialLoginPayload {
  loginType: "mobile" | "social";
  provider: string;
  deviceToken?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  firebaseIdToken?: string;
  providerToken?: string | null;
}

export const socialLogin = async (
  loginType: "mobile" | "social",
  provider: string,
  firebaseIdToken: string,
  providerToken?: string | null,
  deviceToken?: string | null,
  extraDetails?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null,
) => {
  const payload: SocialLoginPayload = {
    loginType,
    provider,
    deviceToken,
    ...extraDetails,
  };

  if (firebaseIdToken) {
    payload.firebaseIdToken = firebaseIdToken;
  }

  if (loginType === "social" && providerToken) {
    payload.providerToken = providerToken;
  }
  const response = await apiClient.post("/auth/social-login", payload);
  return response?.data || response?.data?.data || {};
};

export const loginSocialWithFirebase = async (
  provider: "google" | "facebook" | "microsoft" | "phone" | "apple",
  token: string,
  accessToken?: string,
) => {
  let credential;
  switch (provider) {
    case "google":
      credential = auth.GoogleAuthProvider.credential(token);
      break;
    case "facebook":
      credential = auth.FacebookAuthProvider.credential(token);
      break;
    case "microsoft":
      credential = auth.OAuthProvider.credential(token, accessToken);
      break;
    case "apple":
      credential = auth.AppleAuthProvider.credential(
        token,
        accessToken
      );
      break;
    default:
      throw new Error("Invalid provider");
  }

  const userCredential = await auth().signInWithCredential(credential);
  return await userCredential.user.getIdToken(true);
};

export const loginWithGoogle = async () => {
  configureGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Force account picker to show every time by signing out first
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore if not signed in
    }

    const signInResult: any = await GoogleSignin.signIn();

    // Handle both v16 format (signInResult.data.idToken) and older v15 format (signInResult.idToken)
    const idToken = signInResult?.data?.idToken || signInResult?.idToken;

    if (!idToken) {
      Toast.show({
        type: "error",
        text1: "Something went wrong! 😔",
        text2: "Please try again later.",
      });
    }
    return idToken;
  } catch (error) {
    console.error("[AUTH] Google Sign-In Error:", error);
    throw error;
  }
};

export const loginWithFacebook = async (): Promise<{
  token: string;
  tokenType: "access" | "authentication";
}> => {
  try {
    const result =
      Platform.OS === "ios"
        ? await LoginManager.logInWithPermissions(
            ["public_profile", "email"],
            "limited",
          )
        : await LoginManager.logInWithPermissions([
            "public_profile",
            "email",
          ]);

    if (result.isCancelled) {
      throw new Error("Facebook Sign-In cancelled.");
    }

    if (Platform.OS === "ios") {
      const authTokenResult =
        await AuthenticationToken.getAuthenticationTokenIOS();
      const authenticationToken = authTokenResult?.authenticationToken;

      if (!authenticationToken) {
        throw new Error("No Facebook authentication token returned.");
      }

      return {
        token: authenticationToken,
        tokenType: "authentication",
      };
    }

    const data = await AccessToken.getCurrentAccessToken();
    if (!data?.accessToken) {
      Toast.show({
        type: "error",
        text1: "Something went wrong! 😔",
        text2: "Please try again later.",
      });
      throw new Error("No Facebook access token returned.");
    }

    return {
      token: data.accessToken.toString(),
      tokenType: "access",
    };
  } catch (error) {
    console.error("[AUTH] Facebook Sign-In Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGOUT, {});
  return response.data;
};

export const refreshAuthToken = async (refreshToken: string) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
    refreshToken,
  });
  return response.data;
};


export const loginWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("No identity token returned from Apple.");
    }

    return {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      fullName: credential.fullName,
      email: credential.email,
      user: credential.user,
    };
  } catch (e: any) {
    if (e.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple Sign-In cancelled.");
    }

    throw e;
  }
};
