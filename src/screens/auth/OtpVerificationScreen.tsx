import { Ionicons } from "@expo/vector-icons";
import { getAuth, signInWithPhoneNumber, getIdToken } from "@react-native-firebase/auth";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useRef, useState, useEffect } from "react";
import { Keyboard } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";

import AuthButton from "../../components/auth/AuthButton";
import {
  AuthCollapsibleHeader,
} from "../../components/auth/AuthHeader";
import CountdownTimer from "../../components/auth/CountdownTimer";
import OtpInput, { OtpInputRef } from "../../components/auth/OtpInput";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import {
  getConfirmationResult,
  socialLogin,
  setConfirmationResult,
  reportAuthFailure,
} from "../../services/auth.service";
import { AuthStackParamList } from "../../types/navigation";
import { maskPhoneNumber } from "../../utils/auth.utils";
import {
  ENABLE_DUMMY_AUTH,
  isDummyNumber,
  getDummyConfirmationResult,
  DUMMY_TOKEN,
} from "../../services/dummyAuth.service";

type OtpVerificationRouteProp = RouteProp<
  AuthStackParamList,
  "OtpVerification"
>;

const OtpVerificationScreen = () => {
  const route = useRoute<OtpVerificationRouteProp>();
  const { mobile } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isVerifyingRef = useRef(false);
  const otpRef = useRef<OtpInputRef>(null);

  useEffect(() => {
    console.log("[OTP_LOG] Component Mounted: OtpVerificationScreen");
    return () => {
      console.log("[OTP_LOG] Component Unmounted: OtpVerificationScreen");
    };
  }, []);
  const scrollY = useSharedValue(0);
  const shakeOffset = useSharedValue(0);
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const { login: authContextLogin } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { theme } = useAppTheme();

  const triggerShake = () => {
    setError("Invalid verification code");
    shakeOffset.value = 0;
    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const triggerSuccessAnimation = (callback: () => void) => {
    setSuccess(true);
    successScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    successOpacity.value = withTiming(1, { duration: 300 });

    setTimeout(() => {
      callback();
    }, 1200);
  };

  const handleVerify = async () => {
    if (loading || isVerifyingRef.current) {
      console.log("[OTP_LOG] Prevent duplicate verification call: already loading or verifying");
      return;
    }
    Keyboard.dismiss();
    const code = otp.join("");

    if (code.length < 6) {
      setError("Please enter the complete 6-digit code");
      triggerShake();
      return;
    }

    setError(null);
    setLoading(true);
    isVerifyingRef.current = true;

    let isSuccess = false;
    let firebaseToken;

    try {
      const confirmationResult = getConfirmationResult();
      if (!confirmationResult) {
        throw new Error(
          "No active phone verification session found. Please try again.",
        );
      }

      console.log(`[OTP_LOG] OTP Verify Start: Verifying OTP code of length ${code.length}`);
      
      if (confirmationResult.isDummy) {
        console.log("[DUMMY_AUTH] OTP Verify: Bypassing Firebase confirmation and using mock user");
        const dummyUserCredential = await confirmationResult.confirm(code);
        console.log("[DUMMY_AUTH] OTP Verify Success: Dummy authentication completed");
        console.log(`[DUMMY_AUTH] Dummy User UID: ${dummyUserCredential.user.uid}`);
        firebaseToken = DUMMY_TOKEN;
      } else {
        console.log("[FIREBASE_AUTH] OTP Verify: Confirming code with Firebase Auth");
        // Verify OTP with Firebase
        const userCredential = await confirmationResult.confirm(code);

        console.log("[OTP_LOG] OTP Verify Success: Firebase authentication completed");
        console.log(`[OTP_LOG] Firebase User UID: ${userCredential.user.uid}`);

        // Get Firebase ID Token using modular API
        firebaseToken = await getIdToken(userCredential.user);
        console.log("[OTP_LOG] Firebase ID Token Generated", firebaseToken);
      }

      // Submit Firebase token to backend
      console.log("[OTP_LOG] Backend Login Start: Authenticating token with server");
      const deviceToken = await SecureStore.getItemAsync("deviceToken");
      const backendResponse = await socialLogin("mobile", "mobile", firebaseToken, null, deviceToken);
      console.log("Backend Response :- ", backendResponse);
      
      if (backendResponse?.data?.success && backendResponse?.data?.token) {
        console.log("[OTP_LOG] Backend Login Success: Server authenticated session");
        isSuccess = true;
        
        console.log("[OTP_LOG] Navigation Start: Playing success animation and setting context login");
        triggerSuccessAnimation(async () => {
          await authContextLogin({
            accessToken: backendResponse?.data?.token,
            refreshToken: backendResponse?.data?.refreshToken,
            userId: backendResponse?.data?.user?.id,
            createdAt: new Date().toISOString(), // refresh date anchor
          });

          console.log("[OTP_LOG] Navigation Complete: User session established in context");

          Toast.show({
            type: "success",
            text1: "Logged In Successfully! 🎉",
            text2: "Welcome to your secure health vault.",
          });
        });
      } else {
        throw new Error("Backend login failed. Check it on your side.");
      }
    } catch (err: any) {
      console.error("OTP verification error::", err);
      isSuccess = false;
      isVerifyingRef.current = false;
      
      let errorMsg = "Invalid verification code. Please check and try again.";
      if (err.message && err.message.includes("No active phone")) {
        errorMsg = err.message;
      } else if (err.code === "auth/code-expired" || err.message?.toLowerCase().includes("expired")) {
        errorMsg = "Verification code has expired. Please request a new one.";
      } else if (err.message?.toLowerCase().includes("canceled") || err.message?.toLowerCase().includes("cancelled")) {
        errorMsg = "Verification cancelled. Please try again.";
      } else if (err.code === "auth/invalid-verification-code" || err.message?.toLowerCase().includes("invalid")) {
        errorMsg = "Invalid OTP entered. Please check and try again.";
        reportAuthFailure({ identifier: firebaseToken || "", provider: "mobile", loginType: "mobile" });
      }
      
      setError(errorMsg);
      triggerShake();
    } finally {
      if (!isSuccess) {
        setLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (loading) return;
    setError(null);
    setOtp(Array(6).fill(""));
    otpRef.current?.clear();

    try {
      console.log("[OTP_LOG] OTP Send Start: Resending OTP to " + mobile);
      Toast.show({
        type: "info",
        text1: "Requesting New OTP...",
      });
      
      let confirmationResult;
      if (ENABLE_DUMMY_AUTH && isDummyNumber(mobile)) {
        console.log(`[DUMMY_AUTH] Resending: Bypassing Firebase for dummy number ${mobile}`);
        confirmationResult = getDummyConfirmationResult();
      } else {
        console.log(`[FIREBASE_AUTH] Resending: Using Firebase for ${mobile}`);
        // Re-trigger SMS using modular firebase auth
        const authInstance = getAuth();
        confirmationResult = await signInWithPhoneNumber(authInstance, mobile);
      }

      console.log("[OTP_LOG] OTP Send Success: Resent verification code to " + mobile);
      setConfirmationResult(confirmationResult);

      Toast.show({
        type: "success",
        text1: "OTP Resent Successfully! 💬",
        text2: `A new 6-digit code has been sent to ${mobile}`,
      });
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      Toast.show({
        type: "error",
        text1: "Resend Failed",
        text2: err.message || "Failed to resend OTP. Please try again.",
      });
    }
  };

  // Reanimated style for invalid OTP shake
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeOffset.value }],
    };
  });

  // Reanimated style for success scale checkmark
  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
      opacity: successOpacity.value,
    };
  });

  return (
    <Container themeColor={theme.colors}>
      <MainView>
        <AuthCollapsibleHeader
          scrollY={scrollY}
          heading="Verify OTP"
          subHeading={`We have sent a secure code to ${maskPhoneNumber(mobile)}`}
        />

        <CardContainer>
          <AnimatedCard style={[animatedCardStyle, { shadowColor: "#000" }]}>
            <InfoText themeColor={theme.colors}>
              Enter the 6-digit code sent to your mobile phone number.
            </InfoText>

            <OtpInput
              ref={otpRef}
              value={otp}
              onChange={(newOtp) => {
                setOtp(newOtp);
                setError(null);
              }}
              hasError={!!error}
            />

            {error && <ErrorText>{error}</ErrorText>}

            <CountdownTimer onResend={handleResend} disabled={loading} />

            <VerifyButtonWrapper>
              <AuthButton
                title="Verify & Login"
                onPress={handleVerify}
                loading={loading}
              />
            </VerifyButtonWrapper>

            <BackButton
              onPress={() => {
                if (loading) return;
                navigation.goBack();
              }}
              disabled={loading}
              themeColor={theme.colors}
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              <BackText themeColor={theme.colors}>Change Mobile Number</BackText>
            </BackButton>
          </AnimatedCard>
        </CardContainer>
      </MainView>

      {/* Success Animation Overlay */}
      {success && (
        <SuccessOverlay themeColor={theme.colors}>
          <SuccessBadge style={animatedSuccessStyle} themeColor={theme.colors}>
            <Ionicons
              name="checkmark-circle"
              size={100}
              color={theme.colors.success}
            />
            <SuccessTitle themeColor={theme.colors}>Success!</SuccessTitle>
            <SuccessSubtitle themeColor={theme.colors}>
              Verification complete.
            </SuccessSubtitle>
          </SuccessBadge>
        </SuccessOverlay>
      )}
    </Container>
  );
};

