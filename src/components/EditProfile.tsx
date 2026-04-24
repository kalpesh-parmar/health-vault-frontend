import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "./shared/Header";
import { ProfileStackParamList } from "../navigation/types";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { updateUser } from "../services/authService";
import { queryClient } from "../config/queryClient";
import Toast from "react-native-toast-message";
import PrimaryButton from "./shared/Buttons/PrimaryButton";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const ICON_COLORS = {
  username: { bg: "#eff6ff", icon: "#2563eb" },
  fullname: { bg: "#f0fdf4", icon: "#16a34a" },
  email: { bg: "#fff7ed", icon: "#ea580c" },
  password: { bg: "#fdf4ff", icon: "#9333ea" },
  dob: { bg: "#fefce8", icon: "#ca8a04" },
  phone: { bg: "#f0fdfa", icon: "#0d9488" },
};

type EditProfileRouteProp = RouteProp<ProfileStackParamList, "EditProfile">;

type ProfileFormState = {
  username: string;
  fullname: string;
  email: string;
  password: string;
  dob: Date;
  phone: string;
  gender: "male" | "female" | "other";
};

export default function EditProfile({
  route,
}: {
  route: EditProfileRouteProp;
}) {
  const { formData } = route.params;

  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const [form, setForm] = useState<ProfileFormState>({
    username: formData.username,
    fullname: formData.fullname,
    email: formData.email,
    password: formData.password,
    dob: new Date(formData.dob),
    phone: formData.phone,
    gender: formData.gender?.toLowerCase() as "male",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const updateField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const userId = await SecureStore.getItemAsync("userId");
      console.log("userId :- ", userId);
      if (!userId) throw new Error("No user ID found.");

      const payload = {
        userName: form.username,
        fullName: form.fullname,
        email: form.email,
        password: form.password,
        gender: form.gender,
        dateOfBirth: formatDate(form.dob),
        phone: form.phone,
      };

      console.log("Payload :- ", payload);

      return await updateUser(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });

      Toast.show({
        type: "success",
        text1: "Profile Updated",
      });

      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message || "Update failed",
      });
    },
  });

  const formatDate = (date: Date) => {
    return date ? date.toISOString().split("T")[0] : "";
  };

  const onChangeDate = (_: any, selectedDate?: Date) => {
    setShowDate(false);
    if (selectedDate) updateField("dob", selectedDate);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenHeader title="Edit Profile" showBack />

      <ScrollContent keyboardShouldPersistTaps="handled">
        <ScrollInner>
          {/* Avatar */}
          <AvatarSection>
            <AvatarWrapper>
              <AvatarRing>
                <AvatarText>
                  {form.username?.charAt(0).toUpperCase()}
                </AvatarText>
              </AvatarRing>
              <AvatarEditBadge>
                <Ionicons name="camera" size={16} color="#fff" />
              </AvatarEditBadge>
            </AvatarWrapper>
          </AvatarSection>

          {/* Personal Info */}
          <SectionLabel>Personal Info</SectionLabel>
          <Card>
            {[
              { key: "username", label: "Username", icon: "at" },
              { key: "fullname", label: "Full Name", icon: "person-outline" },
            ].map((field, idx) => (
              <View key={field.key}>
                <FieldRow>
                  <FieldIconBox
                    style={{ backgroundColor: ICON_COLORS.username.bg }}
                  >
                    <Ionicons
                      name={field.icon as any}
                      size={18}
                      color={ICON_COLORS.username.icon}
                    />
                  </FieldIconBox>

                  <FieldContent>
                    <FieldLabel>{field.label}</FieldLabel>
                    <FieldInput
                      value={
                        form[field.key as keyof ProfileFormState] as string
                      }
                      onChangeText={(text: string) =>
                        updateField(field.key as any, text)
                      }
                    />
                  </FieldContent>
                </FieldRow>
                {idx < 1 && <FieldDivider />}
              </View>
            ))}
          </Card>

          {/* Gender */}
          <SectionLabel>Gender</SectionLabel>
          <Card>
            <GenderRow>
              {(["male", "female", "other"] as const).map((g) => (
                <GenderChip
                  key={g}
                  selected={form.gender === g}
                  onPress={() => updateField("gender", g)}
                >
                  <GenderChipText selected={form.gender === g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </GenderChipText>
                </GenderChip>
              ))}
            </GenderRow>
          </Card>

          {/* DOB */}
          <SectionLabel>Date of Birth</SectionLabel>
          <Card>
            <FieldRow>
              <FieldIconBox style={{ backgroundColor: ICON_COLORS.dob.bg }}>
                <Ionicons name="calendar-outline" size={18} />
              </FieldIconBox>

              <FieldContent>
                <FieldLabel>Date of Birth</FieldLabel>

                <TouchableOpacity onPress={() => setShowDate(true)}>
                  <FieldValue>{formatDate(form.dob)}</FieldValue>
                </TouchableOpacity>

                {showDate && (
                  <DateTimePicker
                    value={form.dob}
                    mode="date"
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                  />
                )}
              </FieldContent>
            </FieldRow>
          </Card>

          {/* Contact */}
          <SectionLabel>Contact</SectionLabel>
          <Card>
            <FieldRow>
              <FieldContent>
                <FieldLabel>Email</FieldLabel>
                <FieldInput
                  value={form.email}
                  onChangeText={(text: string) => updateField("email", text)}
                />
              </FieldContent>
            </FieldRow>

            <FieldDivider />

            <FieldRow>
              <FieldContent>
                <FieldLabel>Phone</FieldLabel>
                <FieldInput
                  value={form.phone}
                  onChangeText={(text: string) => updateField("phone", text)}
                />
              </FieldContent>
            </FieldRow>
          </Card>

          {/* Password */}
          <SectionLabel>Security</SectionLabel>
          <Card>
            <FieldRow>
              <FieldContent>
                <FieldLabel>Password</FieldLabel>
                <FieldInput
                  value={form.password}
                  onChangeText={(text: string) => updateField("password", text)}
                  secureTextEntry={!showPassword}
                />
              </FieldContent>

              <EyeToggle onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} />
              </EyeToggle>
            </FieldRow>
          </Card>

          <PrimaryButton
            text="Update Profile"
            onPress={() => updateProfileMutation.mutate()}
            isLoading={updateProfileMutation.isPending}
          />
        </ScrollInner>
      </ScrollContent>
    </KeyboardAvoidingView>
  );
}

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
  width: 110px;
  height: 110px;
  border-radius: 38px;
  background-color: #dbeafe;
  justify-content: center;
  align-items: center;
  shadow-color: #2563eb;
  shadow-opacity: 0.2;
  shadow-radius: 18px;
  elevation: 10;
  border-width: 3px;
  border-color: #93c5fd;
