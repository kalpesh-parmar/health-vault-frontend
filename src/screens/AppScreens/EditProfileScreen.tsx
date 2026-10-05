import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  Platform,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/shared/Header";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import { getUser, updateUser } from "../../services/userService";
import {
  uploadFileToS3,
  deleteFileFromS3,
  getFileSource,
} from "../../services/fileService";
import { queryClient } from "../../config/queryClient";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../context/ThemeContext";
import BottomSheet from "../../components/shared/BottomSheet";
import DatePicker from "react-native-date-picker";
import { format } from "date-fns";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import CameraModal from "../../components/shared/CameraModal";
import DualButtons from "../../components/shared/Buttons/DualButtons";

const getIconColors = (isDark: boolean) => ({
  fullname: {
    bg: isDark ? "#14532d" : "#f0fdf4",
    icon: isDark ? "#4ade80" : "#16a34a",
  },
  email: {
    bg: isDark ? "#7c2d12" : "#fff7ed",
    icon: isDark ? "#fb923c" : "#ea580c",
  },
  password: {
    bg: isDark ? "#581c87" : "#fdf4ff",
    icon: isDark ? "#c084fc" : "#9333ea",
  },
  dob: {
    bg: isDark ? "#713f12" : "#fefce8",
    icon: isDark ? "#facc15" : "#ca8a04",
  },
  mobile: {
    bg: isDark ? "#134e4a" : "#f0fdfa",
    icon: isDark ? "#2dd4bf" : "#0d9488",
  },
  gender: {
    bg: isDark ? "#831843" : "#fdf2f8",
    icon: isDark ? "#f472b6" : "#db2777",
  },
});

const GENDER_OPTIONS = [
  { label: "Male", icon: "male", value: "male" },
  { label: "Female", icon: "female", value: "female" },
  { label: "Other", icon: "male-female-outline", value: "other" },
] as const;

export const BLOOD_GROUP_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const COMMON_ALLERGIES = [
  "Penicillin",
  "Aspirin",
  "Ibuprofen",
  "Dust",
  "Pollen",
  "Peanuts",
  "Shellfish",
  "Latex",
] as const;

const calculateAge = (dob: Date | null) => {
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
};

interface ProfileFormState {
  profileImageKey?: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  dateOfBirth: Date | null;
  gender: string;
  bloodGroup: string;
  allergies: string;
}

type EditableFieldProps = {
  label: string;
  value: string;
  icon: string;
  colors: { bg: string; icon: string };
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  inputRef?: React.RefObject<any>;
  isEditing?: boolean;
  error?: string;
  isVerified?: boolean;
  showEditIcon?: boolean;
  rightAccessory?: React.ReactNode;
};

