import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";

import { login, sendOTP } from "../../services/authService";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../context/ContextAPI";
import { useAppTheme } from "../../context/ThemeContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/navigation";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const { login: authLogin } = useAuth();
  const { isDark } = useAppTheme();

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

  const { mutateAsync: sendLoginOTP, isPending } = useMutation({
    mutationFn: sendOTP,
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "OTP Sent Successfully.",
        text2: "Check your email for OTP.",
      });

      navigation.navigate("VerifyOTP", { email:email.trim(), password: password, fromLogin: true });
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

  const handleLogin = async () => {
    if (!validateForm()) {
      Toast.show({
        type: "error",
        text1: "Invalid input",
        text2: "Enter Valid Inputs to Login!",
      });

      return;
    }

    try {
      await sendLoginOTP({email: email.trim()});
    } catch (error) {
    } finally {
    }
  };

  return (
    <Container>
      <StatusBar barStyle={isDark ? "light-content" : "light-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <GradientBackground
          colors={["#8B5CF6", "#EC4899", "#FF7A59"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <PatternContainer>
            <Svg width="100%" height="100%" viewBox="0 0 400 800">
              <Circle cx="50" cy="100" r="120" fill="rgba(255,255,255,0.08)" />

              <Circle cx="340" cy="60" r="90" fill="rgba(255,255,255,0.06)" />

              <Circle cx="320" cy="240" r="150" fill="rgba(255,255,255,0.05)" />

              <Path
                d="M0 250 Q120 180 220 260 T420 240"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="3"
                fill="transparent"
              />

              <Path
                d="M-20 330 Q130 260 260 340 T460 320"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2"
                fill="transparent"
              />
            </Svg>
          </PatternContainer>

          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <InnerContainer>
              <TopSection>
                <LogoContainer>
                  <LogoCircle>
                    <Ionicons name="heart" size={34} color="#EC4899" />

                    <PlusBadge>
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                    </PlusBadge>
                  </LogoCircle>
                </LogoContainer>

                <Title>HealthCare</Title>

                <Subtitle>Your Health, Our Priority</Subtitle>
              </TopSection>

              <BottomCard>
                <WelcomeText>Welcome Back 👋</WelcomeText>

                <DescriptionText>Sign in to continue</DescriptionText>

                <InputGroup>
                  <InputWrapper>
                    <Ionicons name="mail-outline" size={18} color="#9CA3AF" />

                    <StyledInput
                      placeholder="Email or Phone"
                      placeholderTextColor="#9CA3AF"
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
                  <InputWrapper>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                    />

                    <StyledInput
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      secureTextEntry={!showPassword}
                      onChangeText={(text: string) => {
                        setPassword(text);
                        setPasswordError("");
                      }}
                    />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </InputWrapper>

                  {passwordError && <ErrorText>{passwordError}</ErrorText>}
                </InputGroup>

                <ForgotBtn
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("ForgotPassword" as never)}
                >
                  <ForgotText>Forgot Password?</ForgotText>
                </ForgotBtn>

                <LoginButton
                  activeOpacity={0.9}
                  onPress={handleLogin}
                  disabled={isPending}
                >
                  <LoginGradient
                    colors={["#FF4DA6", "#5B6CFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isPending ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" />

                        <LoadingText>Signing In...</LoadingText>
                      </>
                    ) : (
                      <LoginButtonText>Login</LoginButtonText>
                    )}
                  </LoginGradient>
                </LoginButton>

                <Footer>
                  <FooterText>Don't have an account?</FooterText>

                  <SignupLink
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Signup" as never)}
                  >
                    <SignupText> Sign Up</SignupText>
                  </SignupLink>
                </Footer>
              </BottomCard>
            </InnerContainer>
          </ScrollView>
        </GradientBackground>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default LoginScreen;

const Container = styled.View`
  flex: 1;
  background-color: #ffffff;
`;

const GradientBackground = styled(LinearGradient)`
  flex: 1;
`;

const PatternContainer = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const InnerContainer = styled.View`
  flex: 1;
`;

const TopSection = styled.View`
  align-items: center;
  padding-top: 85px;
  padding-bottom: 36px;
`;

const LogoContainer = styled.View`
  margin-bottom: 18px;
`;

const LogoCircle = styled.View`
  width: 92px;
  height: 92px;
  border-radius: 46px;
  background-color: rgba(255, 255, 255, 0.25);
  justify-content: center;
  align-items: center;
  position: relative;
`;

const PlusBadge = styled.View`
  position: absolute;
  top: 20px;
  right: 18px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #ff4da6;
  justify-content: center;
  align-items: center;
`;

const Title = styled.Text`
  font-size: 34px;
  font-weight: 800;
  color: #ffffff;
`;

const Subtitle = styled.Text`
  margin-top: 6px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
`;

const BottomCard = styled.View`
  flex: 1;
  background-color: #ffffff;
  border-top-left-radius: 42px;
  border-top-right-radius: 42px;
  padding-horizontal: 24px;
  padding-top: 34px;
`;

const WelcomeText = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: #111827;
`;

const DescriptionText = styled.Text`
  margin-top: 6px;
  margin-bottom: 28px;
  font-size: 15px;
  color: #6b7280;
`;

const InputGroup = styled.View`
  margin-bottom: 16px;
`;

const InputWrapper = styled.View`
  height: 58px;
  border-width: 1px;
  border-color: #ececec;
  border-radius: 16px;
  background-color: #ffffff;
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: #111827;
`;

const ForgotBtn = styled.TouchableOpacity`
  align-self: flex-end;
  margin-top: -2px;
  margin-bottom: 24px;
`;

const ForgotText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #ff4da6;
`;

const LoginButton = styled.TouchableOpacity`
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
`;

const LoginGradient = styled(LinearGradient)`
  height: 58px;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;

const LoginButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
`;

const LoadingText = styled(Text)`
  color: #ffffff;
  margin-left: 10px;
  font-weight: 600;
`;

const ContinueText = styled.Text`
  text-align: center;
  margin-top: 28px;
  margin-bottom: 22px;
  font-size: 14px;
  color: #9ca3af;
`;

const SocialContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const SocialButton = styled.TouchableOpacity`
  width: 48%;
  height: 56px;
  border-width: 1px;
  border-color: #ececec;
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
`;

const SocialText = styled.Text`
  margin-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 34px;
`;

const FooterText = styled.Text`
  color: #6b7280;
  font-size: 14px;
`;

const SignupLink = styled.TouchableOpacity``;

const SignupText = styled.Text`
  color: #ff4da6;
  font-size: 14px;
  font-weight: 700;
`;

const ErrorText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  margin-left: 4px;
`;
