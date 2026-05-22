import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Keyboard, Platform, TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/shared/Header";
import { ProfileStackParamList } from "../../navigation/types";
import { RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUser, updateUser } from "../../services/userService";
import { queryClient } from "../../config/queryClient";
import Toast from "react-native-toast-message";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../context/ThemeContext";
import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import CameraModal from "../../components/shared/CameraModal";

const getIconColors = (isDark: boolean) => ({
  username: {
    bg: isDark ? "#1e3a8a" : "#eff6ff",
    icon: isDark ? "#60a5fa" : "#2563eb",
  },
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
  phone: {
    bg: isDark ? "#134e4a" : "#f0fdfa",
    icon: isDark ? "#2dd4bf" : "#0d9488",
  },
  gender: {
    bg: isDark ? "#831843" : "#fdf2f8",
    icon: isDark ? "#f472b6" : "#db2777",
  },
});

const GENDER_OPTIONS = [
  { label: "Male", icon: "male" },
  { label: "Female", icon: "female" },
  { label: "Other", icon: "male-female-outline" },
] as const;

interface ProfileFormState {
  profilePicture?: {
    uri: string;
    name: string;
    type: string;
  };
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
};

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
}: EditableFieldProps) => {
  const { theme } = useAppTheme();
  return (
    <FieldRow
      style={
        isFocused
          ? { backgroundColor: theme.colors.surfaceLight, borderRadius: 16 }
          : {}
      }
    >
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
        <FieldLabel style={isFocused ? { color: colors.icon } : {}}>
          {label}
        </FieldLabel>
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
          editable={editable}
        />
      </FieldContent>
      {isEditing && !isFocused && (
        <EditChip>
          <Ionicons
            name="create-outline"
            size={14}
            color={theme.colors.primary}
          />
        </EditChip>
      )}
      {isFocused && <ActiveDot style={{ backgroundColor: colors.icon }} />}
    </FieldRow>
  );
};

