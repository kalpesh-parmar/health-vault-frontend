import React, { useState, useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthStackParamList } from "../../navigation/types";
import { useMutation } from "@tanstack/react-query";
import { login, resendOTP, verifyOTP } from "../../services/authService";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../context/ThemeContext";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../context/ContextAPI";

const OTP_LENGTH = 6;

type VerifyOTPRouteProp = RouteProp<AuthStackParamList, "VerifyOTP">;

type VerifyOTPProps = {
  route: VerifyOTPRouteProp;
};

const VerifyOTP = ({ route }: VerifyOTPProps) => {
  const { email, password, fromLogin } = route?.params;

  const [deviceToken, setDeviceToken] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const {login: authLogin} = useAuth();

  const inputRefs = useRef<Array<TextInput | null>>(
    Array(OTP_LENGTH).fill(null),
  );

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const { isDark, theme } = useAppTheme();

  useEffect(() => {
    const fetchDeviceToken = async () => {
      const token = await SecureStore.getItemAsync("deviceToken");
      setDeviceToken(token!);
    }
    fetchDeviceToken();
    startTimer();
    return () => {};
  }, []);

  const startTimer = () => {
    setTimer(30);
    setCanResend(false);

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;

    setOtp(newOtp);

    if (otpError) setOtpError("");

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      setOtp((prev) => {
        const updated = [...prev];

        if (updated[index]) {
          updated[index] = "";
        } else if (index > 0) {
          updated[index - 1] = "";
          inputRefs.current[index - 1]?.focus();
        }

        return updated;
      });
    }
  };

  const { mutateAsync: loginMutation, isPending } = useMutation({
      mutationFn: login,
  
      onSuccess: async (result) => {
        const refreshToken = result?.data?.refreshToken;
        const accessToken = result?.data?.accessToken;
        const userId = result?.data?.patient?.id;
        console.log(userId);
  
        await SecureStore.setItemAsync("authToken", String(refreshToken));
        await SecureStore.setItemAsync("accessToken", String(accessToken));
        await SecureStore.setItemAsync("userId", String(userId));
        console.log("Refresh Token :- ", refreshToken);
        
        await authLogin();
      },
  
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: "Login Failed.",
          text2: `${error.message}`,
        });
      },
    });

  const { mutateAsync: verifyOTPMutation, isPending: isLoading } = useMutation({
    mutationFn: verifyOTP,

    onSuccess: () => {
      if (fromLogin) {
        Toast.show({
          type: "success",
           text1: "Hurrahhh!!! 🥳",
           text2: `LoggedIn Successfully.`,
        });
        loginMutation({ email: email.trim(), password: password!, deviceToken: deviceToken! })
      } else {
        Toast.show({
          type: "success",
          text1: "OTP Verified Successfully.",
          text2: "Now you can reset your password.",
        });
        navigation.navigate("ResetPassword", { email });
      }
    },

    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Failed to Verify OTP.",
        text2: `${error.message}`,
      });

      setOtpError("Invalid OTP");
    },
  });

  const handleVerify = async () => {
    const code = otp.join("");

    if (code.length < OTP_LENGTH) {
      setOtpError("Please enter the complete 6-digit OTP.");
      return;
    }

    setOtpError("");

    const payload = {
      email: email,
      otp: otp.join(""),
    };

    await verifyOTPMutation(payload);
  };

  const { mutateAsync: resendOTPMutation, isPending: resendLoading } =
    useMutation({
      mutationFn: resendOTP,

      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: "OTP Resend Successfully.",
          text2: "Check your email for OTP.",
        });

        startTimer();
      },

      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: "Failed to resend OTP.",
          text2: `${error.message}`,
        });

        setOtpError("Failed to resend OTP");
      },
    });

  const handleResend = async () => {
    if (!canResend) return;

    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");

    inputRefs.current[0]?.focus();

    const payload = {
      email: email,
    };

    await resendOTPMutation(payload);
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />

      <Container>
        <TopGradient
          colors={
            isDark
              ? ["#312e81", "#7c3aed", "#ec4899"]
              : ["#7c3aed", "#ec4899", "#6366f1"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <PatternCircleOne />
          <PatternCircleTwo />
          <PatternDots />

          <TopHeader>
            <BackButton onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </BackButton>
          </TopHeader>

          <IconWrapper>
            <IconCircle>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={38}
                color="#ffffff"
              />
            </IconCircle>

            <HeaderTitle>Verify OTP</HeaderTitle>

            <HeaderSubtitle>
              Enter the verification code sent to your email
            </HeaderSubtitle>
          </IconWrapper>
        </TopGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <CardContainer>
            <Card>
              <InfoText>
                We’ve sent a secure 6-digit verification code to
              </InfoText>

              {email && <EmailText>{email}</EmailText>}

              <OTPContainer>
                {otp.map((digit, index) => (
                  <OTPInput
                    key={index}
                    ref={(ref: TextInput | null) =>
                      (inputRefs.current[index] = ref)
                    }
                    value={digit}
                    onChangeText={(val: string) => handleChange(val, index)}
                    onKeyPress={({ nativeEvent }: any) =>
                      handleKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                    isFilled={!!digit}
                    hasError={!!otpError}
                    selectionColor={theme.colors.primary}
                  />
                ))}
              </OTPContainer>

              {!!otpError && <ErrorText>{otpError}</ErrorText>}

              <ResendWrapper>
                <ResendInfoText>Didn’t receive the code?</ResendInfoText>

                {canResend ? (
                  <ResendButton onPress={handleResend} disabled={resendLoading}>
                    {resendLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                    ) : (
                      <ResendButtonText>Resend OTP</ResendButtonText>
                    )}
                  </ResendButton>
                ) : (
                  <TimerText>Resend in {timer}s</TimerText>
                )}
              </ResendWrapper>

              <VerifyButton
                activeOpacity={0.9}
                onPress={handleVerify}
                disabled={isLoading || resendLoading}
              >
                <LinearGradient
                  colors={["#ec4899", "#8b5cf6", "#6366f1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: "100%",
                    paddingVertical: 16,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <VerifyButtonText>Verify OTP</VerifyButtonText>
                  )}
                </LinearGradient>
              </VerifyButton>

              <ChangeEmailButton
                activeOpacity={0.8}
                onPress={() => navigation.goBack()}
              >
                <ChangeEmailText>Change Email Address</ChangeEmailText>
              </ChangeEmailButton>
            </Card>
          </CardContainer>
        </KeyboardAvoidingView>
      </Container>
    </>
  );
};

export default VerifyOTP;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const TopGradient = styled(LinearGradient)`
  height: 330px;
  border-bottom-left-radius: 34px;
  border-bottom-right-radius: 34px;
  overflow: hidden;
`;

const PatternCircleOne = styled.View`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 110px;
  background-color: rgba(255, 255, 255, 0.08);
  top: -40px;
  right: -60px;
`;

const PatternCircleTwo = styled.View`
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 80px;
  background-color: rgba(255, 255, 255, 0.07);
  bottom: -50px;
  left: -40px;
`;

const PatternDots = styled.View`
  position: absolute;
  width: 90px;
  height: 90px;
  top: 70px;
  left: 24px;
  opacity: 0.2;
  border-width: 2px;
  border-style: dotted;
  border-color: #ffffff;
  border-radius: 20px;
`;

const TopHeader = styled.View`
  padding: 60px 24px 0px;
`;

const BackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.18);
  justify-content: center;
  align-items: center;
