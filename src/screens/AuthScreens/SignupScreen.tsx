// src/screens/AuthScreens/SignupScreen.tsx
import React, { useState, useEffect } from "react";
import { Platform, StatusBar, Keyboard, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";

import {
  SignupStickyBar,
  SignupCollapsibleHeader,
  STICKY_BAR_HEIGHT,
} from "../../components/Signup/SignupHeader";
import SignupForm from "../../components/Signup/SignupForm";
import { requestOTP } from "../../services/authService";
import { AuthStackParamList } from "../../types/navigation";

const AnimatedScrollView = Animated.ScrollView;

type SignupScreenRouteProp = RouteProp<AuthStackParamList, "Signup">;

const SignupScreen = () => {
  const scrollY = useSharedValue(0);
  const route = useRoute<SignupScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const routeEmail = route.params?.email || "";

  const [email, setEmail] = useState(routeEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardPadding(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // const { mutateAsync: sendSignupOTP, isPending } = useMutation({
  //   mutationFn: requestOTP,
  //   onSuccess: () => {
  //     Toast.show({
  //       type: "success",
  //       text1: "OTP Sent Successfully.",
  //       text2: "Check your email for OTP.",
  //     });

  //     navigation.navigate("VerifyOTP", { email: email.trim(), fromSignup: true });
  //   },
  //   onError: (error: any) => {
  //     Toast.show({
  //       type: "error",
  //       text1: "Failed to Send OTP.",
  //       text2: `${error.message}`,
  //     });
  //     setEmailError(`${error.message}`);
  //   },
  // });

  // const handleRequestOTP = async () => {
  //   const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
  //   if (!email) {
  //     setEmailError("Email is required");
  //     return;
  //   } else if (!emailReg.test(email)) {
  //     setEmailError("Invalid email");
  //     return;
  //   }

  //   try {
  //     await sendSignupOTP({ email: email.trim() });
  //   } catch (error) {}
  // };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View
        style={{ flex: 1, backgroundColor: "#F4F1FE", paddingBottom: keyboardPadding }}
      >
        <SignupStickyBar scrollY={scrollY} heading="Create Account" subHeading="Join us — it only takes a minute" />

        <AnimatedScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ top: STICKY_BAR_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <SignupCollapsibleHeader scrollY={scrollY} heading="Create Account" subHeading="Join us — it only takes a minute" />

            {/* OTP VERIFICATION FLOW (COMMENTED OUT FOR DIRECT SIGNUP) */}
            {/*
            <VerificationCard>
              <SectionTag>Email Verification</SectionTag>
              <VerificationDesc>
                Please verify your email address to continue with registration.
              </VerificationDesc>

              <InputGroup>
                <InputWrapper>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                  <StyledInput
                    placeholder="Email Address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      setEmailError(null);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </InputWrapper>
                {emailError && <ErrorText>{emailError}</ErrorText>}
              </InputGroup>

              <VerifyButton activeOpacity={0.9} onPress={handleRequestOTP} disabled={isPending}>
                <VerifyGradient colors={["#7C3AED", "#DB2777"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <VerifyButtonText>Send OTP</VerifyButtonText>
                  )}
                </VerifyGradient>
              </VerifyButton>
              
              <Footer>
                <FooterText>Already have an account?</FooterText>
                <LoginLink activeOpacity={0.7} onPress={() => navigation.navigate("Login" as never)}>
                  <LoginText> Login</LoginText>
                </LoginLink>
              </Footer>
            </VerificationCard>
            */}

            {/* DIRECT SIGNUP FLOW */}
            <SignupForm />
            
        </AnimatedScrollView>
      </View>
    </>
  );
};

export default SignupScreen;

// Styled components for Email Verification View
// const VerificationCard = styled.View`
//   background-color: #ffffff;
//   border-top-left-radius: 34px;
//   border-top-right-radius: 34px;
//   padding: 34px 20px 40px 20px;
//   flex: 1;
//   shadow-color: #6c3de8;
//   shadow-offset: 0px -3px;
//   shadow-opacity: 0.07;
//   shadow-radius: 18px;
//   elevation: 6;
// `;

// const SectionTag = styled.Text`
//   font-size: 11px;
//   font-weight: 800;
//   color: #a78bfa;
//   text-transform: uppercase;
//   letter-spacing: 1.3px;
//   margin-bottom: 8px;
// `;

// const VerificationDesc = styled.Text`
//   margin-bottom: 28px;
//   font-size: 15px;
//   color: #6b7280;
// `;

// const InputGroup = styled.View`
//   margin-bottom: 24px;
// `;

// const InputWrapper = styled.View`
//   height: 58px;
//   border-width: 1px;
//   border-color: #ececec;
//   border-radius: 16px;
//   background-color: #ffffff;
//   flex-direction: row;
//   align-items: center;
//   padding-horizontal: 16px;
// `;

// const StyledInput = styled.TextInput`
//   flex: 1;
//   margin-left: 12px;
//   font-size: 15px;
//   color: #111827;
// `;

// const ErrorText = styled.Text`
//   color: #ef4444;
//   font-size: 12px;
//   font-weight: 600;
//   margin-top: 6px;
//   margin-left: 4px;
// `;

// const VerifyButton = styled.TouchableOpacity`
//   width: 100%;
//   border-radius: 16px;
//   overflow: hidden;
// `;

// const VerifyGradient = styled(LinearGradient)`
//   height: 58px;
//   justify-content: center;
//   align-items: center;
//   flex-direction: row;
// `;

// const VerifyButtonText = styled.Text`
//   font-size: 16px;
//   font-weight: 700;
//   color: #ffffff;
// `;

// const Footer = styled.View`
//   flex-direction: row;
//   justify-content: center;
//   align-items: center;
//   margin-top: 34px;
// `;

// const FooterText = styled.Text`
//   color: #6b7280;
//   font-size: 14px;
// `;

// const LoginLink = styled.TouchableOpacity``;

// const LoginText = styled.Text`
//   color: #7c3aed;
//   font-size: 14px;
//   font-weight: 700;
// `;
