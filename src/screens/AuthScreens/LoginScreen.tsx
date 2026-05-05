import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../services/authService";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../context/ContextAPI";
import { useAppTheme } from "../../context/ThemeContext";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigation = useNavigation();
  const { login: authLogin } = useAuth();
  const { isDark } = useAppTheme();

  useEffect(() => {
    const fetchDeviceToken = async () => {
      const deviceToken = await SecureStore.getItemAsync("deviceToken");
      console.log("Device Token :- ", deviceToken);
    };
    fetchDeviceToken();
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;

    if (!email) newErrors.email = "Email is required";
    else if (!emailReg.test(email)) newErrors.email = "Invalid email";

    if (!password) newErrors.password = "Password required";
    else if (password.length < 6) newErrors.password = "Min 6 characters";

    setEmailError(newErrors.email || null);
    setPasswordError(newErrors.password || null);

    return Object.keys(newErrors).length === 0;
  };

  const { mutateAsync: loginMutation, isPending: isLoading } = useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      console.log(result);
      const refreshToken = result?.data?.refreshToken;
      const accessToken = result?.data?.accessToken;
      const userId = result?.data?.patient?.id;
      console.log("Refresh Token :- ", refreshToken);
      console.log("User Id From Login Screen :- ", userId);
      await SecureStore.setItemAsync("authToken", String(refreshToken));
      await SecureStore.setItemAsync("accessToken", String(accessToken));
      await SecureStore.setItemAsync("userId", String(userId));
      await authLogin();

      Toast.show({
        type: "success",
        text1: "Hurrahhh!!! 🥳",
        text2: `LoggedIn Successfully.`,
      });
    },
    onError: (error: any) => {
      console.log("Login Screen Displayed :-", error);
      Toast.show({
        type: "error",
        text1: "Login Failed.",
        text2: `${error.message}`,
      });
    },
  });

  const handleLogin = async () => {
    const deviceToken = await SecureStore.getItemAsync("deviceToken");

    const formData = {
      email: email,
      password: password,
      deviceToken: deviceToken,
    };

    if (!validateForm()) {
      Toast.show({
        type: "error",
        text1: "Invalid input",
        text2: "Enter Valid Inputs to Login!",
      });
      return;
    }

    try {
      await loginMutation(formData);
    } catch (error) {
    } finally {
    }
  };

  return (
    <Container>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <InnerContainer>
          <Header>
            <BackgroundBlob />

            <LogoCircle>
              <LogoText>🛡️</LogoText>
            </LogoCircle>

            <Title>HealthVault</Title>
            <Subtitle>Secure. Simple. Powerful.</Subtitle>
          </Header>

          <CenterWrapper>
            <FormCard>
              <InputGroup>
                <Label>Email</Label>
                <InputWrapper>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <StyledInput
                    placeholder="name@example.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      setEmailError("");
                    }}
                    autoCapitalize="none"
                  />
                </InputWrapper>
                {emailError && <ErrorText>{emailError}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Password</Label>
                <InputWrapper>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="#64748b"
                  />
                  <StyledInput
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      setPasswordError("");
                    }}
                    autoCapitalize
                  />
                </InputWrapper>
                {passwordError && <ErrorText>{passwordError}</ErrorText>}
              </InputGroup>

              <ForgotBtn
                onPress={() => navigation.navigate("ForgotPassword" as never)}
              >
                <ForgotText>Forgot Password?</ForgotText>
              </ForgotBtn>

              <LoginButton
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: "#fff" }}>Signing In...</Text>
                  </>
                ) : (
                  <LoginButtonText>Sign In</LoginButtonText>
                )}
              </LoginButton>
            </FormCard>
          </CenterWrapper>

          <Footer>
            <FooterText>Don’t have an account?</FooterText>
            <SignupLink onPress={() => navigation.navigate("Signup" as never)}>
              <SignupText> Sign up</SignupText>
            </SignupLink>
          </Footer>
        </InnerContainer>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default LoginScreen;

const Container = styled.View`
  flex: 1;
  padding: 60px 0;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const InnerContainer = styled.View`
  flex: 1;
  padding: 24px;
`;

const Header = styled.View`
  align-items: center;
`;

const BackgroundBlob = styled.View`
  position: absolute;
  width: 350px;
  height: 350px;
  border-radius: 175px;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  top: -150px;
  right: -100px;
  z-index: -1;
`;

const LogoCircle = styled.View`
  width: 90px;
  height: 90px;
  border-radius: 30px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-offset: 0px 10px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 10;
`;

const Title = styled.Text`
  font-size: 34px;
  font-weight: 900;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  letter-spacing: -1px;
`;

const Subtitle = styled.Text`
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-weight: 400;
`;

const CenterWrapper = styled.View`
  flex-grow: 1;
  justify-content: center;
`;

const FormCard = styled.View`
  align-self: center;
  width: 92%;
  max-width: 380px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 22px;
  border-radius: 24px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.05;
  shadow-radius: 20px;
  elevation: 6;
`;

const InputGroup = styled.View`
  margin-bottom: 16px;
`;

const Label = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 8px;
  margin-left: 4px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }: any) => theme.colors.border};
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ForgotBtn = styled.TouchableOpacity`
  align-self: flex-end;
  margin-top: -8px;
  margin-bottom: 10px;
`;

const ForgotText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.primary};
  font-weight: 700;
`;

const LoginButton = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.textPrimary};
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.textPrimary};
  shadow-opacity: 0.25;
  shadow-radius: 10px;
`;

const LoginButtonText = styled.Text`
  color: ${({ theme }: any) => theme.colors.background};
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.5px;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
`;

const FooterText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-size: 15px;
`;

const SignupText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 800;
  font-size: 15px;
`;

const LogoText = styled.Text`
  font-size: 42px;
  text-shadow: 0px 4px 10px rgba(59, 130, 246, 0.3);
`;

const SignupLink = styled.TouchableOpacity``;

const ErrorText = styled.Text`
  color: #ef4444; /* Modern soft red */
  font-size: 12px;
  font-weight: 600;
  margin-left: 4px;
`;
