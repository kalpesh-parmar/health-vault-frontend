// src/screens/AuthScreens/SignupScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../../services/authService";
import PasswordInfoModal from "../../components/PasswordInfo";
import PhoneInput from "react-native-phone-number-input";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useAppTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import BottomSheet from "../../components/shared/BottomSheet";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import CameraModal from "../../components/shared/CameraModal";
import * as SecureStore from "expo-secure-store";

const AnimatedScrollView = Animated.ScrollView;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Layout Constants ─────────────────────────────────────────────────────────
const MAX_HEADER_HEIGHT = 190;
const MIN_HEADER_HEIGHT = 50;
const SCROLL_RANGE = MAX_HEADER_HEIGHT - MIN_HEADER_HEIGHT;
const CURVE_HEIGHT = 40; // depth of the inverted arch
const STICKY_BAR_HEIGHT = 106;
const AVATAR_SIZE = 96;
const AVATAR_HALF = AVATAR_SIZE / 2;

// ─── Component ────────────────────────────────────────────────────────────────
const SignupScreen = () => {
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  // Form state
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNum, setMobileNum] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [confirmSecureText, setConfirmSecureText] = useState(true);
  const [formattedValue, setFormattedValue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { isDark } = useAppTheme();

  // Profile picture
  const [profileImage, setProfileImage] = useState("");
  const profileSheetRef = useRef<BottomSheetModal>(null);
  const termsSheetRef = useRef<BottomSheetModal>(null);
  const genderSheetRef = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);

  const {
    handleGalleryPick,
    handleOpenCamera,
    selectedImages,
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    takePicture,
  } = useDocumentMedia();

  useEffect(() => {
    if (selectedImages) setProfileImage(selectedImages);
  }, [selectedImages]);

  // ─── Scroll animation ────────────────────────────────────────────────────────
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Header height: MAX → MIN as user scrolls up; back to MAX on scroll down
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, SCROLL_RANGE],
      [MAX_HEADER_HEIGHT, MIN_HEADER_HEIGHT],
      Extrapolate.CLAMP,
    ),
  }));

  // Large title inside header: visible at top, invisible when collapsed
  const largeTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, SCROLL_RANGE * 0.55],
      [1, 0],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [0, -28],
          Extrapolate.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [1, 0.94],
          Extrapolate.CLAMP,
        ),
      },
    ] as const,
  }));

  const stickyBarAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.25, SCROLL_RANGE * 0.75],
      [0, 1],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [-STICKY_BAR_HEIGHT * 0.35, 0],
          Extrapolate.CLAMP,
        ),
      },
    ] as const,
  }));

  // "Create Account" in sticky bar: invisible at top, visible when collapsed
  const stickyTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.35, SCROLL_RANGE * 0.85],
      [0, 1],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [24, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const genderOptions = [
    { label: "Male", value: "male", icon: "male-outline" },
    { label: "Female", value: "female", icon: "female-outline" },
    { label: "Other", value: "other", icon: "male-female-outline" },
  ];

  const handleSelectGender = (selectedGender: string) => {
    setGender(selectedGender);
    setErrors((prev) => ({ ...prev, gender: "" }));
    genderSheetRef.current?.dismiss();
  };

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: { [key: string]: string } = {};
    if (!firstname) e.firstname = "First name is required";
    if (!lastname) e.lastname = "Last name is required";
    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!email) e.email = "Email is required";
    else if (!emailReg.test(email)) e.email = "Invalid email";
    const clean = mobileNum.replace(/\D/g, "");
    if (!clean) e.mobileNum = "Mobile number required";
    else if (clean.length !== 10) e.mobileNum = "Enter valid 10-digit number";
    if (!password) e.password = "Password required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    if (!confirmPassword) e.confirmPassword = "Confirm your password";
    else if (confirmPassword !== password)
      e.confirmPassword = "Passwords do not match";
    if (!gender) e.gender = "Select gender";
    if (!age) e.age = "Select age";
    if (!agreeTerms) e.agreeTerms = "Agree to Terms & Conditions";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Mutation ────────────────────────────────────────────────────────────────
  const { mutateAsync: registerMutation, isPending: isLoading } = useMutation({
    mutationFn: registerUser,
    onSuccess: async (result) => {
      const userId = result?.patient?.id;

      await SecureStore.setItemAsync("userId", String(userId));

      Toast.show({
        type: "success",
        text1: "Registered Successfully 🎉",
      });

      navigation.navigate("Login" as never);
    },
    onError: (error: any) => {
      Toast.show({ type: "error", text1: "Error", text2: error.message });
    },
  });

  const handleSignup = async () => {
    if (isSubmitting.current) return;
    if (!validate()) {
      Toast.show({ type: "error", text1: "Please fix the errors below" });
      return;
    }
    isSubmitting.current = true;
    const payload = {
      profileImage,
      userName,
      firstName: firstname,
      lastName: lastname,
      email,
      password,
      gender,
      age: age ? Number(age) : 0,
      phone: mobileNum,
    };
    try {
      await registerMutation(payload as any);
    } finally {
      isSubmitting.current = false;
    }
  };

  // Initials shown when no profile image is selected
  const initials =
    `${firstname?.charAt(0) ?? ""}${lastname?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef, "Register")}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
        fromRegisterScreen
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#F4F1FE" }}
      >
        {/* ════ FIXED STICKY BAR — gradient, floats above scroll ════ */}
        <StickyBar style={stickyBarAnimStyle}>
          <StickyBarGradient
            colors={["#5B21B6", "#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.Text style={[stickyTitleText, stickyTitleAnimStyle]}>
              Create Account
            </Animated.Text>
            <BackButton
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </BackButton>
          </StickyBarGradient>

          {/* Absolutely positioned — centres across full bar width */}
        </StickyBar>
        {/* ════ SCROLL VIEW ════
            scrollIndicatorInsets keeps indicator below the sticky bar.
            The AnimatedHeader starts at y=0; the sticky bar overlaps only
            its own 100px of pure gradient — seamless. The form content
            begins below MAX_HEADER_HEIGHT and never slides behind the bar. */}
        <AnimatedScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ top: STICKY_BAR_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Collapsible gradient header ── */}
          <AnimatedHeader style={headerAnimatedStyle}>
            <GradientBg
              colors={["#5B21B6", "#8B5CF6", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Decorative SVG blobs */}
              <DecorLayer>
                <Svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT}`}
                >
                  <Circle
                    cx={SCREEN_WIDTH * 0.08}
                    cy={50}
                    r={115}
                    fill="rgba(255,255,255,0.055)"
                  />
                  <Circle
                    cx={SCREEN_WIDTH * 0.88}
                    cy={28}
                    r={90}
                    fill="rgba(255,255,255,0.045)"
                  />
                  <Circle
                    cx={SCREEN_WIDTH * 0.55}
                    cy={MAX_HEADER_HEIGHT - 10}
                    r={135}
                    fill="rgba(255,255,255,0.035)"
                  />
                  <Path
                    d={`M0 ${MAX_HEADER_HEIGHT * 0.5} Q${SCREEN_WIDTH * 0.3} ${MAX_HEADER_HEIGHT * 0.28} ${SCREEN_WIDTH * 0.65} ${MAX_HEADER_HEIGHT * 0.55} T${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT * 0.45}`}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2"
                    fill="none"
                  />
                  <Path
                    d={`M0 ${MAX_HEADER_HEIGHT * 0.7} Q${SCREEN_WIDTH * 0.45} ${MAX_HEADER_HEIGHT * 0.5} ${SCREEN_WIDTH * 0.75} ${MAX_HEADER_HEIGHT * 0.72} T${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT * 0.65}`}
                    stroke="rgba(255,255,255,0.065)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </Svg>
              </DecorLayer>

              {/* Large title — fades out on scroll up */}
              <HeaderTitleArea>
                <Animated.View style={largeTitleAnimStyle}>
                  <HeroTitle>Create Account</HeroTitle>
                  <HeroSubtitle>Join us — it only takes a minute</HeroSubtitle>
                </Animated.View>
              </HeaderTitleArea>
            </GradientBg>

            {/* Inverted semi-circle arch cut from the bottom of the header */}
            <ArchOverlay>
              <Svg
                width={SCREEN_WIDTH}
                height={CURVE_HEIGHT + 1}
                viewBox={`0 0 ${SCREEN_WIDTH} ${CURVE_HEIGHT + 1}`}
              >
                {/*
                  Quadratic bezier: starts at top-left (0,0), control point
                  is at the centre-bottom of the arch, ends at top-right.
                  The remaining polygon fills the rest so the background
                  colour shows through, creating an "inward" curve.
                */}
                <Path
                  d={`M0,0 Q${SCREEN_WIDTH / 2},${CURVE_HEIGHT * 2.4} ${SCREEN_WIDTH},0 L${SCREEN_WIDTH},${CURVE_HEIGHT + 1} L0,${CURVE_HEIGHT + 1} Z`}
                  fill="#F4F1FE"
                />
              </Svg>
            </ArchOverlay>
          </AnimatedHeader>

          {/* ── Profile picture picker ── */}
          <ProfileSection>
            <AvatarButton
              activeOpacity={0.82}
              onPress={() => profileSheetRef.current?.present()}
            >
              {profileImage ? (
                <AvatarImg source={{ uri: profileImage }} />
              ) : (
                <AvatarPlaceholder>
                  <InitialsLabel>{initials}</InitialsLabel>
                </AvatarPlaceholder>
              )}
              {/* Camera badge */}
              <CameraBadge>
                <Ionicons name="camera" size={13} color="#FFF" />
              </CameraBadge>
            </AvatarButton>

            <PickerHint>Tap to set a profile photo</PickerHint>
          </ProfileSection>

          {/* ════ FULL-WIDTH FORM CARD ════ */}
          <FormSheet>
            {/* ── Personal Info ── */}
            <SectionTag>Personal Info</SectionTag>

            <RowPair>
              <HalfField>
                <FieldBox hasError={!!errors.firstname}>
                  <Ionicons name="person-outline" size={17} color="#A78BFA" />
                  <FieldText
                    value={firstname}
                    onChangeText={(t: string) => {
                      setFirstname(t);
                      setErrors((p) => ({ ...p, firstname: "" }));
                    }}
                    placeholder="First Name"
                    placeholderTextColor="#C4B5FD"
                  />
                </FieldBox>
                {errors.firstname ? (
                  <ErrLabel>{errors.firstname}</ErrLabel>
                ) : null}
              </HalfField>

              <HalfField>
                <FieldBox hasError={!!errors.lastname}>
                  <Ionicons name="person-outline" size={17} color="#A78BFA" />
                  <FieldText
                    value={lastname}
                    onChangeText={(t: string) => {
                      setLastname(t);
                      setErrors((p) => ({ ...p, lastname: "" }));
                    }}
                    placeholder="Last Name"
                    placeholderTextColor="#C4B5FD"
                    onBlur={() => {
                      setUserName(
                        `${firstname}${lastname}`.toLowerCase() +
                          Math.floor(100 + Math.random() * 900),
                      );
                    }}
                  />
                </FieldBox>
                {errors.lastname ? (
                  <ErrLabel>{errors.lastname}</ErrLabel>
                ) : null}
              </HalfField>
            </RowPair>

            <Rule />

            {/* ── Contact Details ── */}
            <SectionTag>Contact Details</SectionTag>

            <SingleField>
              <FieldBox hasError={!!errors.email}>
                <Ionicons name="mail-outline" size={17} color="#A78BFA" />
                <FieldText
                  value={email}
                  onChangeText={(t: string) => {
                    setEmail(t);
                    setErrors((p) => ({ ...p, email: "" }));
                  }}
                  placeholder="Email Address"
                  placeholderTextColor="#C4B5FD"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </FieldBox>
              {errors.email ? <ErrLabel>{errors.email}</ErrLabel> : null}
            </SingleField>

            <SingleField>
              <PhoneBox hasError={!!errors.mobileNum}>
                <PhoneInput
                  value={mobileNum}
                  defaultCode="IN"
                  layout="second"
                  withDarkTheme={false}
                  placeholder="Phone Number"
                  withShadow={false}
                  onChangeText={(text) => {
                    setMobileNum(text);
                    setErrors((p) => ({ ...p, mobileNum: "" }));
                  }}
                  onChangeFormattedText={(text) => setFormattedValue(text)}
                  textInputProps={{ maxLength: 10 }}
                  containerStyle={{
                    width: "100%",
                    backgroundColor: "#F5F3FF",
                    borderRadius: 14,
                    height: 54,
                  }}
                  textContainerStyle={{
                    backgroundColor: "transparent",
                    borderTopRightRadius: 14,
                    borderBottomRightRadius: 14,
                    paddingVertical: 0,
                  }}
                  textInputStyle={{ fontSize: 15, color: "#1E1B4B" }}
                  codeTextStyle={{ fontSize: 15, color: "#1E1B4B" }}
                  flagButtonStyle={{
                    borderRightWidth: 1,
                    borderRightColor: "#DDD6FE",
                  }}
                />
              </PhoneBox>
              {errors.mobileNum ? (
                <ErrLabel>{errors.mobileNum}</ErrLabel>
              ) : null}
            </SingleField>

            <Rule />

            {/* ── About You ── */}
            <SectionTag>About You</SectionTag>

            <RowPair>
              <HalfField>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => genderSheetRef?.current?.present()}
                >
                  <FieldBox hasError={!!errors.gender}>
                    <Ionicons
                      name="male-female-outline"
                      size={17}
                      color="#A78BFA"
                    />
                    <GenderLabel isSelected={!!gender}>
                      {gender
                        ? genderOptions.find((g) => g.value === gender)?.label
                        : "Gender"}
                    </GenderLabel>
                    <Ionicons name="chevron-down" size={15} color="#C4B5FD" />
                  </FieldBox>
                </TouchableOpacity>
                {errors.gender ? <ErrLabel>{errors.gender}</ErrLabel> : null}
              </HalfField>

              <HalfField>
                <FieldBox hasError={!!errors.age}>
                  <Ionicons
                    name="hourglass-outline"
                    size={17}
                    color="#A78BFA"
                  />
                  <FieldText
                    value={String(age)}
                    onChangeText={(t: string) => {
                      setAge(t);
                      setErrors((p) => ({ ...p, age: "" }));
                    }}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="Age"
                    placeholderTextColor="#C4B5FD"
                  />
                </FieldBox>
                {errors.age ? <ErrLabel>{errors.age}</ErrLabel> : null}
              </HalfField>
            </RowPair>

            <Rule />

            {/* ── Security ── */}
            <SectionTag>Security</SectionTag>

            <PasswordInfoModal
              visible={showPasswordInfo}
              onClose={() => setShowPasswordInfo(false)}
            />

            <SingleField>
              <FieldBox hasError={!!errors.password}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color="#A78BFA"
                />
                <FieldText
                  secureTextEntry={secureText}
                  value={password}
                  onChangeText={(t: string) => {
                    setPassword(t);
                    setErrors((p) => ({ ...p, password: "" }));
                  }}
                  placeholder="Password"
                  placeholderTextColor="#C4B5FD"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSecureText(!secureText)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={secureText ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#C4B5FD"
                  />
                </TouchableOpacity>
              </FieldBox>
              {errors.password ? <ErrLabel>{errors.password}</ErrLabel> : null}
            </SingleField>

            <SingleField>
              <FieldBox hasError={!!errors.confirmPassword}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color="#A78BFA"
                />
                <FieldText
                  secureTextEntry={confirmSecureText}
                  value={confirmPassword}
                  onChangeText={(t: string) => {
                    setConfirmPassword(t);
                    setErrors((p) => ({ ...p, confirmPassword: "" }));
                  }}
                  placeholder="Confirm Password"
                  placeholderTextColor="#C4B5FD"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setConfirmSecureText(!confirmSecureText)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={confirmSecureText ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#C4B5FD"
                  />
                </TouchableOpacity>
              </FieldBox>
              {errors.confirmPassword ? (
                <ErrLabel>{errors.confirmPassword}</ErrLabel>
              ) : null}
            </SingleField>

            <Rule />

            {/* ── Terms ── */}
            <AgreeRow>
              <AgreeBox
                isSelected={agreeTerms}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                {agreeTerms && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </AgreeBox>
              <AgreeText>I agree to the</AgreeText>

              <AgreeLink onPress={() => termsSheetRef.current?.present()}>
                <AgreeLinkText>Terms & Conditions</AgreeLinkText>
              </AgreeLink>
            </AgreeRow>

            {/* ── Submit button ── */}
            <SubmitBtn
              activeOpacity={0.88}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <SubmitGrad
                colors={["#7C3AED", "#DB2777"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <BusyRow>
                    <ActivityIndicator color="#FFF" size="small" />
                    <BusyLabel>Creating Account…</BusyLabel>
                  </BusyRow>
                ) : (
                  <SubmitLabel>Create Account</SubmitLabel>
                )}
              </SubmitGrad>
            </SubmitBtn>

            {/* ── Footer ── */}
            <FootRow>
              <FootNote>Already have an account?</FootNote>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Login" as never)}
              >
                <FootLink> Login</FootLink>
              </TouchableOpacity>
            </FootRow>
          </FormSheet>
        </AnimatedScrollView>
        {/* ════ GENDER BOTTOM SHEET ════ */}
        <BottomSheet ref={genderSheetRef}>
          <GenderSheetContainer>
            <GenderSheetHeader>
              <GenderSheetTitle>Select Gender</GenderSheetTitle>
              <GenderSheetSubtitle>
                Choose the option that best describes you.
              </GenderSheetSubtitle>
            </GenderSheetHeader>

            <GenderOptionsList>
              {genderOptions.map((option) => {
                const isSelected = gender === option.value;

                return (
                  <GenderOptionButton
                    key={option.value}
                    activeOpacity={0.85}
                    isSelected={isSelected}
                    onPress={() => handleSelectGender(option.value)}
                  >
                    <GenderOptionIcon isSelected={isSelected}>
                      <Ionicons
                        name={option.icon as any}
                        size={21}
                        color={isSelected ? "#FFFFFF" : "#7C3AED"}
                      />
                    </GenderOptionIcon>

                    <GenderOptionTextWrap>
                      <GenderOptionLabel isSelected={isSelected}>
                        {option.label}
                      </GenderOptionLabel>
                    </GenderOptionTextWrap>

                    <RadioOuter isSelected={isSelected}>
                      {isSelected && <RadioInner />}
                    </RadioOuter>
                  </GenderOptionButton>
                );
              })}
            </GenderOptionsList>
          </GenderSheetContainer>
        </BottomSheet>
        {/* ════ PROFILE PICTURE BOTTOM SHEET ════ */}
        <BottomSheet ref={profileSheetRef}>
          <AddDocumentSheet
            onGalleryPick={async () => {
              await handleGalleryPick(profileSheetRef?.current?.dismiss, "Register");
            }}
            onCameraOpen={async () => {
              await handleOpenCamera(profileSheetRef?.current?.dismiss);
            }}
          />
        </BottomSheet>
        {/* ════  TERMS & CONDITIONS BOTTOM SHEET ════ */}
        <BottomSheet ref={termsSheetRef}>
          <TermsContainer>
            <TermsHeaderRow>
              <TermsTitle>Terms & Conditions</TermsTitle>

              <CloseButton onPress={() => termsSheetRef.current?.dismiss()}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </CloseButton>
            </TermsHeaderRow>

            <TermsScrollView showsVerticalScrollIndicator={false}>
              <TermsSection>
                <TermsHeading>1. Account Responsibility</TermsHeading>

                <TermsDescription>
                  You are responsible for maintaining the confidentiality of
                  your account credentials and all activities performed using
                  your account.
                </TermsDescription>
              </TermsSection>

              <TermsSection>
                <TermsHeading>2. Personal Information</TermsHeading>

                <TermsDescription>
                  By creating an account, you agree to provide accurate and
                  updated information including your email address, phone
                  number, and profile details.
                </TermsDescription>
              </TermsSection>

              <TermsSection>
                <TermsHeading>3. Privacy & Security</TermsHeading>

                <TermsDescription>
                  Your personal data is securely stored and handled according to
                  our privacy standards. We do not share sensitive information
                  without consent.
                </TermsDescription>
              </TermsSection>

              <TermsSection>
                <TermsHeading>4. Acceptable Usage</TermsHeading>

                <TermsDescription>
                  Users must not misuse the application, attempt unauthorized
                  access, distribute harmful content, or violate applicable laws
                  and regulations.
                </TermsDescription>
              </TermsSection>

              <TermsSection>
                <TermsHeading>5. Service Availability</TermsHeading>

                <TermsDescription>
                  We may update, modify, or temporarily suspend certain services
                  for maintenance, improvements, or security purposes.
                </TermsDescription>
              </TermsSection>

              <TermsSection>
                <TermsHeading>6. Consent</TermsHeading>

                <TermsDescription>
                  By continuing registration, you acknowledge that you have read
                  and agreed to these Terms & Conditions.
                </TermsDescription>
              </TermsSection>
            </TermsScrollView>
          </TermsContainer>
        </BottomSheet>
      </KeyboardAvoidingView>
    </>
  );
};

export default SignupScreen;

// ─── Styled Components ────────────────────────────────────────────────────────

/**
 * Fixed sticky bar — always on top, never scrolls.
 * Uses the same gradient as the collapsible header so it blends
 * seamlessly when the header is collapsed, and scroll content
 * passes behind it (z-index: 30 ensures it stays on top).
 */
const StickyBar = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: ${STICKY_BAR_HEIGHT}px;
  shadow-color: #4c1d95;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.2;
  shadow-radius: 18px;
  elevation: 12;
`;

const StickyBarGradient = styled(LinearGradient)`
  flex: 1;
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
  overflow: hidden;
  align-items: center;
  justify-content: flex-end;
  padding-horizontal: 20px;
  padding-bottom: 18px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.24);
