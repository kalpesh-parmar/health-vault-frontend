import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { AuthStackParamList } from "../../navigation/types";
import Toast from "react-native-toast-message";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "../../services/authService";
import ModernLoader from "../../components/shared/Loader";
import { ActivityIndicator } from "react-native";
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
  none: { label: "Password strength", color: "#e2e8f0", filled: 0 },
  weak: { label: "Weak — add more variety", color: "#ef4444", filled: 1 },
  fair: { label: "Fair — getting there", color: "#f59e0b", filled: 2 },
  good: { label: "Good — almost strong!", color: "#10b981", filled: 3 },
  strong: { label: "Strong — great password", color: "#10b981", filled: 4 },
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirm: "" });

  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const email = route.params.email;

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { isDark, theme } = useAppTheme();

  const strength = getStrength(password);
  const { label, color, filled } = strengthConfig[strength];

  const {mutateAsync: resetPasswordMutation, isPending: isLoading} = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Password Reset Successfully.",
        text2: "You can now log in with your new password.",
      });
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Failed to Reset Password.",
        text2: `${error.message}`,
      });
      setErrors((e) => ({ ...e, password: "Invalid Password" }));
    },
    onMutate: () => {
      <ModernLoader visible={true} />;
    },
    onSettled: () => {
      <ModernLoader visible={false} />;
    },
  });

  const handleReset = async () => {
    const newErrors = { password: "", confirm: "" };

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

    await resetPasswordMutation({ email, password });

    Toast.show({
      type: "success",
      text1: "Password Updated",
      text2: "You can now log in with your new password.",
    });

    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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
              name="lock-reset"
              size={30}
              color={theme.colors.primary}
            />
          </IconCircle>

          <ScreenTitle>Create new password</ScreenTitle>
          <ScreenSubtitle>
            Must be at least 8 characters and different from your previous
            password.
          </ScreenSubtitle>

          <FieldLabel>New password</FieldLabel>
          <InputRow>
            <StyledInput
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: "" }));
              }}
              hasError={!!errors.password}
            />
            <EyeButton onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#94a3b8"
              />
            </EyeButton>
          </InputRow>
          {!!errors.password && <ErrorText>{errors.password}</ErrorText>}

          {password.length > 0 && (
            <StrengthRow>
              {[0, 1, 2, 3].map((i) => (
                <StrengthSegment
                  key={i}
                  active={i < filled}
                  activeColor={color}
                />
              ))}
            </StrengthRow>
          )}
          {password && (
            <StrengthLabel strengthColor={color}>{label}</StrengthLabel>
          )}

          <FieldLabel>Confirm password</FieldLabel>
          <InputRow>
            <StyledInput
              placeholder="Re-enter password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={(text: string) => {
                setConfirmPassword(text);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: "" }));
              }}
              hasError={!!errors.confirm}
            />
            <EyeButton onPress={() => setShowConfirm((v) => !v)}>
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#94a3b8"
              />
            </EyeButton>
          </InputRow>
          {!!errors.confirm && <ErrorText>{errors.confirm}</ErrorText>}

          {confirmPassword.length > 0 &&
            password !== confirmPassword &&
            !errors.confirm && (
              <MismatchHint>Passwords do not match</MismatchHint>
            )}

          <PrimaryButton onPress={handleReset} activeOpacity={0.85} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <PrimaryButtonText>Reset password</PrimaryButtonText>}
          </PrimaryButton>
        </Body>
      </Container>
    </>
  );
};

export default ResetPassword;

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
  margin-bottom: 28px;
`;

const FieldLabel = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
`;

const InputRow = styled.View`
  position: relative;
  justify-content: center;
  margin-bottom: 6px;
`;

const StyledInput = styled.TextInput<{ hasError: boolean }>`
  width: 100%;
  height: 52px;
  border-radius: 14px;
  border-width: 1.5px;
  border-color: ${({ hasError, theme }: any) => (hasError ? theme.colors.error : theme.colors.border)};
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  padding: 0 48px 0 16px;
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const EyeButton = styled.TouchableOpacity`
  position: absolute;
  right: 14px;
  padding: 6px;
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.error};
  margin-bottom: 10px;
  margin-left: 4px;
`;

const MismatchHint = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.error};
  margin-bottom: 10px;
  margin-left: 4px;
`;

const StrengthRow = styled.View`
  flex-direction: row;
  gap: 6px;
  margin-top: 10px;
  margin-bottom: 6px;
`;

const StrengthSegment = styled.View<{ active: boolean; activeColor: string }>`
  flex: 1;
  height: 4px;
  border-radius: 99px;
  background-color: ${({ active, activeColor, theme }: any) =>
    active ? activeColor : theme.colors.border};
`;

const StrengthLabel = styled.Text<{ strengthColor: string }>`
  font-size: 12px;
  color: ${({ strengthColor }: any) => strengthColor};
  margin-bottom: 20px;
  font-weight: 600;
`;

const PrimaryButton = styled.TouchableOpacity`
  width: 100%;
  height: 54px;
  border-radius: 16px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  margin-top: auto;
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