`;

const IconWrapper = styled.View`
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  padding-horizontal: 24px;
`;

const IconCircle = styled.View`
  width: 92px;
  height: 92px;
  border-radius: 30px;
  background-color: rgba(255, 255, 255, 0.16);
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.2);
`;

const HeaderTitle = styled.Text`
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 10px;
`;

const HeaderSubtitle = styled.Text`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 22px;
  padding-horizontal: 16px;
`;

const CardContainer = styled.View`
  flex: 1;
  margin-top: -40px;
  padding-horizontal: 22px;
`;

const Card = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 30px;
  padding: 26px 22px;
  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.08;
  shadow-radius: 20px;
  elevation: 10;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const InfoText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 22px;
`;

const EmailText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  text-align: center;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const OTPContainer = styled.View`
  flex-direction: row;
  width: 100%;
  gap: 4px;
  justify-content: space-between;
  margin-top: 24px;
  margin-bottom: 24px;
`;

const OTPInput = styled.TextInput<{
  isFilled: boolean;
  hasError: boolean;
}>`
  flex: 1;
  height: 50px;
  width: 60px;
  border-radius: 14px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};

  border-width: 1.5px;

  border-color: ${({ theme, hasError, isFilled }: any) =>
    hasError ? "#ef4444" : isFilled ? "#8b5cf6" : theme.colors.border};

  background-color: ${({ theme, isFilled }: any) =>
    isFilled ? theme.colors.surfaceLight : theme.colors.background};
`;

const ErrorText = styled.Text`
  font-size: 13px;
  color: #ef4444;
  text-align: center;
  margin-top: 4px;
  margin-bottom: 16px;
  font-weight: 600;
`;

const ResendWrapper = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-bottom: 26px;
`;

const ResendInfoText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ResendButton = styled.TouchableOpacity`
  margin-left: 4px;
`;

const ResendButtonText = styled.Text`
  font-size: 14px;
  color: #8b5cf6;
  font-weight: 700;
`;

const TimerText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 700;
  margin-left: 6px;
`;

const VerifyButton = styled.TouchableOpacity`
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 14px;
  shadow-color: #8b5cf6;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.28;
  shadow-radius: 18px;
  elevation: 8;
`;

const VerifyButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.4px;
`;

const ChangeEmailButton = styled.TouchableOpacity`
  height: 54px;
  border-radius: 18px;
  border-width: 1.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const ChangeEmailText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;
