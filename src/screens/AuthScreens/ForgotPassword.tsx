import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "../../navigation/types";
import { sendForgotPasswordOTP, verifyOTP } from "../../services/authService";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { ActivityIndicator } from "react-native";
import ModernLoader from "../../components/shared/Loader";
import { useAppTheme } from "../../context/ThemeContext";

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { isDark, theme } = useAppTheme();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const {mutateAsync: forgotPasswordMutation, isPending: isLoading} = useMutation({
    mutationFn: sendForgotPasswordOTP,
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "OTP Sent Successfully.",
        text2: "Check your email for OTP.",
      });
      navigation.navigate("VerifyOTP", { email });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Failed to Send OTP.",
        text2: `${error.message}`,
      });
      setEmailError("Invalid Email ID");
    },
  });

  const handleSendOTP = () => {
    if(isLoading) return <ModernLoader visible={false} />
    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    const payload = {
      email: email.trim(),
    };
    forgotPasswordMutation(payload);
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
              name="email-outline"
              size={30}
              color={theme.colors.primary}
            />
          </IconCircle>

          <ScreenTitle>Forgot password?</ScreenTitle>
          <ScreenSubtitle>
            Enter your registered email address and we'll send a one-time
            password to verify your identity.
          </ScreenSubtitle>

          <FieldLabel>Registered email</FieldLabel>
          <StyledInput
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text: string) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
            hasError={!!emailError}
          />
          {!!emailError && <ErrorText>{emailError}</ErrorText>}

          <PrimaryButton onPress={handleSendOTP} activeOpacity={0.85} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <PrimaryButtonText>Send OTP</PrimaryButtonText>}
          </PrimaryButton>

          <BackToLoginRow>
            <BackToLoginText>Remember your password? </BackToLoginText>
            <BackToLoginLink onPress={() => navigation.goBack()}>
              <BackToLoginLinkText>Log in</BackToLoginLinkText>
            </BackToLoginLink>
          </BackToLoginRow>
        </Body>
      </Container>
    </>
  );
};

export default ForgotPasswordScreen;

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
  background-color: ${({ theme }: any) => theme.colors.iconBox};
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

const FieldLabel = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
`;

const StyledInput = styled.TextInput<{ hasError: boolean }>`
  width: 100%;
  height: 52px;
  border-radius: 14px;
  border-width: 1.5px;
  border-color: ${({ hasError, theme }: any) => (hasError ? theme.colors.error : theme.colors.border)};
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  padding: 0 16px;
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 6px;
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.error};
  margin-bottom: 14px;
  margin-left: 4px;
`;

const PrimaryButton = styled.TouchableOpacity`
  width: 100%;
  height: 54px;
  border-radius: 16px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  margin-top: 24px;
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

const BackToLoginRow = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
`;

const BackToLoginText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const BackToLoginLink = styled.TouchableOpacity``;

const BackToLoginLinkText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
`;