`;

/**
 * Absolutely positioned so it spans the full StickyBar width and is
 * truly centred, regardless of the back button's size on the left.
 */
const stickyTitleText = {
  textAlign: "center" as const,
  fontSize: 18,
  fontWeight: "700" as const,
  color: "#FFFFFF",
  letterSpacing: 0.3,
};

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  bottom: 18px;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.22);
  justify-content: center;
  align-items: center;
`;

/** Wrapper whose height is animated by Reanimated */
const AnimatedHeader = styled(Animated.View)`
  width: 100%;
  overflow: hidden;
`;

const GradientBg = styled(LinearGradient)`
  height: ${MIN_HEADER_HEIGHT + 200}px;
`;

const DecorLayer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const HeaderTitleArea = styled.View`
  flex: 1;
  justify-content: flex-end;
  padding-horizontal: 24px;
  padding-bottom: ${CURVE_HEIGHT + 70}px;
`;

const HeroTitle = styled.Text`
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.6px;
`;

const HeroSubtitle = styled.Text`
  margin-top: 5px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

/**
 * The inverted semi-circle arch.
 * Sits flush at the bottom of the animated header.
 * The SVG Path punches an inward curve shape filled with the
 * page background colour, giving the "arch cut into gradient" effect.
 */
const ArchOverlay = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

// ─── Profile Section ──────────────────────────────────────────────────────────

/**
 * Positioned so the avatar circle sits half above / half below
 * the point where the header arch ends.
 */
const ProfileSection = styled.View`
  align-items: center;
  /* pull up so avatar overlaps the bottom of the arch */
  margin-top: ${-(AVATAR_HALF - CURVE_HEIGHT * 0.3)}px;
  margin-bottom: 20px;