`;

const AvatarText = styled.Text`
  font-size: 38px;
  font-weight: 900;
  color: #2563eb;
  letter-spacing: -1px;
`;

const AvatarEditBadge = styled.TouchableOpacity`
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background-color: #2563eb;
  justify-content: center;
  align-items: center;
  border-width: 2.5px;
  border-color: #f8faff;
  shadow-color: #2563eb;
  shadow-opacity: 0.4;
  shadow-radius: 8px;
  elevation: 6;
`;

const AvatarWrapper = styled.View`
  position: relative;
`;

const AvatarLabel = styled.Text`
  margin-top: 14px;
  font-size: 13px;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.2px;
`;

const SectionLabel = styled.Text`
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 4px;
  margin-left: 4px;
`;

const Card = styled.View`
  background-color: #ffffff;
  border-radius: 24px;
  padding: 6px 0px;
  shadow-color: #3b82f6;
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
  background-color: #f1f5f9;
  margin-left: 60px;
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
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
`;

const FieldInput = styled.TextInput`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  padding: 0;
  margin: 0;
`;

const FieldValue = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`;

const FieldArrow = styled.View`
  margin-left: 8px;
`;

const GenderRow = styled.View`
  flex-direction: row;
  gap: 10px;
  padding: 14px 18px;
`;

const GenderChip = styled.TouchableOpacity<{ selected: boolean }>`
  flex: 1;
  padding: 10px 0px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 6px;
  background-color: ${({ selected }: { selected: boolean }) =>
    selected ? "#2563eb" : "#f1f5f9"};
  shadow-color: ${({ selected }: { selected: boolean }) =>
    selected ? "#2563eb" : "transparent"};
  shadow-opacity: ${({ selected }: { selected: boolean }) =>
    selected ? 0.3 : 0};
  shadow-radius: 10px;
  elevation: ${({ selected }: { selected: boolean }) => (selected ? 4 : 0)};
`;

const GenderChipText = styled.Text<{ selected: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ selected }: { selected: boolean }) =>
    selected ? "#ffffff" : "#64748b"};
`;

const EyeToggle = styled.TouchableOpacity`
  padding: 4px;
  margin-left: 8px;
`;

const DangerButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 20px;
  background-color: #fff1f2;
  gap: 8px;
  shadow-color: #ef4444;
  shadow-opacity: 0.08;
  shadow-radius: 10px;
  elevation: 2;
  margin-top: 4px;
`;

const DangerButtonText = styled.Text`
  font-size: 14px;
  font-weight: 800;
  color: #ef4444;
`;
