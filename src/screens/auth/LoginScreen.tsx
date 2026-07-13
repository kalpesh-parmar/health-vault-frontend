import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Keyboard, Platform, StatusBar, View } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Toast from "react-native-toast-message";
import auth, { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";
import {
  setConfirmationResult,
  loginSocialWithFirebase,
  socialLogin,
  reportAuthFailure,
} from "../../services/auth.service";
import { statusCodes } from "@react-native-google-signin/google-signin";
import { resetForceLogout } from "../../services/apiClient";
import { useAppTheme } from "../../context/ThemeContext";
import { AuthStackParamList } from "../../types/navigation";
import { validateMobileNumber } from "../../validations/auth.validation";
import { formatPhoneNumberE164 } from "../../utils/auth.utils";
import PhoneInput from "../../components/auth/PhoneInput";
import AuthButton from "../../components/auth/AuthButton";
import {
  ENABLE_DUMMY_AUTH,
  isDummyNumber,
  getDummyConfirmationResult,
} from "../../services/dummyAuth.service";
import { useAuth } from "../../hooks/useAuth";
import {
  loginWithGoogle,
  loginWithFacebook,
} from "../../services/auth.service";
import SocialAuthButton from "../../components/auth/SocialAuthButton";

WebBrowser.maybeCompleteAuthSession();

const microsoftDiscovery = {
  authorizationEndpoint:
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint:
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

const LoginScreen = () => {
  const [mobile, setMobile] = useState("");
  const mobileRef = useRef("");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { theme } = useAppTheme();
  const { login: authContextLogin } = useAuth();

  useEffect(() => {
    console.log("[OTP_LOG] Component Mounted: LoginScreen");
    // Clear any stale force logout state from a previous session
    resetForceLogout();
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardPadding(e.endCoordinates.height > 0 ? e.endCoordinates.height + 40 : 0),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0),
    );
    return () => {
      console.log("[OTP_LOG] Component Unmounted: LoginScreen");
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "health-vault",
    path: "auth",
  });

  const microsoftAuthConfig = useMemo(() => ({
    clientId:
      process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
    scopes: ["openid", "profile", "email"],
    redirectUri,
    responseType: "code",
    usePKCE: true,
    extraParams: {
      nonce: "defaultNonce",
    },
  }), [redirectUri]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    microsoftAuthConfig,
    microsoftDiscovery,
  );
  console.log("Request :- ", request);
  console.log("Code Verifier :- ", request?.codeVerifier);
  console.log("Response :- ", response);

  useEffect(() => {
    // Generate one redirectURI for redirecting the user as per the requirement
    console.log(
      "👉 MICROSOFT REDIRECT URI (Register this in Azure):",
      redirectUri,
    );

    const handleMicrosoftResponse = async () => {
      if (response?.type === "success") {
        const { code } = response.params;

        if (code) {
          setIsMicrosoftLoading(true);
            let firebaseToken = "";
            try {
              const tokenResult = await AuthSession.exchangeCodeAsync(
                {
                  clientId:
                    process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ||
                    "PLACEHOLDER_CLIENT_ID",
                  code,
                  redirectUri,
                  extraParams: {
                    code_verifier: request?.codeVerifier || "",
                  },
                },
                microsoftDiscovery,
              );
            console.log("TOken result :- ", tokenResult);

            const { idToken } = tokenResult;

            if (!idToken) {
              throw new Error("No idToken received from Microsoft.");
            }

            const deviceToken = await SecureStore.getItemAsync("deviceToken");
            console.log("Calling backend socialLogin for Microsoft...");
            const backendResponse = await socialLogin(
              "social",
              "microsoft",
              "", // no firebase token before backend call
              idToken,
              deviceToken,
            );

            if (backendResponse?.data?.user?.id) {
              const firebaseCustomToken = backendResponse?.data?.firebaseCustomToken;
              if (firebaseCustomToken) {
                console.log("Signing in with Firebase Custom Token...");
                await auth().signInWithCustomToken(firebaseCustomToken);
              } else {
                console.warn("No firebaseCustomToken returned from backend for Microsoft login.");
              }

              await authContextLogin({
                accessToken: backendResponse?.data?.accessToken,
                refreshToken: backendResponse?.data?.refreshToken,
                userId: backendResponse?.data?.user?.id,
                createdAt: new Date().toISOString(),
              });
              Toast.show({
                type: "success",
                text1: "Logged In Successfully! 🚀",
                text2: "Welcome to your secure health vault.",
              });
            } else {
              throw new Error("Backend login failed.");
            }
          } catch (error: any) {
            const errorMsg = String(error.message || "").toLowerCase();
            const isCancelled = errorMsg.includes("cancel");
            const isNetwork = errorMsg.includes("network") || error.code === "auth/network-request-failed";
            
            if (!isCancelled && !isNetwork) {
              reportAuthFailure({ identifier: firebaseToken,  provider: "microsoft", loginType: "social" });
            }

            Toast.show({
              type: "error",
              text1: "Microsoft Sign-In Failed",
              text2: error.message || "An error occurred during sign in.",
            });
            console.log("Microsoft Error :- ", error.message);
          } finally {
            setIsMicrosoftLoading(false);
          }
        }
      } else if (response?.type === "error") {
        Toast.show({
          type: "error",
          text1: "Microsoft Sign-In Failed",
          text2: response.error?.message || "Something went wrong.",
        });
      }
    };

    if (response) {
      handleMicrosoftResponse();
    }
  }, [response, request]);

  const handleContinue = useCallback(async () => {
    if (loading) return; // Prevent duplicate clicks
    Keyboard.dismiss();

    const currentMobile = mobileRef.current;

    if (!validateMobileNumber(currentMobile)) {
      setMobileError("Please enter a valid 10-digit mobile number");
      return;
    }
    setMobileError(null);
    setLoading(true);

    try {
      const formattedMobile = formatPhoneNumberE164(currentMobile);
      console.log(
        `[OTP_LOG] OTP Send Start: Sending OTP to ${formattedMobile}`,
      );

      let confirmationResult;
      if (ENABLE_DUMMY_AUTH && isDummyNumber(formattedMobile)) {
        console.log(
          `[DUMMY_AUTH] Bypassing Firebase and returning dummy confirmation for ${formattedMobile}`,
        );
        confirmationResult = getDummyConfirmationResult();
      } else {
        console.log(
          `[FIREBASE_AUTH] Using Firebase Phone Auth for ${formattedMobile}`,
        );
        const authInstance = getAuth();
        confirmationResult = await signInWithPhoneNumber(
          authInstance,
          formattedMobile,
        );
      }

      console.log(
        `[OTP_LOG] OTP Send Success: Verification code sent successfully to ${formattedMobile}`,
      );

      // Save confirmation result in service singleton
      setConfirmationResult(confirmationResult);

      Toast.show({
        type: "success",
        text1: "OTP Sent! 💬",
        text2: `A 6-digit code has been sent to ${formattedMobile}`,
      });

      // Navigate to verification screen
      navigation.navigate("OtpVerification", { mobile: formattedMobile });
    } catch (error: any) {
      console.error("Firebase Phone Auth error:", error);
      let errorMessage = "Failed to send verification code. Please try again.";

      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      } else if (error.code === "auth/quota-exceeded") {
        errorMessage = "SMS quota exceeded. Please contact support.";
      } else if (error.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number format.";
      }

      Toast.show({
        type: "error",
        text1: "Verification Failed",
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [loading, navigation]);

  const handleGoogleSignIn = async () => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    console.log(webClientId);
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    let firebaseToken = "";
    try {
      const deviceToken = await SecureStore.getItemAsync("deviceToken");
      const idToken = await loginWithGoogle();
      if (idToken) {
        firebaseToken = await loginSocialWithFirebase("google", idToken);
        const backendResponse = await socialLogin(
          "social",
          "google",
          firebaseToken,
          idToken,
          deviceToken,
        );
        console.log("Backend Response :- ", backendResponse?.data?.user?.id);

        if (backendResponse?.data?.user?.id) {
          await authContextLogin({
            accessToken: backendResponse?.data?.accessToken,
            refreshToken: backendResponse?.data?.refreshToken,
            userId: backendResponse?.data?.user?.id,
            createdAt: new Date().toISOString(),
          });
          Toast.show({
            type: "success",
            text1: "Logged In Successfully! 🎉",
            text2: "Welcome to your secure health vault.",
          });
        } else {
          throw new Error("Backend login failed.");
        }
      } else {
        throw new Error("Google Sign-In failed.");
      }
    } catch (error: any) {
      const isCancelled =
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS ||
        String(error.message).toLowerCase().includes("cancel");
      const isNetwork =
        String(error.message).toLowerCase().includes("network") ||
        error.code === "auth/network-request-failed";

      if (!isCancelled && !isNetwork) {
        reportAuthFailure({ identifier: firebaseToken, provider: "google", loginType: "social" });
      }

      Toast.show({
        type: "error",
        text1: "Google Sign-In Failed",
        text2: error.message || "An error occurred during sign in.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    if (isFacebookLoading) return;
    setIsFacebookLoading(true);
    let firebaseToken = "";
    try {
      const deviceToken = await SecureStore.getItemAsync("deviceToken");
      const idToken = await loginWithFacebook();
      console.log("Facebook Token :- ", idToken);
      if (idToken) {
        firebaseToken = await loginSocialWithFirebase(
          "facebook",
          idToken,
        );
        const backendResponse = await socialLogin(
          "social",
          "facebook",
          firebaseToken,
          idToken,
          deviceToken,
        );
        console.log("Backend Response :- ", backendResponse?.data?.user?.id);

        if (backendResponse?.data?.user?.id) {
          await authContextLogin({
            accessToken: backendResponse?.data?.accessToken,
            refreshToken: backendResponse?.data?.refreshToken,
            userId: backendResponse?.data?.user.id,
            createdAt: new Date().toISOString(),
          });
          Toast.show({
            type: "success",
            text1: "Logged In Successfully! 🎉",
            text2: "Welcome to your secure health vault.",
          });
        } else {
          throw new Error("Backend login failed.");
        }
      } else {
        throw new Error("Facebook Sign-In failed.");
      }
    } catch (error: any) {
      const errorMsg = String(error.message || "").toLowerCase();
      const isCancelled = errorMsg.includes("cancel");
      const isNetwork = errorMsg.includes("network") || error.code === "auth/network-request-failed";

      if (!isCancelled && !isNetwork) {
        reportAuthFailure({ identifier: firebaseToken, provider: "facebook", loginType: "social" });
      }

      Toast.show({
        type: "error",
        text1: "Facebook Sign-In Failed",
        text2: errorMsg || "An error occurred during sign in.",
      });
    } finally {
      setIsFacebookLoading(false);
    }
  };

  return (
    <Container themeColor={theme.colors}>
      <StatusBar barStyle="light-content" />

      <View style={{ flex: 1, paddingBottom: keyboardPadding }}>
        <GradientBackground
          colors={["#0F2027", "#203A43", "#2C5364"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flex: 1 }}>
            <InnerContainer>
              <TopSection>
                <MaskedView maskElement={<Title>HEALTHCARE</Title>}>
                  <LinearGradient
                    colors={["#43E97B", "#38F9D7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Title style={{ opacity: 0 }}>HEALTHCARE</Title>
                  </LinearGradient>
                </MaskedView>
                <Subtitle>YOUR HEALTH, OUR PRIORITY</Subtitle>
              </TopSection>

              <BottomCard themeColor={theme.colors}>
                <WelcomeText themeColor={theme.colors}>
                  Verify Your Identity
                </WelcomeText>
                <DescriptionText themeColor={theme.colors}>
                  Enter your mobile number to receive a secure login OTP
                </DescriptionText>

                <PhoneInput
                  value={mobile}
                  onChangeText={(text) => {
                    setMobile(text);
                    mobileRef.current = text;
                    setMobileError(null);
                  }}
                  error={mobileError}
                  disabled={loading}
                />

                <Spacer />

                <AuthButton
                  title="Send Verification Code"
                  onPress={handleContinue}
                  loading={loading}
                />

                <DividerContainer>
                  <DividerLine themeColor={theme.colors} />
                  <DividerText themeColor={theme.colors}>
                    or continue with
                  </DividerText>
                  <DividerLine themeColor={theme.colors} />
                </DividerContainer>

                <SocialAuthButton
                  provider="google"
                  label="Continue with Google"
                  onPress={handleGoogleSignIn}
                  loading={isGoogleLoading}
                  disabled={loading}
                />
                <SocialAuthButton
                  provider="apple"
                  label="Continue with Apple"
                  onPress={() => console.log("Apple login")}
                  disabled={loading}
                />
                <SocialAuthButton
                  provider="facebook"
                  label="Continue with Facebook"
                  onPress={handleFacebookSignIn}
                  loading={isFacebookLoading}
                  disabled={loading}
                />
                <SocialAuthButton
                  provider="microsoft"
                  label="Continue with Microsoft"
                  onPress={() => promptAsync()}
                  loading={isMicrosoftLoading}
                  disabled={loading || !request}
                />
              </BottomCard>
            </InnerContainer>
          </View>
        </GradientBackground>
      </View>
    </Container>
  );
};

export default LoginScreen;

const Container = styled.View<{ themeColor: any }>`
  flex: 1;
  background-color: ${(props: { themeColor: any }) =>
    props.themeColor.background};
`;

const GradientBackground = styled(LinearGradient)`
  flex: 1;
`;

const InnerContainer = styled.ScrollView.attrs({
  contentContainerStyle: { flexGrow: 1 },
  keyboardShouldPersistTaps: "handled"
})`
  flex: 1;
`;

const TopSection = styled.View`
  align-items: center;
  padding-top: 50px;
  padding-bottom: 36px;
`;

const Title = styled.Text`
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 3px;
  text-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
`;

const Subtitle = styled.Text`
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 4px;
`;

const BottomCard = styled.View<{ themeColor: any }>`
  flex: 1;
  justify-content: center;
  background-color: ${(props: { themeColor: any }) => props.themeColor.surface};
  border-top-left-radius: 42px;
  border-top-right-radius: 42px;
  padding-horizontal: 24px;
  padding-vertical: 36px;
`;

const WelcomeText = styled.Text<{ themeColor: any }>`
  font-size: 26px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
`;

const DescriptionText = styled.Text<{ themeColor: any }>`
  margin-top: 6px;
  margin-bottom: 28px;
  font-size: 15px;
  color: ${(props: { themeColor: any }) => props.themeColor.textSecondary};
  line-height: 22px;
`;

const Spacer = styled.View`
  height: 12px;
`;

const DividerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-vertical: 24px;
`;

const DividerLine = styled.View<{ themeColor: any }>`
  flex: 1;
  height: 1px;
  background-color: ${(props: { themeColor: any }) =>
    props.themeColor.border || "rgba(0,0,0,0.1)"};
`;

const DividerText = styled.Text<{ themeColor: any }>`
  margin-horizontal: 10px;
  font-size: 14px;
  color: ${(props: { themeColor: any }) => props.themeColor.textSecondary};
`;