const EditableField = ({
  label,
  value,
  icon,
  colors,
  isFocused,
  onFocus,
  onBlur,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "words",
  editable = true,
  inputRef,
  isEditing = true,
  error,
  isVerified = false,
  showEditIcon = true,
  rightAccessory,
}: EditableFieldProps) => {
  const { theme } = useAppTheme();
  const actuallyEditable = editable && !isVerified;
  const showDisabledStyle = isEditing && isVerified;

  return (
    <View style={{ opacity: showDisabledStyle ? 0.6 : 1 }}>
      <FieldRow>
        <FieldIconBox
          style={{ backgroundColor: isFocused ? colors.icon : colors.bg }}
        >
          <Ionicons
            name={icon as any}
            size={18}
            color={isFocused ? theme.colors.surface : colors.icon}
          />
        </FieldIconBox>
        <FieldContent>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <FieldLabel
              style={[
                { marginBottom: 0 },
                isFocused ? { color: colors.icon } : {},
              ]}
            >
              {label}
            </FieldLabel>
            {isVerified && (
              <VerifiedBadge>
                <Ionicons name="checkmark-circle" size={14} color="#0284c7" />
                <VerifiedText>Verified</VerifiedText>
              </VerifiedBadge>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ActiveInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onFocus={onFocus}
              onBlur={onBlur}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              placeholderTextColor={theme.colors.textMuted}
              placeholder={`Enter ${label.toLowerCase()}`}
              isFocused={isFocused}
              accentColor={colors.icon}
              editable={actuallyEditable}
              multiline={true}
              style={{ flex: 1 }}
            />
          </View>
        </FieldContent>
        {isEditing && !isFocused && actuallyEditable && showEditIcon && (
          <EditChip>
            <Ionicons
              name="create-outline"
              size={14}
              color={theme.colors.primary}
            />
          </EditChip>
        )}
        {rightAccessory}
        {isFocused && <ActiveDot style={{ backgroundColor: colors.icon }} />}
      </FieldRow>
      {error ? (
        <FieldErrorText
          style={{ marginLeft: 65, marginTop: -5, marginBottom: 10 }}
        >
          {error}
        </FieldErrorText>
      ) : null}
    </View>
  );
};

const EditProfile = () => {
  const { theme, isDark } = useAppTheme();
  const bottomPadding = useBottomBarPadding(16, 12);
  const iconColors = getIconColors(isDark);
  const refRBSheet = useRef<BottomSheetModal>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const cameraRef = useRef(null);
  const {
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
    selectedImages,
  } = useDocumentMedia();

  const [isEditing, setIsEditing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const scrollViewRef = useRef<any>(null);
  const firstNameInputRef = useRef<any>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onKeyboardShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
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

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }, [queryClient]),
  );

  const { data: userData, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const [profileImageSource, setProfileImageSource] = useState<any>(null);

  const fetchProfileImage = async (imageKey: string) => {
    try {
      const res = await getFileSource(imageKey);
      setProfileImageSource(res);
    } catch (e) {
      console.log("Failed to load profile image URL", e);
    }
  };

  useEffect(() => {
    if (userData?.profileImageKey) {
      fetchProfileImage(userData.profileImageKey);
    }
  }, [userData?.profileImageKey]);

  const [form, setForm] = useState<ProfileFormState>({
    profileImageKey: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    dateOfBirth: null,
    gender: "",
    bloodGroup: "",
    allergies: "",
  });

  useEffect(() => {
    if (userData) {
      setForm({
        profileImageKey: userData.profileImageKey || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        mobile: userData.mobile || "",
        dateOfBirth:
          userData.dateOfBirth &&
          !isNaN(new Date(userData.dateOfBirth).getTime())
            ? new Date(userData.dateOfBirth)
            : null,
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies)
          ? (userData.allergies || []).join(", ")
          : "",
      });
    }
  }, [userData]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      firstNameInputRef.current?.focus();
    }, 100);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userData) {
      setForm({
        profileImageKey: userData.profileImageKey || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        mobile: userData.mobile || "",
        dateOfBirth:
          userData.dateOfBirth &&
          !isNaN(new Date(userData.dateOfBirth).getTime())
            ? new Date(userData.dateOfBirth)
            : null,
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies)
          ? (userData.allergies || []).join(", ")
          : "",
      });
    }
    setErrors({});
  };

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const updateField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [tempAllergiesList, setTempAllergiesList] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState("");
  const [allergyError, setAllergyError] = useState<string | null>(null);

  const filteredBloodGroups = useMemo(() => {
    const query = (form.bloodGroup || "").trim().toUpperCase();
    if (!query) return BLOOD_GROUP_OPTIONS;
    return BLOOD_GROUP_OPTIONS.filter((bg) => bg.toUpperCase().includes(query));
  }, [form.bloodGroup]);

  const allergiesList = useMemo(() => {
    if (!form.allergies) return [];
    return form.allergies
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [form.allergies]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    const nameReg = /^[A-Za-z\u0A80-\u0AFF\u0900-\u097F\u0B80-\u0BFF\s]+$/u;

    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    else if (form.firstName.trim().length < 2)
      newErrors.firstName = "Min 2 chars";
    else if (!nameReg.test(form.firstName.trim()))
      newErrors.firstName = "Alphabets only";

    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    else if (form.lastName.trim().length < 2)
      newErrors.lastName = "Min 2 chars";
    else if (!nameReg.test(form.lastName.trim()))
      newErrors.lastName = "Alphabets only";

    if (form.email && form.email.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(form.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (form.mobile && form.mobile.trim()) {
      const cleaned = form.mobile.trim().replace(/\s+/g, "");
      const phoneDigits = cleaned.startsWith("+91")
        ? cleaned.slice(3)
        : cleaned.startsWith("+")
          ? cleaned.slice(1)
          : cleaned;
      if (!/^\d{10}$/.test(phoneDigits)) {
        newErrors.mobile = "Please enter a valid 10-digit mobile number";
      }
    }

    if (form.bloodGroup && form.bloodGroup.trim()) {
      const upperBg = form.bloodGroup.trim().toUpperCase();
      if (!BLOOD_GROUP_OPTIONS.includes(upperBg as any)) {
        newErrors.bloodGroup = "Please select a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Validation Error");
      }
      const user = await getUser();
      const userId = user?.data?.id;
      const currentUserData = user?.data;
      if (!userId) throw new Error("No user ID found.");

      let profileImageKey = currentUserData?.profileImageKey;

      // If a new image was selected (it will be a local file URI, not an S3 key/url)
      if (
        selectedImages &&
        selectedImages !== currentUserData?.profileImageKey
      ) {
        // 1. Delete old profile picture if exists
        if (currentUserData?.profileImageKey) {
          try {
            await deleteFileFromS3(currentUserData.profileImageKey);
          } catch (e) {
            console.log("Failed to delete old profile picture", e);
          }
        }

        // 2. Upload new profile picture
        const uploadRes = await uploadFileToS3(
          selectedImages,
          "PATIENT_PROFILE",
        );
        const fileData =
          uploadRes?.data?.data || uploadRes?.data || uploadRes || {};
        profileImageKey = fileData.s3Key || profileImageKey;
      }

      const payload: any = {};
      const addIfChanged = (key: string, nextValue: unknown, currentValue: unknown) => {
        if (nextValue !== currentValue) {
          payload[key] = nextValue;
        }
      };

      // Compare normalized values so formatting-only edits do not cause an update.
      const currentMobile = currentUserData?.mobile
        ? currentUserData.mobile.trim().replace(/\s+/g, "")
        : "";
      const cleanedMobile = form.mobile.trim().replace(/\s+/g, "");
      const nextMobile = cleanedMobile
        ? cleanedMobile.startsWith("+")
          ? cleanedMobile.slice(3)
          : cleanedMobile
        : "";
      const normalizedCurrentMobile = currentMobile.startsWith("+")
        ? currentMobile.slice(3)
        : currentMobile;

      addIfChanged(
        "firstName",
        form.firstName.trim(),
        (currentUserData?.firstName || "").trim(),
      );
      addIfChanged(
        "lastName",
        form.lastName.trim(),
        (currentUserData?.lastName || "").trim(),
      );
      addIfChanged("gender", form.gender, currentUserData?.gender || "");
      addIfChanged("mobile", nextMobile, normalizedCurrentMobile);
      addIfChanged(
        "email",
        form.email.trim(),
        (currentUserData?.email || "").trim(),
      );

      const nextDateOfBirth = form.dateOfBirth
        ? format(form.dateOfBirth, "yyyy-MM-dd")
        : null;
      const currentDateOfBirth = currentUserData?.dateOfBirth
        ? String(currentUserData.dateOfBirth).slice(0, 10)
        : null;
      addIfChanged("dateOfBirth", nextDateOfBirth, currentDateOfBirth);

      const nextBloodGroup = form.bloodGroup?.trim().toUpperCase() || "";
      const currentBloodGroup = currentUserData?.bloodGroup?.trim().toUpperCase() || "";
      addIfChanged("bloodGroup", nextBloodGroup, currentBloodGroup);

      const allergiesArray = form.allergies
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const currentAllergies = Array.isArray(currentUserData?.allergies)
        ? currentUserData.allergies.map((allergy: string) => allergy.trim())
        : [];
      if (JSON.stringify(allergiesArray) !== JSON.stringify(currentAllergies)) {
        payload.allergies = allergiesArray;
      }

      if (profileImageKey !== currentUserData?.profileImageKey) {
        payload.profileImageKey = profileImageKey;
      }

      return await updateUser(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      if (error.message === "Validation Error") {
        Toast.show({
          type: "error",
          text1: "Validation Error",
          text2: "Please fix the errors in the form.",
        });
        return;
      }
      const backendMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error.message ||
        "Failed to update profile.";
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: backendMsg,
      });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title={isEditing ? "Edit Profile" : "Profile"}
        showBack
        rightAction={
          isEditing
            ? undefined
            : {
                icon: "create-outline",
                Label: "Edit",
                onPress: handleStartEdit,
              }
        }
      />

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollContent
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom:
              keyboardHeight > 0 ? keyboardHeight + 30 : bottomPadding + 20,
          }}
          ref={scrollViewRef}
        >
          <ScrollInner>
            {/* ── Avatar ── */}
            <AvatarSection>
              <AvatarRing>
                {profileImageSource || selectedImages ? (
                  <Image
                    source={
                      selectedImages
                        ? { uri: selectedImages }
                        : profileImageSource
                    }
                    style={{ borderRadius: 45, width: 90, height: 90 }}
                  />
                ) : (
                  <AvatarText>
                    {(form.firstName?.charAt(0).toUpperCase() || "") +
                      (form.lastName?.charAt(0).toUpperCase() || "")}
                  </AvatarText>
                )}
              </AvatarRing>
              {isEditing && (
                <AvatarEditBadge
                  onPress={() => {
                    Keyboard.dismiss();
                    refRBSheet.current?.present();
                  }}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </AvatarEditBadge>
              )}
              {isEditing && (
                <AvatarHint>Tap the camera to change photo</AvatarHint>
              )}
            </AvatarSection>

            {/* ── Personal Info ── */}
            <SectionLabel>Personal Info</SectionLabel>
            <Card>
              <EditableField
                label="First Name"
                value={form.firstName}
                icon="person-outline"
                colors={iconColors.fullname}
                isFocused={focusedField === "firstName"}
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => updateField("firstName", t)}
                editable={isEditing}
                inputRef={firstNameInputRef}
                isEditing={isEditing}
                error={errors.firstName}
              />
              <FieldDivider />
              <EditableField
                label="Last Name"
                value={form.lastName}
                icon="person-outline"
                colors={iconColors.fullname}
                isFocused={focusedField === "lastName"}
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => updateField("lastName", t)}
                editable={isEditing}
                isEditing={isEditing}
                error={errors.lastName}
              />
            </Card>

            {/* ── Contact Info ── */}
            <SectionLabel>Contact Info</SectionLabel>
            <Card>
              <EditableField
                label="Email Address"
                value={form?.email!}
                icon="mail-outline"
                colors={iconColors.email}
                isFocused={focusedField === "email"}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => updateField("email", t)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={isEditing}
                isEditing={isEditing}
                error={errors.email}
                isVerified={userData?.isEmailVerified}
              />
              <FieldDivider />
              <EditableField
                label="Mobile Number"
                value={form.mobile || ""}
                icon="call-outline"
                colors={iconColors.mobile}
                isFocused={focusedField === "mobile"}
                onFocus={() => setFocusedField("mobile")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => updateField("mobile", t)}
                keyboardType="phone-pad"
                editable={isEditing}
                isEditing={isEditing}
                error={errors.mobile}
                isVerified={userData?.isMobileVerified}
              />
            </Card>

            <SectionLabel>More Details</SectionLabel>
            <Card>
              <TouchableOpacity
                activeOpacity={isEditing ? 0.7 : 1}
                onPress={() => isEditing && setShowDatePicker(true)}
              >
                <FieldRow>
                  <FieldIconBox
                    style={{ backgroundColor: iconColors.dob.bg }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={iconColors.dob.icon}
                    />
                  </FieldIconBox>
                  <FieldContent>
                    <FieldLabel>
                      {isEditing ? "Date of Birth" : "Age"}
                    </FieldLabel>
                    <AgeInput hasValue={!!form.dateOfBirth} editable={false}>
                      {isEditing
                        ? form.dateOfBirth
                          ? format(form.dateOfBirth, "dd MMM yyyy")
                          : "Select Date"
                        : form.dateOfBirth
                          ? `${calculateAge(form.dateOfBirth)} Years`
                          : "Not specified"}
                    </AgeInput>
                  </FieldContent>
                </FieldRow>
              </TouchableOpacity>

              <FieldDivider />

              <FieldRow
                style={{ flexDirection: "column", alignItems: "flex-start" }}
              >
                <GenderLabelRow>
                  <FieldIconBox
                    style={{ backgroundColor: iconColors.gender.bg }}
                  >
                    <Ionicons
                      name="male-female-outline"
                      size={18}
                      color={iconColors.gender.icon}
                    />
                  </FieldIconBox>
                  <FieldLabel style={{ marginBottom: 0 }}>Gender</FieldLabel>
                </GenderLabelRow>
                <GenderRow>
                  {GENDER_OPTIONS.map((opt) => {
                    const selected =
                      form.gender?.toLowerCase() ===
                        opt.label.toLowerCase() ||
                      form.gender?.toLowerCase() === opt.icon.toLowerCase();
                    return (
                      <GenderChip
                        key={opt.label}
                        selected={selected}
                        onPress={() =>
                          isEditing && updateField("gender", opt.value)
                        }
                        activeOpacity={isEditing ? 0.7 : 1}
                      >
                        <Ionicons
                          name={opt.icon as any}
                          size={14}
                          color={
                            selected
                              ? theme.colors.surface
                              : theme.colors.textMuted
                          }
                        />
                        <GenderChipText selected={selected}>
                          {opt.label}
                        </GenderChipText>
                      </GenderChip>
                    );
                  })}
                </GenderRow>
                {errors.gender ? (
                  <FieldErrorText style={{ marginLeft: 15, marginTop: 10 }}>
                    {errors.gender}
                  </FieldErrorText>
                ) : null}
              </FieldRow>

              <FieldDivider />

              <View>
                <EditableField
                  label="Blood Group"
                  value={form.bloodGroup}
                  icon="water-outline"
                  colors={{ bg: "#fee2e2", icon: "#ef4444" }}
                  isFocused={focusedField === "bloodGroup"}
                  onFocus={() => setFocusedField("bloodGroup")}
                  onBlur={() => {
                    setTimeout(() => {
                      setFocusedField((prev) => (prev === "bloodGroup" ? null : prev));
                    }, 250);
                  }}
                  onChangeText={(t) => updateField("bloodGroup", t.toUpperCase())}
                  editable={isEditing}
                  isEditing={isEditing}
                  autoCapitalize="characters"
                  showEditIcon={false}
                  error={errors.bloodGroup}
                  rightAccessory={
                    isEditing ? (
                      <TouchableOpacity
                        onPress={() => {
                          if (focusedField === "bloodGroup") {
                            setFocusedField(null);
                            Keyboard.dismiss();
                          } else {
                            setFocusedField("bloodGroup");
                          }
                        }}
                        style={{ padding: 4, marginLeft: 6 }}
                      >
                        <Ionicons
                          name={focusedField === "bloodGroup" ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    ) : null
                  }
                />

                {isEditing && focusedField === "bloodGroup" && (
                  <BloodGroupDropdownContainer>
                    <BloodGroupDropdownTitle>
                      Select Blood Group
                    </BloodGroupDropdownTitle>
                    {filteredBloodGroups.length > 0 ? (
                      <BloodGroupGrid>
                        {filteredBloodGroups.map((bg) => {
                          const isSelected = form.bloodGroup?.trim().toUpperCase() === bg;
                          return (
                            <BloodGroupChip
                              key={bg}
                              selected={isSelected}
                              onPress={() => {
                                updateField("bloodGroup", bg);
                                setFocusedField(null);
                                Keyboard.dismiss();
                              }}
                              activeOpacity={0.7}
                            >
                              <BloodGroupChipText selected={isSelected}>
                                {bg}
                              </BloodGroupChipText>
                            </BloodGroupChip>
                          );
                        })}
                      </BloodGroupGrid>
                    ) : (
                      <NoMatchText>
                        No matching blood group. (Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-)
                      </NoMatchText>
                    )}
                  </BloodGroupDropdownContainer>
                )}
              </View>

              <FieldDivider />

              <FieldRow style={{ alignItems: "flex-start" }}>
                <FieldIconBox style={{ backgroundColor: "#f3e8ff", marginTop: 2 }}>
                  <Ionicons name="medical-outline" size={18} color="#a855f7" />
                </FieldIconBox>
                <FieldContent>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <FieldLabel style={{ marginBottom: 0 }}>Allergies</FieldLabel>
                    {isEditing && (
                      <TouchableOpacity
                        onPress={() => {
                          setTempAllergiesList([...allergiesList]);
                          setCustomAllergyInput("");
                          setAllergyError(null);
                          setShowAllergiesModal(true);
                        }}
                        activeOpacity={0.7}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
                        <AddAllergyBtnText>
                          {allergiesList.length > 0 ? "Edit / Add" : "Add"}
                        </AddAllergyBtnText>
                      </TouchableOpacity>
                    )}
                  </View>

                  {allergiesList.length > 0 ? (
                    <AllergiesPillsRow>
                      {allergiesList.map((allergy, index) => (
                        <AllergyDisplayPill key={`${allergy}-${index}`}>
                          <AllergyPillText>{allergy}</AllergyPillText>
                          {isEditing && (
                            <TouchableOpacity
                              onPress={() => {
                                const updated = allergiesList.filter((_, i) => i !== index);
                                updateField("allergies", updated.join(", "));
                              }}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={{ marginLeft: 6 }}
                            >
                              <Ionicons name="close-circle" size={14} color="#a855f7" />
                            </TouchableOpacity>
                          )}
                        </AllergyDisplayPill>
                      ))}
                    </AllergiesPillsRow>
                  ) : (
                    <TouchableOpacity
                      disabled={!isEditing}
                      onPress={() => {
                        setTempAllergiesList([]);
                        setCustomAllergyInput("");
                        setAllergyError(null);
                        setShowAllergiesModal(true);
                      }}
                    >
                      <NoAllergyText isEditing={isEditing}>
                        {isEditing ? "Tap + to add allergies" : "No allergies added"}
                      </NoAllergyText>
                    </TouchableOpacity>
                  )}
                </FieldContent>
              </FieldRow>
            </Card>

            {isEditing && (
              <View style={{ marginTop: 10, marginBottom: 20 }}>
                <DualButtons
                  secondaryBtnText="Cancel"
                  secondaryBtnColor={isDark ? "#475569" : "#64748b"}
                  mainBtnText="Save Profile"
                  mainBtnColor={theme.colors.primary}
                  onSecondaryPress={handleCancelEdit}
                  onMainPress={() => updateProfileMutation.mutate()}
                  isLoading={updateProfileMutation.isPending}
                  mainLoadingText="Saving Profile..."
                />
              </View>
            )}
          </ScrollInner>
        </ScrollContent>
      )}

      <BottomSheet ref={refRBSheet}>
        <AddDocumentSheet
          isProfilePicture={true}
          onGalleryPick={() => {
            handleGalleryPick(() => refRBSheet.current?.dismiss(), "Profile");
          }}
          onCameraOpen={() => {
            handleOpenCamera(() => refRBSheet.current?.dismiss());
          }}
          onDocumentPick={() => {}}
        />
      </BottomSheet>

      {/* Camera View (Inline) */}
      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef, "Profile")}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {/* Allergies Interactive Modal (matching onboarding ASK_ALLERGIES style) */}
      <Modal
        visible={showAllergiesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllergiesModal(false)}
      >
        <ModalOverlay>
          <ModalBackdrop onPress={() => setShowAllergiesModal(false)} />
          <AllergiesModalCard isDark={isDark}>
            <ModalHeaderRow>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(168, 85, 247, 0.25)" : "#f3e8ff",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="medical" size={16} color="#a855f7" />
                </View>
                <ModalTitle isDark={isDark}>Add Your Allergies</ModalTitle>
              </View>
              <TouchableOpacity
                onPress={() => setShowAllergiesModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={isDark ? "#94a3b8" : "#64748b"}
                />
              </TouchableOpacity>
            </ModalHeaderRow>

            <ModalSubtitle isDark={isDark}>
              Select from common allergies or type custom allergies below.
            </ModalSubtitle>

            {/* Common Allergies Chips */}
            <CommonChipsWrapper>
              {COMMON_ALLERGIES.map((item) => {
                const isSelected = tempAllergiesList.some(
                  (a) => a.toLowerCase() === item.toLowerCase(),
                );
                return (
                  <CommonAllergyChip
                    key={item}
                    selected={isSelected}
                    onPress={() => {
                      setAllergyError(null);
                      if (isSelected) {
                        setTempAllergiesList((prev) =>
                          prev.filter((a) => a.toLowerCase() !== item.toLowerCase()),
                        );
                      } else {
                        setTempAllergiesList((prev) => [...prev, item]);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color={theme.colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <CommonAllergyChipText selected={isSelected}>
                      {item}
                    </CommonAllergyChipText>
                  </CommonAllergyChip>
                );
              })}
            </CommonChipsWrapper>

            {/* Custom Allergy Input */}
            <CustomInputRow>
              <CustomAllergyTextInput
                value={customAllergyInput}
                onChangeText={(t: string) => {
                  setCustomAllergyInput(t);
                  if (allergyError) setAllergyError(null);
                }}
                placeholder="Type allergy name..."
                placeholderTextColor={theme.colors.textMuted}
                isDark={isDark}
                onSubmitEditing={() => {
                  const trimmed = customAllergyInput.trim();
                  if (!trimmed) return;
                  if (
                    tempAllergiesList.some(
                      (a) => a.toLowerCase() === trimmed.toLowerCase(),
                    )
                  ) {
                    setAllergyError("Allergy already added");
                    return;
                  }
                  setTempAllergiesList((prev) => [...prev, trimmed]);
                  setCustomAllergyInput("");
                  setAllergyError(null);
                }}
              />
              <AddCustomBtn
                disabled={!customAllergyInput.trim()}
                hasText={!!customAllergyInput.trim()}
                onPress={() => {
                  const trimmed = customAllergyInput.trim();
                  if (!trimmed) return;
                  if (
                    tempAllergiesList.some(
                      (a) => a.toLowerCase() === trimmed.toLowerCase(),
                    )
                  ) {
                    setAllergyError("Allergy already added");
                    return;
                  }
                  setTempAllergiesList((prev) => [...prev, trimmed]);
                  setCustomAllergyInput("");
                  setAllergyError(null);
                }}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={customAllergyInput.trim() ? "#ffffff" : theme.colors.textMuted}
                />
                <AddCustomBtnText hasText={!!customAllergyInput.trim()}>
                  Add
                </AddCustomBtnText>
              </AddCustomBtn>
            </CustomInputRow>

            {allergyError && (
              <AllergyErrorRow>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <AllergyErrorText>{allergyError}</AllergyErrorText>
              </AllergyErrorRow>
            )}

            {/* Added Allergies Preview */}
            {tempAllergiesList.length > 0 && (
              <AddedAllergiesSection>
                <AddedAllergiesLabel isDark={isDark}>
                  Added Allergies ({tempAllergiesList.length})
                </AddedAllergiesLabel>
                <AddedChipsRow>
                  {tempAllergiesList.map((allergy, idx) => (
                    <AddedChip key={`${allergy}-${idx}`} isDark={isDark}>
                      <AddedChipText isDark={isDark}>{allergy}</AddedChipText>
                      <TouchableOpacity
                        onPress={() => {
                          setTempAllergiesList((prev) =>
                            prev.filter((_, i) => i !== idx),
                          );
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    </AddedChip>
                  ))}
                </AddedChipsRow>
              </AddedAllergiesSection>
            )}

            {/* Modal Actions */}
            <ModalActionRow>
              <ModalCancelBtn onPress={() => setShowAllergiesModal(false)}>
                <ModalCancelBtnText isDark={isDark}>Cancel</ModalCancelBtnText>
              </ModalCancelBtn>
              <ModalDoneBtn
                onPress={() => {
                  let finalAllergies = [...tempAllergiesList];
                  const trimmed = customAllergyInput.trim();
                  if (
                    trimmed &&
                    !finalAllergies.some(
                      (a) => a.toLowerCase() === trimmed.toLowerCase(),
                    )
                  ) {
                    finalAllergies.push(trimmed);
                  }
                  updateField("allergies", finalAllergies.join(", "));
                  setShowAllergiesModal(false);
                }}
              >
                <ModalDoneBtnText>Done</ModalDoneBtnText>
              </ModalDoneBtn>
            </ModalActionRow>
          </AllergiesModalCard>
        </ModalOverlay>
      </Modal>

      <DatePicker
        modal
        open={showDatePicker}
        date={
          form.dateOfBirth && !isNaN(form.dateOfBirth.getTime())
            ? form.dateOfBirth
            : new Date()
        }
        mode="date"
        maximumDate={new Date()}
        onConfirm={(date) => {
          setShowDatePicker(false);
          updateField("dateOfBirth", date);
        }}
        onCancel={() => {
          setShowDatePicker(false);
        }}
      />
    </View>
  );
};

export default EditProfile;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const ScrollInner = styled.View`
  padding: 24px 20px;
`;

const AvatarSection = styled.View`
  align-items: center;
  margin-bottom: 28px;
`;

const AvatarRing = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  justify-content: center;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.2;
  shadow-radius: 18px;
  elevation: 10;
  border-width: 3px;
  border-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;

const AvatarText = styled.Text`
  font-size: 38px;
  font-weight: 900;
  color: ${({ theme }: any) => theme.colors.primary};
  letter-spacing: -1px;
`;

const AvatarEditBadge = styled.TouchableOpacity`
  position: absolute;
  bottom: 30px;
  right: 105px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  border-width: 2.5px;
  border-color: ${({ theme }: any) => theme.colors.surface};
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.4;
  shadow-radius: 8px;
  elevation: 6;
`;

const AvatarHint = styled.Text`
  margin-top: 14px;
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-weight: 500;
`;

const SectionLabel = styled.Text`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 4px;
  margin-left: 4px;
`;

const Card = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 24px;
  padding: 6px 0px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.08;
  shadow-radius: 16px;
  elevation: 5;
  margin-bottom: 20px;
`;

const FieldRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 14px 18px;
`;

const FieldDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.divider};
  margin-left: 70px;
  margin-right: 18px;
`;

const FieldIconBox = styled.View`
  width: 38px;
  height: 38px;
  border-radius: 13px;
  justify-content: center;
  align-items: center;
  margin-right: 14px;
`;

const FieldContent = styled.View`
  flex: 1;
`;

const FieldLabel = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const ActiveInput = styled.TextInput<{
  isFocused: boolean;
  accentColor: string;
}>`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  padding: 0;
  margin: 0;
  border-bottom-width: ${({ isFocused }: any) => (isFocused ? "1.5px" : "0px")};
  border-bottom-color: ${({ isFocused, accentColor }: any) =>
    isFocused ? accentColor : "transparent"};
  padding-bottom: ${({ isFocused }: any) => (isFocused ? "4px" : "0px")};
`;

const EditChip = styled.View`
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  justify-content: center;
  align-items: center;
  margin-left: 8px;
`;

const ActiveDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  margin-left: 10px;
`;

const AgeInput = styled.TextInput<{ hasValue: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: ${({ hasValue, theme }: any) =>
    hasValue ? theme.colors.textPrimary : theme.colors.textMuted};
`;

const GenderLabelRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 0px;
  margin-bottom: 12px;
  width: 100%;
`;

const GenderRow = styled.View`
  flex-direction: row;
  gap: 10px;
  width: 100%;
  padding-left: 0px;
`;

const GenderChip = styled.TouchableOpacity<{ selected: boolean }>`
  flex: 1;
  padding: 10px 0px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 6px;
  background-color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : theme.colors.surfaceLight};
  shadow-color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : "transparent"};
  shadow-opacity: ${({ selected }: { selected: boolean }) =>
    selected ? 0.3 : 0};
  shadow-radius: 10px;
  elevation: ${({ selected }: { selected: boolean }) => (selected ? 4 : 0)};
`;

const GenderChipText = styled.Text<{ selected: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ selected, theme }: any) =>
    selected ? theme.colors.surface : theme.colors.textMuted};
`;

const FieldErrorText = styled.Text`
  color: #ef4444;
  font-size: 11px;
  margin-top: -10px;
  margin-bottom: 10px;
  margin-left: 65px;
`;

const VerifiedBadge = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #e0f2fe;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
`;

const VerifiedText = styled.Text`
  font-size: 10px;
  color: #0284c7;
  font-weight: 700;
  margin-left: 4px;
`;

const BloodGroupDropdownContainer = styled.View`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 14px 14px 12px 14px;
  margin: 0px 16px 14px 16px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.divider};
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 6px;
  elevation: 2;
`;

const BloodGroupDropdownTitle = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;

const BloodGroupGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  row-gap: 8px;
`;

const BloodGroupChip = styled.TouchableOpacity<{ selected: boolean }>`
  width: 22.5%;
  height: 38px;
  border-radius: 10px;
  background-color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : "#f8fafc"};
  border-width: 1px;
  border-color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : theme.colors.divider};
  align-items: center;
  justify-content: center;
`;

const BloodGroupChipText = styled.Text<{ selected: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ selected, theme }: any) =>
    selected ? "#ffffff" : theme.colors.textPrimary};
  text-align: center;
`;

const NoMatchText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
  padding-vertical: 4px;
`;

const AddAllergyBtnText = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const AllergiesPillsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const AllergyDisplayPill = styled.View`
  flex-direction: row;
  align-items: center;
  padding-vertical: 4px;
  padding-horizontal: 10px;
  border-radius: 12px;
  background-color: rgba(168, 85, 247, 0.12);
  border-width: 1px;
  border-color: rgba(168, 85, 247, 0.35);
`;

const AllergyPillText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #a855f7;
`;

const NoAllergyText = styled.Text<{ isEditing: boolean }>`
  font-size: 14px;
  color: ${({ isEditing, theme }: any) =>
    isEditing ? theme.colors.primary : theme.colors.textMuted};
  font-style: ${({ isEditing }: { isEditing: boolean }) =>
    isEditing ? "normal" : "italic"};
  font-weight: ${({ isEditing }: { isEditing: boolean }) =>
    isEditing ? "600" : "400"};
  padding-vertical: 4px;
`;

const ModalOverlay = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.55);
  padding: 20px;
