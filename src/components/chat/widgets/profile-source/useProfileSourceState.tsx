import React, { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GoogleLogo from "../../../../assets/auth-logos/GoogleLogo";
import AppleLogo from "../../../../assets/auth-logos/AppleLogo";
import FacebookLogo from "../../../../assets/auth-logos/FacebookLogo";
import MicrosoftLogo from "../../../../assets/auth-logos/MicrosoftLogo";
import { I18N_ONBOARDING_UI } from "../OnboardingI18n";

export interface ProfileField {
  key: string;
  label: string;
  value: string;
  loginValue?: string;
  documentValue?: string;
  verified?: boolean;
  isMismatch?: boolean;
}

export interface UseProfileSourceStateProps {
  activeMsg: any;
  state: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
}

export function useProfileSourceState({
  activeMsg,
  state,
  preferredLang,
  isDark,
  theme,
}: UseProfileSourceStateProps) {
  const onboardingState = activeMsg?.onboardingState || state;
  const rawProvider =
    activeMsg?.loginProvider ||
    onboardingState?.loginProvider ||
    state?.loginProvider ||
    activeMsg?.provider ||
    onboardingState?.provider ||
    "";
  const loginProvider = typeof rawProvider === "string" ? rawProvider.toLowerCase().trim() : "";

  const isSocialLogin = Boolean(
    loginProvider &&
    ["google", "facebook", "microsoft", "apple", "social"].includes(loginProvider)
  );

  const rawMode = activeMsg?.mode || "CONFIRM";
  const mode: "CONFLICT" | "CONFIRM" =
    (rawMode === "CONFLICT" || activeMsg?.action === "RESOLVE_PROFILE_SOURCE") && isSocialLogin
      ? "CONFLICT"
      : "CONFIRM";

  const [isEditingProfileManually, setIsEditingProfileManually] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");

  const uiT = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  let fields: ProfileField[] = activeMsg?.fields || [];
  if (!fields || fields.length === 0) {
    const documentData = onboardingState?.documentData || {};
    const loginData = onboardingState?.loginData || {};
    const existingUserData = onboardingState?.existingUserData || {};

    const fieldKeys = [
      { key: "firstName", label: uiT("firstName") || "First Name" },
      { key: "lastName", label: uiT("lastName") || "Last Name" },
      { key: "dateOfBirth", label: uiT("dateOfBirth") || "Date of Birth" },
      { key: "gender", label: uiT("gender") || "Gender" },
      { key: "email", label: uiT("email") || "Email" },
      { key: "phoneNumber", label: uiT("phoneNumber") || "Phone Number" },
    ];

    fields = fieldKeys.map((f) => {
      const docVal = documentData[f.key] || existingUserData[f.key] || "";
      const loginVal = loginData[f.key]?.value || onboardingState?.socialData?.[f.key] || "";
      const isVerified = loginData[f.key]?.verified || false;

      const defaultValue = docVal || loginVal || "";
      const hasLoginVal = loginVal && String(loginVal).trim();
      const hasDocVal = docVal && String(docVal).trim();
      const isMismatch =
        hasLoginVal &&
        hasDocVal &&
        String(loginVal).trim().toLowerCase() !== String(docVal).trim().toLowerCase();

      return {
        key: f.key,
        label: f.label,
        value: defaultValue,
        loginValue: loginVal,
        documentValue: docVal,
        verified: isVerified,
        isMismatch: Boolean(isMismatch),
      };
    });
  }

  const normalizeGenderFrontend = (rawVal: string | null | undefined): string => {
    if (!rawVal || typeof rawVal !== "string") return "";
    const cleaned = rawVal.trim().toLowerCase();
    if (!cleaned) return "";

    if (cleaned === "male" || cleaned === "m") return "male";
    if (cleaned === "female" || cleaned === "f") return "female";
    if (cleaned === "other") return "other";

    for (const langDict of Object.values(I18N_ONBOARDING_UI)) {
      if (langDict.male && langDict.male.trim().toLowerCase() === cleaned) return "male";
      if (langDict.female && langDict.female.trim().toLowerCase() === cleaned) return "female";
      if (langDict.other && langDict.other.trim().toLowerCase() === cleaned) return "other";
    }

    return cleaned;
  };

  const getFieldIcon = (key: string): any => {
    switch (key) {
      case "firstName":
      case "lastName":
        return "person-outline";
      case "phoneNumber":
      case "mobile":
        return "call-outline";
      case "dateOfBirth":
      case "dob":
        return "calendar-outline";
      case "gender":
        return "male-female-outline";
      case "email":
        return "mail-outline";
      case "bloodGroup":
        return "water-outline";
      default:
        return "help-circle-outline";
    }
  };

  const renderProviderLogo = (
    p: string | undefined,
    size: number = 18,
    isButton: boolean = false,
  ) => {
    if (!p) {
      return (
        <Ionicons
          name="person-circle-outline"
          size={size}
          color={isButton ? "#ffffff" : "#3b82f6"}
          style={{ marginRight: 6 }}
        />
      );
    }
    const norm = p.toLowerCase().trim();
    switch (norm) {
      case "google":
        return (
          <View style={{ marginRight: 6, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <GoogleLogo width={size} height={size} />
          </View>
        );
      case "apple":
        return (
          <View style={{ marginRight: 6, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <AppleLogo width={size} height={size} color={isButton ? "#ffffff" : isDark ? "#ffffff" : "#000000"} />
          </View>
        );
      case "facebook":
        return (
          <View style={{ marginRight: 6, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <FacebookLogo width={size} height={size} />
          </View>
        );
      case "microsoft":
        return (
          <View style={{ marginRight: 6, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <MicrosoftLogo width={size} height={size} />
          </View>
        );
      case "mobile":
      case "phone":
        return (
          <Ionicons
            name="call"
            size={size}
            color={isButton ? "#ffffff" : theme?.colors?.primary || "#5B4BFF"}
            style={{ marginRight: 6 }}
          />
        );
      case "email":
        return (
          <Ionicons
            name="mail"
            size={size}
            color={isButton ? "#ffffff" : theme?.colors?.primary || "#5B4BFF"}
            style={{ marginRight: 6 }}
          />
        );
      default:
        return (
          <Ionicons
            name="person-circle-outline"
            size={size}
            color={isButton ? "#ffffff" : "#3b82f6"}
            style={{ marginRight: 6 }}
          />
        );
    }
  };

  const getProviderLabel = (p: string | undefined) => {
    if (!p) return uiT("fromSocialLogin");
    switch (p.toLowerCase()) {
      case "google":
        return uiT("fromGoogle");
      case "facebook":
        return uiT("fromFacebook");
      case "apple":
        return uiT("fromApple");
      case "microsoft":
        return uiT("fromMicrosoft");
      case "mobile":
      case "phone":
        return uiT("fromPhone");
      case "email":
        return uiT("fromEmail");
      default:
        return uiT("fromSocialLogin");
    }
  };

  return {
    onboardingState,
    loginProvider,
    isSocialLogin,
    mode,
    fields,
    isEditingProfileManually,
    setIsEditingProfileManually,
    editedProfileData,
    setEditedProfileData,
    isDatePickerVisible,
    setDatePickerVisible,
    datePickerMode,
    setDatePickerMode,
    uiT,
    normalizeGenderFrontend,
    getFieldIcon,
    renderProviderLogo,
    getProviderLabel,
  };
}