`;

const AvatarButton = styled.TouchableOpacity`
  position: relative;
  width: ${AVATAR_SIZE}px;
  height: ${AVATAR_SIZE}px;
  shadow-color: #7c3aed;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.28;
  shadow-radius: 14px;
  elevation: 10;
`;

const AvatarImg = styled.Image`
  width: ${AVATAR_SIZE}px;
  height: ${AVATAR_SIZE}px;
  border-radius: ${AVATAR_HALF}px;
  border-width: 3.5px;
  border-color: #ffffff;
`;

const AvatarPlaceholder = styled.View`
  width: ${AVATAR_SIZE}px;
  height: ${AVATAR_SIZE}px;
  border-radius: ${AVATAR_HALF}px;
  background-color: #ede9fe;
  border-width: 3.5px;
  border-color: #ffffff;
  justify-content: center;
  align-items: center;
`;

const InitialsLabel = styled.Text`
  font-size: 32px;
  font-weight: 800;
  color: #7c3aed;
  letter-spacing: -1px;
`;

const CameraBadge = styled.View`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: #db2777;
  border-width: 2.5px;
  border-color: #ffffff;
  justify-content: center;
  align-items: center;
`;

const PickerHint = styled.Text`
  margin-top: 8px;
  font-size: 12px;
  color: #9d7fc5;
  font-weight: 500;
  letter-spacing: 0.2px;