const EditProfile = () => {
  const { theme, isDark } = useAppTheme();
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
    selectedImages
  } = useDocumentMedia();

  console.log("selectedImages :- ", selectedImages);

  const [isEditing, setIsEditing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<any>(null);
  const usernameInputRef = useRef<any>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

  const { data: userData } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const [form, setForm] = useState<ProfileFormState>({
    profilePicture: {
      uri: "",
      name: "",
      type: "",
    },
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: 0,
    gender: "",
  });

  useEffect(() => {
    if (userData) {
      setForm({
        profilePicture: {
          uri: userData.profileImageKey || "",
          name: userData.profileImageKey || "",
          type: userData.profileImageKey || "",
        },
        username: userData.userName || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        age: userData.age || 0,
        gender: userData.gender || "",
      });
    }
  }, [userData]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 100);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userData) {
      setForm({
        profilePicture: {
          uri: userData.profileImageKey || "",
          name: userData.profileImageKey || "",
          type: userData.profileImageKey || "",
        },
        username: userData.userName || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        age: userData.age || 0,
        gender: userData.gender || "",
      });
    }
  };

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const updateField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const user = await getUser();
      const userId = user?.data?.id;
      if (!userId) throw new Error("No user ID found.");
      const fileType = selectedImages;
      return await updateUser(userId, {
        ...(selectedImages
          ? {
            profilePicture: {
              uri: selectedImages,
              name: `profile.${fileType}`,
              type: `image/${fileType}`,
            },
          }
          : {}),
        userName: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
      });
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
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error.message || "Failed to update profile.",
      });
    },
  });

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScreenHeader
        title={isEditing ? "Edit Profile" : "Profile"}
        showBack
        rightAction={{
          icon: isEditing ? "close-circle-outline" : "create-outline",
          Label: isEditing ? "Cancel" : "Edit",
          onPress: isEditing ? handleCancelEdit : handleStartEdit,
        }}
      />

      <ScrollContent
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}
        ref={scrollViewRef}
      >
        <ScrollInner>
          {/* ── Avatar ── */}
          <AvatarSection>
            <AvatarRing>
              <AvatarText>
                {form?.profilePicture|| selectedImages ? (
                  <Image
                    source={{ uri: form?.profilePicture?.uri || selectedImages }}
                    style={{ borderRadius: 45, width: 90, height: 90 }}
                  />
                ) : (
                  (form.firstName?.charAt(0).toUpperCase() || "") +
                  (form.lastName?.charAt(0).toUpperCase() || "")
                )}
              </AvatarText>
            </AvatarRing>
            {isEditing && (
              <AvatarEditBadge onPress={() => refRBSheet.current?.present()}>
                <Ionicons name="camera" size={16} color="#fff" />
              </AvatarEditBadge>
            )}
            {isEditing && <AvatarHint>Tap the camera to change photo</AvatarHint>}
          </AvatarSection>

          {/* ── Personal Info ── */}
          <SectionLabel>Personal Info</SectionLabel>
          <Card>
            <EditableField
              label="Username"
              value={form.username}
              icon="at"
              colors={iconColors.username}
              isFocused={focusedField === "username"}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              onChangeText={(t) => updateField("username", t)}
              autoCapitalize="none"
              editable={isEditing}
              inputRef={usernameInputRef}
              isEditing={isEditing}
            />
            <FieldDivider />
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
              isEditing={isEditing}
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
            />
            <FieldDivider />
            <EditableField
              label="Mobile Number"
              value={form.phone || ""}
              icon="call-outline"
              colors={iconColors.phone}
              isFocused={focusedField === "phone"}
              onFocus={() => setFocusedField("phone")}
              onBlur={() => setFocusedField(null)}
              onChangeText={(t) => updateField("phone", t)}
              keyboardType="phone-pad"
              editable={isEditing}
              isEditing={isEditing}
            />
          </Card>

          <SectionLabel>More Details</SectionLabel>
          <Card>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <FieldRow>
                <FieldIconBox style={{ backgroundColor: iconColors.dob.bg }}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={iconColors.dob.icon}
                  />
                </FieldIconBox>
                <FieldContent>
                  <FieldLabel>Age</FieldLabel>
                  <AgeInput hasValue={!!form.age}>{form.age || "Not specified"}</AgeInput>
                </FieldContent>
                {isEditing && (
                  <EditChip>
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={theme.colors.primary}
                    />
                  </EditChip>
                )}
              </FieldRow>
            </TouchableOpacity>

            <FieldDivider />

            <FieldRow
              style={{ flexDirection: "column", alignItems: "flex-start" }}
            >
              <GenderLabelRow>
                <FieldIconBox style={{ backgroundColor: iconColors.gender.bg }}>
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
                  const selected = form.gender?.toLowerCase() === opt.label.toLowerCase() || form.gender?.toLowerCase() === opt.icon.toLowerCase();
                  return (
                    <GenderChip
                      key={opt.label}
                      selected={selected}
                      onPress={() => isEditing && updateField("gender", opt.label)}
                      activeOpacity={isEditing ? 0.8 : 1}
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
            </FieldRow>
          </Card>
        </ScrollInner>
      </ScrollContent>

      {isEditing && (
        <SaveButton
          onPress={() => updateProfileMutation.mutate()}
          disabled={updateProfileMutation.isPending}
          activeOpacity={0.8}
        >
          <SaveButtonText>
            {updateProfileMutation.isPending ? "Saving Profile..." : "Save Profile"}
          </SaveButtonText>
        </SaveButton>
      )}

      <BottomSheet ref={refRBSheet}>
        <AddDocumentSheet
          onGalleryPick={() => {
            handleGalleryPick(() => refRBSheet.current?.dismiss(), "Profile");
          }}
          onCameraOpen={() => {
            handleOpenCamera(() => refRBSheet.current?.dismiss());
          }}
          onDocumentPick={() => { }}
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
    </View>
  );
}

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

const SaveButton = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.primary};
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  margin-horizontal: 20px;
  margin-bottom: 24px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 10px;
  elevation: 5;
`;

const SaveButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
`;
