import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { login, createSession } from "../services/authService";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../context/AuthContext";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigation = useNavigation();
  const { login: authLogin } = useAuth();

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

  const sessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: async (result) => {
      console.log(result);
      const sessionData = result?.data || result;
      console.log("Session Id :- ", sessionData.id);
      const userId = sessionData.userId;
      await authLogin(String(sessionData.id), String(userId));
    },
    onError: (error: any) => {
      console.log(error.message);
      Toast.show({
        type: "error",
        text1: "Session Error",
        text2: error.message || "Failed to create session",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      console.log(result);
      const token = result?.data?.token;
      console.log("Token :- ", token);
      await SecureStore.setItemAsync("authToken", String(token));
      Toast.show({
        type: "success",
        text1: "Hurrahhh!!! 🥳",
        text2: `LoggedIn Successfully.`,
      });
      sessionMutation.mutate(String(token));
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
    const formData = {
      email: email,
      password: password,
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
      await loginMutation.mutateAsync(formData);
    } catch (error) {
    } finally {
    }
  };

  return (
    <Container>
      <StatusBar barStyle="dark-content" />

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
                    onChangeText={setEmail}
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
                    onChangeText={setPassword}
                    autoCapitalize
                  />
                </InputWrapper>
                {passwordError && <ErrorText>{passwordError}</ErrorText>}
              </InputGroup>

              <ForgotBtn>
                <ForgotText>Forgot Password?</ForgotText>
              </ForgotBtn>

              <LoginButton onPress={handleLogin} activeOpacity={0.9}>
                <LoginButtonText>Sign In</LoginButtonText>
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
  background-color: #ffffff;
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
  background-color: #eff6ff;
  top: -150px;
  right: -100px;
  z-index: -1;
`;

const LogoCircle = styled.View`
  width: 90px;
  height: 90px;
  border-radius: 30px;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  shadow-color: #3b82f6;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 10;
`;

const Title = styled.Text`
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -1px;
`;

const Subtitle = styled.Text`
  font-size: 15px;
  color: #64748b;
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
  background-color: #ffffff;
  padding: 22px;
  border-radius: 24px;
  border-width: 1px;
  border-color: #f1f5f9;
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
  color: #1e293b;
  margin-bottom: 8px;
  margin-left: 4px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8fafc;
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  color: #0f172a;
`;

const ForgotBtn = styled.TouchableOpacity`
  align-self: flex-end;
  margin-top: -8px;
  margin-bottom: 10px;
`;

const ForgotText = styled.Text`
  font-size: 14px;
  color: #3b82f6;
  font-weight: 700;
`;

const LoginButton = styled.TouchableOpacity`
  background-color: #0f172a;
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  shadow-color: #0f172a;
  shadow-opacity: 0.25;
  shadow-radius: 10px;
`;

const LoginButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.5px;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
`;

const FooterText = styled.Text`
  color: #64748b;
  font-size: 15px;
`;

const SignupText = styled.Text`
  color: #0f172a;
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