export default OtpVerificationScreen;

const Container = styled.View<{ themeColor: any }>`
  flex: 1;
  background-color: ${(props: { themeColor: any }) =>
    props.themeColor.background};
`;

const MainView = styled.View`
  flex: 1;
`;

const CardContainer = styled.View`
  flex: 1;
  margin-top: -30px;
  padding-horizontal: 22px;
  padding-bottom: 40px;
`;

const AnimatedCard = styled(Animated.View)`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 30px;
  padding: 28px 22px;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.08;
  shadow-radius: 20px;
  elevation: 8;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const InfoText = styled.Text<{ themeColor: any }>`
  font-size: 14px;
  color: ${(props: { themeColor: any }) => props.themeColor.textSecondary};
  text-align: center;
  line-height: 22px;
`;

const ErrorText = styled.Text`
  font-size: 13px;
  color: #ef4444;
  text-align: center;
  margin-top: -4px;
  margin-bottom: 12px;
  font-weight: 600;
`;

const VerifyButtonWrapper = styled.View`
  width: 100%;
  margin-top: 10px;
  margin-bottom: 16px;
`;

const BackButton = styled.TouchableOpacity<{ themeColor: any }>`
  height: 56px;
  border-radius: 18px;
  border-width: 1.5px;
  border-color: ${(props: { themeColor: any }) => props.themeColor.border};
  justify-content: center;
  align-items: center;
  background-color: ${(props: { themeColor: any }) =>
    props.themeColor.background};
`;

const BackText = styled.Text<{ themeColor: any }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.textMuted};
`;

const SuccessOverlay = styled.View<{ themeColor: any }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props: { themeColor: any }) => props.themeColor.overlay};
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const SuccessBadge = styled(Animated.View)<{ themeColor: any }>`
  width: 280px;
  padding: 30px;
  border-radius: 30px;
  background-color: ${(props: { themeColor: any }) => props.themeColor.surface};
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${(props: { themeColor: any }) => props.themeColor.border};
`;

const SuccessTitle = styled.Text<{ themeColor: any }>`
  font-size: 24px;
  font-weight: 800;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
  margin-top: 16px;
`;

const SuccessSubtitle = styled.Text<{ themeColor: any }>`
  font-size: 15px;
  color: ${(props: { themeColor: any }) => props.themeColor.textSecondary};
  margin-top: 6px;
`;
