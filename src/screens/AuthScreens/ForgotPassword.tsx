import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "../../navigation/types";
import { sendForgotPasswordOTP } from "../../services/authService";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import ModernLoader from "../../components/shared/Loader";
import { useAppTheme } from "../../context/ThemeContext";

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const { isDark, theme } = useAppTheme();

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onKeyboardShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const subShow = Keyboard.addListener(showEvent, onKeyboardShow);
    const subHide = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const { mutateAsync: forgotPasswordMutation, isPending: isLoading } =
    useMutation({
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
    if (isLoading) return <ModernLoader visible={false} />;

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
      <StatusBar style="light" />

      <Container>
        <GradientBackground
          colors={["#ff4f9a", "#7b61ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <PatternCircleTop />
          <PatternCircleBottom />
          <PatternBlob />
          <SmallDotOne />
          <SmallDotTwo />

          <Header>
            <BackButton onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </BackButton>
          </Header>

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
              <TopSection>
                <LogoContainer>
                  <LogoCircle>
                    <MaterialCommunityIcons
                      name="shield-lock-outline"
                      size={42}
                      color="#ff4f9a"
                    />
                  </LogoCircle>
                </LogoContainer>

                <AppTitle>HealthVault</AppTitle>

                <AppSubtitle>
                  Secure recovery for your medical account
                </AppSubtitle>
              </TopSection>

              <BottomCard>
                <CardTitle>Forgot Password</CardTitle>

                <CardSubtitle>
                  Enter your registered email address and we’ll send an OTP to
                  reset your password securely.
                </CardSubtitle>

                <InputContainer>
                  <InputWrapper hasError={!!emailError}>
                    <Ionicons name="mail-outline" size={20} color="#8a8fa3" />

                    <StyledInput
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={(text: string) => {
                        setEmail(text);

                        if (emailError) {
                          setEmailError("");
                        }
                      }}
                    />
                  </InputWrapper>

                  {!!emailError && <ErrorText>{emailError}</ErrorText>}
                </InputContainer>

                <SendButton
                  onPress={handleSendOTP}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  <ButtonGradient
                    colors={["#ff4f9a", "#7b61ff"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ButtonText>Send OTP</ButtonText>
                    )}
                  </ButtonGradient>
                </SendButton>

                <BottomRow>
                  <BottomText>Remember your password?</BottomText>

                  <LoginButton onPress={() => navigation.goBack()}>
                    <LoginText> Login</LoginText>
                  </LoginButton>
                </BottomRow>
              </BottomCard>
          </ScrollView>
        </GradientBackground>
      </Container>
    </>
  );
};

export default ForgotPasswordScreen;

const Container = styled.View`
  flex: 1;
`;

const GradientBackground = styled(LinearGradient)`
  flex: 1;
`;

const PatternCircleTop = styled.View`
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 130px;
  background-color: rgba(255, 255, 255, 0.08);
  top: -70px;
  right: -80px;
`;

const PatternCircleBottom = styled.View`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 110px;
  background-color: rgba(255, 255, 255, 0.05);
  bottom: 140px;
  left: -90px;
`;

const PatternBlob = styled.View`
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 90px;
  background-color: rgba(255, 255, 255, 0.06);
  top: 160px;
  left: -40px;
`;

const SmallDotOne = styled.View`
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  background-color: rgba(255, 255, 255, 0.3);
  top: 120px;
  right: 60px;
`;

const SmallDotTwo = styled.View`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.25);
  top: 180px;
  left: 80px;
`;

const Header = styled.View`
  padding-top: 60px;
  padding-horizontal: 24px;
`;

const BackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.16);
  justify-content: center;
  align-items: center;
`;

const TopSection = styled.View`
  align-items: center;
  margin-top: 30px;
`;

const LogoContainer = styled.View`
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 12;
`;

const LogoCircle = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 34px;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
`;

const AppTitle = styled.Text`
  font-size: 34px;
  font-weight: 800;
  color: #ffffff;
  margin-top: 18px;
`;

const AppSubtitle = styled.Text`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8px;
  text-align: center;
`;

const BottomCard = styled.View`
  flex: 1;
  margin-top: 40px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
  padding-horizontal: 26px;
  padding-top: 34px;
`;

const CardTitle = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const CardSubtitle = styled.Text`
  font-size: 14px;
  line-height: 24px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 10px;
  margin-bottom: 30px;
`;

const InputContainer = styled.View`
  margin-bottom: 12px;
`;

const InputWrapper = styled.View<{ hasError: boolean }>`
  width: 100%;
  height: 58px;
  border-radius: 18px;
  border-width: 1px;
  border-color: ${({ hasError }: { hasError: boolean }) =>
    hasError ? "#ef4444" : "#e5e7eb"};
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  margin-top: 8px;
  margin-left: 4px;
  font-weight: 600;
`;

const SendButton = styled.TouchableOpacity`
  margin-top: 18px;
  border-radius: 18px;
  overflow: hidden;
  shadow-color: #7b61ff;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.3;
  shadow-radius: 18px;
  elevation: 10;
`;

const ButtonGradient = styled(LinearGradient)`
  height: 58px;
  justify-content: center;
  align-items: center;
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
`;

const BottomRow = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 28px;
`;

const BottomText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const LoginButton = styled.TouchableOpacity``;

const LoginText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ff4f9a;
`;
