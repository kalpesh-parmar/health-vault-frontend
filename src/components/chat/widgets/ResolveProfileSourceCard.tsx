import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { parseChosenJson } from "./MedicineHelpers";
import { useProfileSourceState } from "./profile-source/useProfileSourceState";
import { ProfileFieldEditor } from "./profile-source/ProfileFieldEditor";
import { ProfileConflictSelector } from "./profile-source/ProfileConflictSelector";
import { ProfileConfirmView } from "./profile-source/ProfileConfirmView";

export interface ResolveProfileSourceCardProps {
  activeMsg: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  sendMessage: (userText: string, updatedState?: any, displayLabel?: string) => Promise<void> | void;
  state: any;
  isHistorical?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function ResolveProfileSourceCard({
  activeMsg,
  preferredLang,
  isDark,
  theme,
  sendMessage,
  state,
  isHistorical,
  chosenVal,
  chosenLabel,
}: ResolveProfileSourceCardProps) {
  const [localEditedData, setLocalEditedData] = useState<any>(null);

  const {
    onboardingState,
    loginProvider,
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
  } = useProfileSourceState({
    activeMsg,
    state,
    preferredLang,
    isDark,
    theme,
  });

  const parsed = parseChosenJson(chosenVal);

  const hasDocumentUploaded = Boolean(
    onboardingState?.uploadedMedicalDocument ||
    state?.uploadedMedicalDocument ||
    onboardingState?.documentUploaded ||
    state?.documentUploaded ||
    onboardingState?.documentExtracted ||
    state?.documentExtracted ||
    onboardingState?.flowMode === "UPLOAD" ||
    state?.flowMode === "UPLOAD" ||
    onboardingState?.documentId ||
    state?.documentId ||
    activeMsg?.documentSummary ||
    activeMsg?.document ||
    (onboardingState?.documentData && Object.keys(onboardingState.documentData).length > 0)
  );

  const handleStartManualEdit = () => {
    const initData: any = {};
    fields.forEach((f) => {
      const rawVal =
        localEditedData && localEditedData[f.key] !== undefined
          ? localEditedData[f.key]
          : f.value || "";
      initData[f.key] = f.key === "gender" ? normalizeGenderFrontend(rawVal) : rawVal;
    });
    setEditedProfileData(initData);
    setIsEditingProfileManually(true);
  };

  const handleSaveManualEdit = (data: any) => {
    setIsEditingProfileManually(false);
    setLocalEditedData(data);
  };

  const handleConfirmProfile = () => {
    const payload = localEditedData
      ? { confirmed: true, edited: localEditedData }
      : { confirmed: true };
    const updatedState = {
      ...state,
      documentConfirmed: true,
      ...(localEditedData
        ? { existingUserData: { ...(state?.existingUserData || {}), ...localEditedData } }
        : {}),
    };
    sendMessage(
      JSON.stringify(payload),
      updatedState,
      uiT("confirmAndContinue"),
    );
  };

  const handleSelectProvider = () => {
    const isManual = Boolean(localEditedData);
    const payload = { source: isManual ? "MANUAL" : "LOGIN" };
    const updatedState = isManual
      ? { ...state, existingUserData: { ...(state?.existingUserData || {}), ...localEditedData } }
      : state;
    sendMessage(
      JSON.stringify(payload),
      updatedState,
      isManual ? (uiT("useEditedInformation") || "Use Edited Information") : uiT("useSocialLogin"),
    );
  };

  const handleSelectDocument = () => {
    const updatedState = {
      ...state,
      documentConfirmed: true,
    };
    sendMessage(
      JSON.stringify({ source: hasDocumentUploaded ? "DOCUMENT" : "MANUAL" }),
      updatedState,
      hasDocumentUploaded
        ? (uiT("useDocument") || "Use Document")
        : (uiT("manualDetails") || "Manual Details"),
    );
  };

  if (isEditingProfileManually && !isHistorical) {
    return (
      <View style={styles.resolveCardContainer}>
        <ProfileFieldEditor
          fields={fields}
          editedProfileData={editedProfileData}
          setEditedProfileData={setEditedProfileData}
          isDatePickerVisible={isDatePickerVisible}
          setDatePickerVisible={setDatePickerVisible}
          datePickerMode={datePickerMode}
          setDatePickerMode={setDatePickerMode}
          isDark={isDark}
          theme={theme}
          uiT={uiT}
          getFieldIcon={getFieldIcon}
          normalizeGenderFrontend={normalizeGenderFrontend}
          onSave={handleSaveManualEdit}
          onCancel={() => setIsEditingProfileManually(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.resolveCardContainer}>
      {/* Header */}
      <View style={styles.resolveCardHeader}>
        <View
          style={[
            styles.shieldIconContainer,
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.2)"
                : "#eff6ff",
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary }]}>
            {activeMsg?.title ||
              (mode === "CONFIRM"
                ? uiT("confirmYourProfileDetails")
                : uiT("weFoundTwoDifferentProfiles"))}
          </Text>
          <Text style={[styles.resolveCardSubtitle, { color: theme.colors.textSecondary }]}>
            {activeMsg?.subtitle ||
              (mode === "CONFIRM"
                ? uiT("pleaseCheckAndConfirmAllDetails")
                : uiT("pleaseReviewAndChooseOneYouPrefer"))}
          </Text>
        </View>
      </View>

      {mode === "CONFIRM" ? (
        <ProfileConfirmView
          fields={fields}
          localEditedData={localEditedData}
          parsed={parsed}
          chosenLabel={chosenLabel}
          isHistorical={isHistorical}
          isDark={isDark}
          theme={theme}
          uiT={uiT}
          getFieldIcon={getFieldIcon}
          onConfirm={handleConfirmProfile}
          onEditManually={handleStartManualEdit}
        />
      ) : (
        <ProfileConflictSelector
          fields={fields}
          loginProvider={loginProvider}
          localEditedData={localEditedData}
          isDark={isDark}
          theme={theme}
          uiT={uiT}
          getFieldIcon={getFieldIcon}
          renderProviderLogo={renderProviderLogo}
          getProviderLabel={getProviderLabel}
          onSelectProvider={handleSelectProvider}
          onSelectDocument={handleSelectDocument}
          onEditManually={handleStartManualEdit}
          isHistorical={isHistorical}
        />
      )}
    </View>
  );
}
