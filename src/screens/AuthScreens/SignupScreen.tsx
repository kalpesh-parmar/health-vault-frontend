// src/screens/AuthScreens/SignupScreen.tsx
import React from "react";
import { KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import {
  SignupStickyBar,
  SignupCollapsibleHeader,
  STICKY_BAR_HEIGHT,
} from "../../components/Signup/SignupHeader";
import SignupForm from "../../components/Signup/SignupForm";

const AnimatedScrollView = Animated.ScrollView;

const SignupScreen = () => {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#F4F1FE" }}
      >
        {/* ════ FIXED STICKY BAR — gradient, floats above scroll ════ */}
        <SignupStickyBar scrollY={scrollY} />

        {/* ════ SCROLL VIEW ════ */}
        <AnimatedScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ top: STICKY_BAR_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Collapsible gradient header ── */}
          <SignupCollapsibleHeader scrollY={scrollY} />

          {/* ── Form Section with Terms & conditions Bottom Sheet ── */}
          <SignupForm />
        </AnimatedScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default SignupScreen;
