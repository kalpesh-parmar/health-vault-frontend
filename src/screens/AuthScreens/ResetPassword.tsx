import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthStackParamList } from "../../navigation/types";
import Toast from "react-native-toast-message";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "../../services/authService";
import ModernLoader from "../../components/shared/Loader";
import { useAppTheme } from "../../context/ThemeContext";

type StrengthLevel = "none" | "weak" | "fair" | "good" | "strong";

const getStrength = (password: string): StrengthLevel => {
  if (!password) return "none";

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score === 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";

  return "strong";
};

const strengthConfig: Record<
  StrengthLevel,
  { label: string; color: string; filled: number }
> = {
  none: {
    label: "Password strength",
    color: "#e2e8f0",
    filled: 0,
  },
  weak: {
    label: "Weak — add more variety",
    color: "#ef4444",
    filled: 1,
  },
  fair: {
    label: "Fair — getting there",
    color: "#f59e0b",
    filled: 2,
  },
  good: {
    label: "Good — almost strong!",
    color: "#10b981",
    filled: 3,
  },
  strong: {
    label: "Strong — great password",
    color: "#10b981",
    filled: 4,
  },
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({
    password: "",
    confirm: "",
  });

  // const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();

  // const email = route.params.email;

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const { isDark, theme } = useAppTheme();

  const strength = getStrength(password);

  const { label, color, filled } = strengthConfig[strength];

  const { mutateAsync: resetPasswordMutation, isPending: isLoading } =
    useMutation({
      mutationFn: resetPassword,

      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: "Password Reset Successfully.",
          text2: "You can now log in with your new password.",
        });

        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      },

      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: "Failed to Reset Password.",
          text2: `${error.message}`,
        });

        setErrors((e) => ({
          ...e,
          password: "Invalid Password",
        }));
      },

      onMutate: () => {
        <ModernLoader visible={true} />;
      },

      onSettled: () => {
        <ModernLoader visible={false} />;
      },
    });

  const handleReset = async () => {
    const newErrors = {
      password: "",
      confirm: "",
    };

    if (!password) {
      newErrors.password = "Please enter a new password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirm = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirm = "Passwords do not match.";
    }

    setErrors(newErrors);

    if (newErrors.password || newErrors.confirm) return;

    // await resetPasswordMutation({
    //   email,
    //   password,
    // });

    Toast.show({
      type: "success",
      text1: "Password Updated",
      text2: "You can now log in with your new password.",
    });

    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
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

          <HeaderContent>
            <LockCircle>
              <MaterialCommunityIcons
                name="lock-reset"
                size={42}
                color="#ffffff"
              />
            </LockCircle>

            <HeaderTitle>Reset Password</HeaderTitle>

            <HeaderSubtitle>
              Create a secure new password for your account
            </HeaderSubtitle>
          </HeaderContent>
        </TopGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <CardWrapper>
            <Card>
              <InfoText>
                Your new password must be different from your previously used
                password.
              </InfoText>

              <FieldContainer>
                <FieldLabel>New Password</FieldLabel>

                <InputWrapper hasError={!!errors.password}>
                  <InputIconContainer>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#8b5cf6"
                    />
                  </InputIconContainer>

                  <StyledInput
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);

                      if (errors.password) {
                        setErrors((e) => ({
                          ...e,
                          password: "",
                        }));
                      }
                    }}
                  />

                  <EyeButton onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </EyeButton>
                </InputWrapper>

                {!!errors.password && <ErrorText>{errors.password}</ErrorText>}

                {password.length > 0 && (
                  <>
                    <StrengthBarRow>
                      {[0, 1, 2, 3].map((i) => (
                        <StrengthBar
                          key={i}
                          active={i < filled}
                          activeColor={color}
                        />
                      ))}
                    </StrengthBarRow>

                    <StrengthText strengthColor={color}>{label}</StrengthText>
                  </>
                )}
              </FieldContainer>

              <FieldContainer>
                <FieldLabel>Confirm Password</FieldLabel>

                <InputWrapper hasError={!!errors.confirm}>
                  <InputIconContainer>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#8b5cf6"
                    />
                  </InputIconContainer>

                  <StyledInput
                    placeholder="Confirm new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text);

                      if (errors.confirm) {
                        setErrors((e) => ({
                          ...e,
                          confirm: "",
                        }));
                      }
                    }}
                  />

                  <EyeButton onPress={() => setShowConfirm((prev) => !prev)}>
                    <Ionicons
                      name={showConfirm ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </EyeButton>
                </InputWrapper>

                {!!errors.confirm && <ErrorText>{errors.confirm}</ErrorText>}

                {confirmPassword.length > 0 &&
                  password !== confirmPassword &&
                  !errors.confirm && (
                    <MismatchText>Passwords do not match</MismatchText>
                  )}
              </FieldContainer>

              <ResetButton
                activeOpacity={0.9}
                onPress={handleReset}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#ec4899", "#8b5cf6", "#6366f1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: "100%",
                    paddingVertical: 17,
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
                    <ResetButtonText>Reset Password</ResetButtonText>
                  )}
                </LinearGradient>
              </ResetButton>
            </Card>
          </CardWrapper>
        </KeyboardAvoidingView>
      </Container>
    </>
  );
};