`;

// ─── Form Card ────────────────────────────────────────────────────────────────

/**
 * Full-width card. Top corners rounded → feels like a bottom sheet
 * rising up from below. No horizontal margin.
 */
const FormSheet = styled.View`
  background-color: #ffffff;
  border-top-left-radius: 34px;
  border-top-right-radius: 34px;
  padding: 28px 20px 40px 20px;
  flex: 1;
  shadow-color: #6c3de8;
  shadow-offset: 0px -3px;
  shadow-opacity: 0.07;
  shadow-radius: 18px;
  elevation: 6;
`;

const SectionTag = styled.Text`
  font-size: 11px;
  font-weight: 800;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  margin-bottom: 14px;
`;

const Rule = styled.View`
  height: 1px;
  background-color: #f3f0ff;
  margin-vertical: 18px;
`;

const RowPair = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const SingleField = styled.View`
  margin-bottom: 12px;
`;

const HalfField = styled.View`
  flex: 1;
  margin-bottom: 12px;
`;

const FieldBox = styled.View<{ hasError?: boolean }>`
  height: 54px;
  flex-direction: row;
  align-items: center;
  background-color: #f5f3ff;
  border-radius: 14px;
  border-width: 1.5px;
  border-color: ${({ hasError }: { hasError?: boolean }) =>
    hasError ? "#F43F5E" : "#EDE9FE"};
  padding-horizontal: 14px;
