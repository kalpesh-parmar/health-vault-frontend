// src/components/Signup/SignupForm.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import PhoneInput from "react-native-phone-number-input";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import DatePicker from "react-native-date-picker";
import { format } from "date-fns";

// Components & Hooks
import PasswordInfoModal from "../PasswordInfo";
import { registerUser } from "../../services/authService";
import { uploadFileToS3 } from "../../services/fileService";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import CameraModal from "../shared/CameraModal";
import GenderBottomSheet from "./GenderBottomSheet";
import ImageBottomSheet from "./ImageBottomSheet";
import TermsBottomSheet from "./TermsBottomSheet";

// ─── Layout Constants ─────────────────────────────────────────────────────────
const CURVE_HEIGHT = 40; // depth of the inverted arch
const AVATAR_SIZE = 96;
const AVATAR_HALF = AVATAR_SIZE / 2;

const SignupForm = () => {
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
  const [gender, setGender] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [confirmSecureText, setConfirmSecureText] = useState(true);
  const [formattedValue, setFormattedValue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

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
    
    // Name validation: alphabets and spaces only, min 2 chars
    const nameReg = /^[A-Za-z\s]+$/;
    if (!firstname.trim()) e.firstname = "First name is required";
    else if (firstname.trim().length < 2) e.firstname = "Minimum 2 characters";
    else if (!nameReg.test(firstname.trim())) e.firstname = "Alphabets only";

    if (!lastname.trim()) e.lastname = "Last name is required";
    else if (lastname.trim().length < 2) e.lastname = "Minimum 2 characters";
    else if (!nameReg.test(lastname.trim())) e.lastname = "Alphabets only";

    // Email validation
    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
    if (!email.trim()) e.email = "Email is required";
    else if (!emailReg.test(email.trim())) e.email = "Invalid email format";

    // Phone validation (strictly 10 digits)
    const cleanPhone = mobileNum.replace(/\D/g, "");
    if (!cleanPhone) e.mobileNum = "Mobile number is required";
    else if (cleanPhone.length !== 10) e.mobileNum = "Must be exactly 10 digits";

    // Password validation: Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password) e.password = "Password is required";
    else if (!passReg.test(password)) e.password = "Min 8 chars, 1 Upper, 1 Lower, 1 Num, 1 Symbol";

    if (!confirmPassword) e.confirmPassword = "Confirm your password";
    else if (confirmPassword !== password) e.confirmPassword = "Passwords do not match";

    if (!gender) e.gender = "Select gender";
    
    if (!dateOfBirth) e.dateOfBirth = "Select date of birth";

    if (!agreeTerms) e.agreeTerms = "You must agree to Terms & Conditions";

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
      Toast.show({ type: "error", text1: "Please Fix The Errors Shown Below." });
      return;
    }
    isSubmitting.current = true;
    
    try {
      let profileImageKey = "";
      
      if (profileImage) {
        const uploadRes = await uploadFileToS3(profileImage, "PATIENT_PROFILE");
        const fileData = uploadRes?.data?.data || uploadRes?.data || uploadRes || {};
        profileImageKey = fileData.s3Key || "";
      }

      const payload = {
        profileImageKey,
        firstName: firstname,
        lastName: lastname,
        email,
        password,
        gender,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : "",
        phone: mobileNum,
      };

      await registerMutation(payload);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Signup Failed", text2: error.message });
    } finally {
      isSubmitting.current = false;
    }
  };

  // Initials shown when no profile image is selected
  const initials =
    `${firstname?.charAt(0) ?? ""}${lastname?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  return (
    <>
      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef, "Register")}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
        fromRegisterScreen
      />

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
                  const cleanFirst = firstname.toLowerCase().trim();
                  const cleanLast = lastname.toLowerCase().trim();
                  setUserName(
                    `${cleanFirst}_${cleanLast}_` +
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
            // editable={false}
            // style={{ color: "#6B7280" }} // Dim color for read-only
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
              onPress={() => {
                Keyboard.dismiss();
                genderSheetRef?.current?.present();
              }}
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Keyboard.dismiss();
                setOpenDatePicker(true);
              }}
            >
              <FieldBox hasError={!!errors.dateOfBirth}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color="#A78BFA"
                />
                <GenderLabel isSelected={!!dateOfBirth}>
                  {dateOfBirth ? format(dateOfBirth, "dd MMM yyyy") : "Date of Birth"}
                </GenderLabel>
              </FieldBox>
            </TouchableOpacity>
            {errors.dateOfBirth ? <ErrLabel>{errors.dateOfBirth}</ErrLabel> : null}
            <DatePicker
              modal
              open={openDatePicker}
              date={dateOfBirth || new Date()}
              mode="date"
              maximumDate={new Date()}
              onConfirm={(date) => {
                setOpenDatePicker(false);
                setDateOfBirth(date);
                setErrors((p) => ({ ...p, dateOfBirth: "" }));
              }}
              onCancel={() => {
                setOpenDatePicker(false);
              }}
            />
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
        {errors.agreeTerms ? <ErrLabel>{errors.agreeTerms}</ErrLabel> : null}

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

      {/* ════ GENDER BOTTOM SHEET ════ */}
      <GenderBottomSheet
        ref={genderSheetRef}
        gender={gender}
        onSelectGender={handleSelectGender}
      />

      {/* ════ PROFILE PICTURE BOTTOM SHEET ════ */}
      <ImageBottomSheet
        ref={profileSheetRef}
        onGalleryPick={async () => {
          await handleGalleryPick(profileSheetRef?.current?.dismiss, "Register");
        }}
        onCameraOpen={async () => {
          await handleOpenCamera(profileSheetRef?.current?.dismiss);
        }}
      />

      {/* ════ TERMS & CONDITIONS BOTTOM SHEET ════ */}
      <TermsBottomSheet
        ref={termsSheetRef}
        onClose={() => termsSheetRef.current?.dismiss()}
      />
    </>
  );
};

export default SignupForm;

// ─── Styled Components ────────────────────────────────────────────────────────

const ProfileSection = styled.View`
  align-items: center;
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