export default ResetPassword;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const TopGradient = styled(LinearGradient)`
  height: 340px;
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
  width: 180px;
  height: 180px;
  border-radius: 90px;
  background-color: rgba(255, 255, 255, 0.06);
  bottom: -60px;
  left: -50px;
`;

const PatternDots = styled.View`
  position: absolute;
  width: 90px;
  height: 90px;
  top: 75px;
  left: 24px;
  border-width: 2px;
  border-style: dotted;
  border-color: rgba(255, 255, 255, 0.4);
  border-radius: 18px;
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

const HeaderContent = styled.View`
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  padding-horizontal: 24px;
`;

const LockCircle = styled.View`
  width: 96px;
  height: 96px;
  border-radius: 32px;
  background-color: rgba(255, 255, 255, 0.15);
  justify-content: center;
  align-items: center;
  margin-bottom: 22px;
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
  color: rgba(255, 255, 255, 0.88);
  text-align: center;
  line-height: 22px;
`;

const CardWrapper = styled.View`
  flex: 1;
  margin-top: -40px;
  padding-horizontal: 22px;
`;

const Card = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};

  border-radius: 30px;
  padding: 26px 22px;

  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};

  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.08;
  shadow-radius: 20px;
  elevation: 10;
`;

const InfoText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};

  text-align: center;
  line-height: 22px;
  margin-bottom: 26px;
`;

const FieldContainer = styled.View`
  margin-bottom: 22px;
`;

const FieldLabel = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};

  margin-bottom: 10px;
  margin-left: 4px;
`;

const InputWrapper = styled.View<{
  hasError: boolean;
}>`
  flex-direction: row;
  align-items: center;

  height: 58px;

  border-radius: 18px;

  background-color: ${({ theme }: any) => theme.colors.surfaceLight};

  border-width: 1.5px;

  border-color: ${({ hasError, theme }: any) =>
    hasError ? "#ef4444" : theme.colors.border};

  padding-horizontal: 14px;
`;

const InputIconContainer = styled.View`
  margin-right: 10px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const EyeButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  margin-left: 4px;
  font-weight: 600;
`;

const MismatchText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  margin-left: 4px;
  font-weight: 600;
`;

const StrengthBarRow = styled.View`
  flex-direction: row;
  gap: 6px;
  margin-top: 12px;
`;

const StrengthBar = styled.View<{
  active: boolean;
  activeColor: string;
}>`
  flex: 1;
  height: 5px;
  border-radius: 999px;

  background-color: ${({ active, activeColor, theme }: any) =>
    active ? activeColor : theme.colors.border};
`;

const StrengthText = styled.Text<{
  strengthColor: string;
}>`
  font-size: 12px;
  font-weight: 700;

  color: ${({ strengthColor }: any) => strengthColor};

  margin-top: 8px;
`;

const ResetButton = styled.TouchableOpacity`
  width: 100%;
  border-radius: 18px;
  overflow: hidden;

  margin-top: 6px;

  shadow-color: #8b5cf6;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.28;
  shadow-radius: 18px;
  elevation: 8;
`;

const ResetButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.4px;
`;