`;

const FieldText = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 15px;
  color: #1e1b4b;
`;

const PhoneBox = styled.View<{ hasError?: boolean }>`
  border-width: 1.5px;
  border-color: ${({ hasError }: { hasError?: boolean }) =>
    hasError ? "#F43F5E" : "#EDE9FE"};
  border-radius: 14px;
  overflow: hidden;
  background-color: #f5f3ff;
`;

const GenderLabel = styled.Text<{ isSelected: boolean }>`
  flex: 1;
  margin-left: 10px;
  font-size: 15px;
  color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#1E1B4B" : "#C4B5FD"};
`;

const ErrLabel = styled.Text`
  color: #f43f5e;
  font-size: 11.5px;
  margin-top: 5px;
  margin-left: 4px;
`;

// ─── Terms ────────────────────────────────────────────────────────────────────

const AgreeRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin-top: 6px;
  margin-bottom: 6px;
  width: 100%;
`;

const AgreeBox = styled.TouchableOpacity<{ isSelected: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border-width: 1.5px;
  background-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#ffffff"};
  border-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#947afcff"};
  margin-right: 10px;
  align-items: center;
  justify-content: center;
`;

const AgreeText = styled.Text`
  font-size: 13px;
  color: #6b7280;
`;

const AgreeLink = styled.TouchableOpacity`
  margin-left: 4px;
`;