`;

const ModalBackdrop = styled.TouchableOpacity`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;

const AllergiesModalCard = styled.View<{ isDark: boolean }>`
  width: 100%;
  max-width: 380px;
  border-radius: 24px;
  background-color: ${({ isDark }: any) =>
    isDark ? "#1e293b" : "#ffffff"};
  padding: 20px;
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 10;
`;

const ModalHeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const ModalTitle = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 800;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#0f172a"};
`;

const ModalSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 12.5px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  margin-bottom: 14px;
  line-height: 18px;
`;

const CommonChipsWrapper = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
`;

const CommonAllergyChip = styled.TouchableOpacity<{ selected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 14px;
  background-color: ${({ selected, theme }: any) =>
    selected
      ? "rgba(168, 85, 247, 0.16)"
      : theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : theme.colors.divider};
`;

const CommonAllergyChipText = styled.Text<{ selected: boolean }>`
  font-size: 12px;
  font-weight: ${({ selected }: { selected: boolean }) =>
    selected ? "700" : "500"};
  color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : theme.colors.textPrimary};
`;

const CustomInputRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const CustomAllergyTextInput = styled.TextInput<{ isDark: boolean }>`
  flex: 1;
  height: 42px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"};
  padding-horizontal: 12px;
  font-size: 13px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#0f172a"};
`;

