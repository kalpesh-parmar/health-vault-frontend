import React, { useState, useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, TextInput } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "../../navigation/types";
import { useMutation } from "@tanstack/react-query";
import { resendOTP, verifyOTP } from "../../services/authService";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../context/ThemeContext";

const OTP_LENGTH = 6;

type verifyOTPRouteProp = RouteProp<AuthStackParamList, "VerifyOTP">;

type verifyOTPProps = {
  route: verifyOTPRouteProp;
};

const VerifyOTP = ({ route }: verifyOTPProps) => {
  const { email } = route?.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(
    Array(OTP_LENGTH).fill(null),
  );

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { isDark, theme } = useAppTheme();

  useEffect(() => {
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

  const { mutateAsync: verifyOTPMutation, isPending: isLoading } = useMutation({
    mutationFn: verifyOTP,
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "OTP Verified Successfully.",
        text2: "Now you can reset your password.",
      });
      navigation.navigate("ResetPassword", { email });
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

  const {mutateAsync: resendOTPMutation, isPending: resendLoading} = useMutation({
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
        <Header>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
          </BackButton>
          <AppNameHeader>HealthVault</AppNameHeader>
          <Spacer />
        </Header>

        <Body>
          <IconCircle>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={30}
              color={theme.colors.success}
            />
          </IconCircle>

          <ScreenTitle>Verify your email</ScreenTitle>
          <ScreenSubtitle>
            Enter the 6-digit code sent to
            <EmailHighlight> {email} </EmailHighlight>. The code expires in 10
            minutes.
          </ScreenSubtitle>

          <OTPRow>
            {otp.map((digit, index) => (
              <OTPCell
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
              />
            ))}
          </OTPRow>

          {!!otpError && <ErrorText>{otpError}</ErrorText>}

          <ResendRow>
            <ResendText>Didn't receive the code?</ResendText>
            {canResend ? (
              <ResendButton onPress={handleResend}>
                {resendLoading ? <ActivityIndicator color={theme.colors.primary} /> : <ResendButtonText> Resend code</ResendButtonText>}
              </ResendButton>
            ) : (
              <TimerText> Resend in {timer}s</TimerText>
            )}
          </ResendRow>

          <PrimaryButton onPress={handleVerify} activeOpacity={0.85} disabled={resendLoading || isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <PrimaryButtonText>Verify OTP</PrimaryButtonText>}
          </PrimaryButton>

          <SecondaryButton onPress={() => navigation.goBack()}>
            <SecondaryButtonText>Change email address</SecondaryButtonText>
          </SecondaryButton>
        </Body>
      </Container>
    </>
  );
};

export default VerifyOTP;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 55px 20px 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: any) => theme.colors.border};
`;

const BackButton = styled.TouchableOpacity`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  justify-content: center;
  align-items: center;
`;

const AppNameHeader = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.primary};
  font-family: "Montserrat_700Bold";
`;

const Spacer = styled.View`
  width: 38px;
`;

const Body = styled.View`
  flex: 1;
  padding: 32px 24px;
`;

const IconCircle = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background-color: ${({ theme }: any) => theme.colors.success + '20'};
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
`;

const ScreenTitle = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 8px;
`;

const ScreenSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  line-height: 22px;
  margin-bottom: 32px;
`;

const EmailHighlight = styled.Text`
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const OTPRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const OTPCell = styled.TextInput<{ isFilled: boolean; hasError: boolean }>`
  width: 46px;
  height: 56px;
  border-radius: 14px;
  border-width: 1.5px;
  border-color: ${({ isFilled, hasError, theme }: any) =>
    hasError ? theme.colors.error : isFilled ? theme.colors.primary : theme.colors.border};
  background-color: ${({ isFilled, theme }: any) =>
    isFilled ? theme.colors.iconBox : theme.colors.surfaceLight};
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.error};
  margin-bottom: 12px;
  margin-left: 2px;
`;

const ResendRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
  margin-bottom: 8px;
`;

const ResendText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ResendButton = styled.TouchableOpacity``;

const ResendButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const TimerText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const PrimaryButton = styled.TouchableOpacity`
  width: 100%;
  height: 54px;
  border-radius: 16px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  margin-top: 28px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 8;
`;

const PrimaryButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
`;

const SecondaryButton = styled.TouchableOpacity`
  width: 100%;
  height: 50px;
  border-radius: 16px;
  border-width: 1.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  justify-content: center;
  align-items: center;
  margin-top: 12px;
`;

const SecondaryButtonText = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;