const AgreeLinkText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #7c3aed;
`;

// ─── Submit ───────────────────────────────────────────────────────────────────

const SubmitBtn = styled.TouchableOpacity`
  margin-top: 22px;
  border-radius: 16px;
  overflow: hidden;
`;

const SubmitGrad = styled(LinearGradient)`
  padding-vertical: 17px;
  align-items: center;
  justify-content: center;
`;

const BusyRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const SubmitLabel = styled.Text`
  color: #ffffff;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.4px;
`;

const BusyLabel = styled.Text`
  color: #ffffff;
  margin-left: 10px;
  font-weight: 600;
  font-size: 15px;
`;

// ─── Gender Bottom Sheet ────────────────────────────────────────────────────

const GenderSheetContainer = styled.View`
  padding: 26px 20px 34px 20px;
  background-color: #ffffff;
`;

const GenderSheetHeader = styled.View`
  padding-right: 42px;
  margin-bottom: 18px;
`;

const GenderSheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #1e1b4b;
`;

const GenderSheetSubtitle = styled.Text`
  font-size: 13px;
  line-height: 19px;
  color: #7c748f;
  margin-top: 5px;
`;

const GenderOptionsList = styled.View`
  gap: 10px;
`;

const GenderOptionButton = styled.TouchableOpacity<{ isSelected: boolean }>`
  min-height: 64px;
  flex-direction: row;
  align-items: center;
  padding: 12px 14px;
  border-radius: 18px;
  background-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#f3e8ff" : "#f8f7ff"};
  border-width: 1.5px;
  border-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#ede9fe"};
`;