const AddCustomBtn = styled.TouchableOpacity<{ hasText: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding-horizontal: 14px;
  border-radius: 12px;
  background-color: ${({ hasText, theme }: any) =>
    hasText ? theme.colors.primary : theme.colors.surfaceLight};
  gap: 4px;
`;

const AddCustomBtnText = styled.Text<{ hasText: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ hasText, theme }: any) =>
    hasText ? "#ffffff" : theme.colors.textMuted};
`;

const AllergyErrorRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
`;

const AllergyErrorText = styled.Text`
  font-size: 11.5px;
  color: #ef4444;
`;

const AddedAllergiesSection = styled.View`
  margin-top: 4px;
  margin-bottom: 14px;
`;

const AddedAllergiesLabel = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const AddedChipsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 100px;
`;

const AddedChip = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-vertical: 5px;
  padding-left: 10px;
  padding-right: 8px;
  border-radius: 12px;
  background-color: ${({ isDark, theme }: any) =>
    isDark ? "rgba(91, 75, 255, 0.25)" : "rgba(91, 75, 255, 0.1)"};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.primary};
  gap: 6px;
`;

const AddedChipText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const ModalActionRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
`;

const ModalCancelBtn = styled.TouchableOpacity`
  padding-vertical: 10px;
  padding-horizontal: 16px;
  border-radius: 12px;
  background-color: transparent;
`;

const ModalCancelBtnText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
`;

const ModalDoneBtn = styled.TouchableOpacity`
  padding-vertical: 10px;
  padding-horizontal: 22px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.primary};
`;

const ModalDoneBtnText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
`;
