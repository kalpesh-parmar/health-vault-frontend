import React, { useState, useRef, useEffect } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import Toast from "react-native-toast-message";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";

import { setConfirmationResult } from "../../services/auth.service";
import { resetForceLogout } from "../../services/apiClient";
import { useAppTheme } from "../../context/ThemeContext";
import { AuthStackParamList } from "../../types/navigation";
import { validateMobileNumber } from "../../validations/auth.validation";
import { formatPhoneNumberE164 } from "../../utils/auth.utils";
import PhoneInput from "../../components/auth/PhoneInput";
import AuthButton from "../../components/auth/AuthButton";
import HealthVaultLogo from "../../components/shared/HealthVaultLogo";
import { ENABLE_DUMMY_AUTH, isDummyNumber, getDummyConfirmationResult } from "../../services/dummyAuth.service";

const MobileLoginScreen = () => {
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { isDark, theme } = useAppTheme();

  useEffect(() => {
    console.log("[OTP_LOG] Component Mounted: MobileLoginScreen");
    // Clear any stale force logout state from a previous session
    resetForceLogout();
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardPadding(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0)
    );
    return () => {
      console.log("[OTP_LOG] Component Unmounted: MobileLoginScreen");
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleContinue = async () => {
    if (loading) return; // Prevent duplicate clicks
    Keyboard.dismiss();
    
    if (!validateMobileNumber(mobile)) {
      setMobileError("Please enter a valid 10-digit mobile number");
      return;
    }
    setMobileError(null);
    setLoading(true);

    try {
      const formattedMobile = formatPhoneNumberE164(mobile);
      console.log(`[OTP_LOG] OTP Send Start: Sending OTP to ${formattedMobile}`);
      
      let confirmationResult;
      if (ENABLE_DUMMY_AUTH && isDummyNumber(formattedMobile)) {
        console.log(`[DUMMY_AUTH] Bypassing Firebase and returning dummy confirmation for ${formattedMobile}`);
        confirmationResult = getDummyConfirmationResult();
      } else {
        console.log(`[FIREBASE_AUTH] Using Firebase Phone Auth for ${formattedMobile}`);
        const authInstance = getAuth();
        confirmationResult = await signInWithPhoneNumber(authInstance, formattedMobile);
      }

      console.log(`[OTP_LOG] OTP Send Success: Verification code sent successfully to ${formattedMobile}`);

      // Save confirmation result in service singleton
      setConfirmationResult(confirmationResult);

      Toast.show({
        type: "success",
        text1: "OTP Sent! 💬",
        text2: `A 6-digit code has been sent to ${formattedMobile}`,
      });

      // Navigate to verification screen
      navigation.navigate("OtpVerification", { mobile: formattedMobile });
    } catch (error: any) {
      console.error("Firebase Phone Auth error:", error);
      let errorMessage = "Failed to send verification code. Please try again.";

      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      } else if (error.code === "auth/quota-exceeded") {
        errorMessage = "SMS quota exceeded. Please contact support.";
      } else if (error.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number format.";
      }

      Toast.show({
        type: "error",
        text1: "Verification Failed",
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container themeColor={theme.colors}>
      <StatusBar barStyle="light-content" />



      <View style={{ flex: 1, paddingBottom: keyboardPadding }}>
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
                  <HealthVaultLogo size={80} />
                </LogoContainer>
                <Title>HealthCare</Title>
                <Subtitle>Your Health, Our Priority</Subtitle>
              </TopSection>

              <BottomCard themeColor={theme.colors}>
                <WelcomeText themeColor={theme.colors}>Verify Identity</WelcomeText>
                <DescriptionText themeColor={theme.colors}>
                  Enter your mobile number to receive a secure login OTP
                </DescriptionText>

                <PhoneInput
                  value={mobile}
                  onChangeText={(text) => {
                    setMobile(text);
                    setMobileError(null);
                  }}
                  error={mobileError}
                  disabled={loading}
                />

                <Spacer />

                <AuthButton
                  title="Send Verification Code"
                  onPress={handleContinue}
                  loading={loading}
                />
              </BottomCard>
            </InnerContainer>
          </ScrollView>
        </GradientBackground>
      </View>
    </Container>
  );
};

export default MobileLoginScreen;

const Container = styled.View<{ themeColor: any }>`
  flex: 1;
  background-color: ${(props: { themeColor: any }) => props.themeColor.background};
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
  padding-top: 120px;
  padding-bottom: 36px;
`;

const LogoContainer = styled.View`
  margin-bottom: 18px;
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

const BottomCard = styled.View<{ themeColor: any }>`
  flex: 1;
  justify-content: center;
  background-color: ${(props: { themeColor: any }) => props.themeColor.surface};
  border-top-left-radius: 42px;
  border-top-right-radius: 42px;
  padding-horizontal: 24px;
  padding-vertical: 36px;
`;

const WelcomeText = styled.Text<{ themeColor: any }>`
  font-size: 26px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
`;

const DescriptionText = styled.Text<{ themeColor: any }>`
  margin-top: 6px;
  margin-bottom: 28px;
  font-size: 15px;
  color: ${(props: { themeColor: any }) => props.themeColor.textSecondary};
  line-height: 22px;
`;

const Spacer = styled.View`
  height: 12px;
`;