const GenderOptionIcon = styled.View<{ isSelected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#ede9fe"};
`;

const GenderOptionTextWrap = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const GenderOptionLabel = styled.Text<{ isSelected: boolean }>`
  font-size: 15px;
  font-weight: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "800" : "700"};
  color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#4c1d95" : "#1e1b4b"};
`;

const RadioOuter = styled.View<{ isSelected: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border-width: 2px;
  border-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#c4b5fd"};
  align-items: center;
  justify-content: center;
`;

const RadioInner = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #7c3aed;
`;

// ─── Terms Bottom Sheet ──────────────────────────────────────────────────────

const TermsContainer = styled.View`
  padding: 22px 20px 34px 20px;
  background-color: #ffffff;
`;

const TermsHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
`;

const TermsTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #1e1b4b;
  letter-spacing: -0.4px;
`;

const CloseButton = styled.TouchableOpacity`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  background-color: #f3f4f6;
  align-items: center;
  justify-content: center;
`;

const TermsScrollView = styled.ScrollView`
  max-height: 420px;
`;

const TermsSection = styled.View`
  margin-bottom: 18px;
`;

const TermsHeading = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #4c1d95;
  margin-bottom: 6px;
`;

const TermsDescription = styled.Text`
  font-size: 13.5px;
  line-height: 22px;
  color: #6b7280;
`;

// ─── Footer ─────────────────────────────────────────────────────────────────--

const FootRow = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 22px;
`;

const FootNote = styled.Text`
  font-size: 14px;
  color: #9ca3af;
`;

const FootLink = styled.Text`
  font-size: 14px;
  font-weight: 800;
  color: #7c3aed;
`;
