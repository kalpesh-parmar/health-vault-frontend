import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { parseChosenJson } from "./MedicineHelpers";
import { useProfileSourceState } from "./profile-source/useProfileSourceState";
import { ProfileFieldEditor } from "./profile-source/ProfileFieldEditor";
import {
  ProfileConflictSelector,
  ProfileSourceActions,
  ProfileEditSource,
} from "./profile-source/ProfileConflictSelector";
import { ProfileConfirmView } from "./profile-source/ProfileConfirmView";

export interface ResolveProfileSourceCardProps {
  activeMsg: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  sendMessage: (
    userText: string,
    updatedState?: any,
    displayLabel?: string,
    actionType?: string,
  ) => Promise<void> | void;
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
  const [localEditedData, setLocalEditedData] = useState<Record<string, any>>({});
  const [editedSource, setEditedSource] = useState<ProfileEditSource | "MANUAL" | null>(null);
  const [locallySelectedSource, setLocallySelectedSource] =
    useState<ProfileEditSource | null>(null);

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
  const chosenSource =
    typeof parsed?.source === "string" ? parsed.source.toUpperCase() : null;
  const replySelectedSource: ProfileEditSource | null =
    chosenSource === "LOGIN"
      ? "LOGIN"
      : chosenSource === "DOCUMENT"
        ? "DOCUMENT"
        : [
              uiT("useSocialLogin") || "Use Social Login",
              uiT("useEditedInformation") || "Use Edited Information",
            ].includes(chosenLabel || "")
          ? "LOGIN"
          : [
                uiT("useDocument") || "Use Document",
                uiT("manualDetails") || "Manual Details",
              ].includes(chosenLabel || "")
            ? "DOCUMENT"
            : null;
  const selectedProfileSource = replySelectedSource ?? locallySelectedSource;

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

  const handleStartManualEdit = (source: ProfileEditSource | "MANUAL" = "MANUAL") => {
    const initData: any = {};
    fields.forEach((f) => {
      const sourceValue =
        source === "DOCUMENT"
          ? f.documentValue || (f.isMismatch ? "" : f.value)
          : source === "LOGIN"
            ? f.loginValue || (f.isMismatch ? "" : f.value)
            : f.value;
      const rawVal =
        localEditedData?.[source]?.[f.key] !== undefined
          ? localEditedData[source][f.key]
          : (sourceValue || "");
      initData[f.key] = f.key === "gender" ? normalizeGenderFrontend(rawVal) : rawVal;
    });
    setEditedSource(source);
    setEditedProfileData(initData);
    setIsEditingProfileManually(true);
  };

  const handleSaveManualEdit = (data: any) => {
    setIsEditingProfileManually(false);
    setLocalEditedData((previous) => ({
      ...previous,
      [editedSource || "MANUAL"]: data,
    }));
  };

  const getStateWithEditedSource = (source = editedSource) => {
    const editedData = source ? localEditedData[source] : null;
    if (!editedData || !source) return state;

    // Keep the existing generic manual-edit behavior for the non-conflict flow.
    if (editedSource === "MANUAL") {
      return {
        ...state,
        existingUserData: {
          ...(state?.existingUserData || {}),
          ...editedData,
        },
      };
    }

    const sourceKey = editedSource === "DOCUMENT" ? "documentData" : "socialData";
    return {
      ...state,
      profileSource: editedSource,
      [sourceKey]: {
        ...(state?.[sourceKey] || {}),
        ...editedData,
      },
    };
  };

  const handleConfirmProfile = () => {
    setLocallySelectedSource(null);
    const editedData = localEditedData.MANUAL;
    const payload = editedData
      ? { ...editedData, confirmed: true, source: "MANUAL", edited: editedData }
      : { confirmed: true };
    const updatedState = {
      ...getStateWithEditedSource("MANUAL"),
      documentConfirmed: true,
    };
    sendMessage(
      JSON.stringify(payload),
      updatedState,
      uiT("confirmAndContinue") || "Confirm & Continue",
      "RESOLVE_PROFILE_SOURCE",
    );
  };

  const handleSelectProvider = () => {
    const editedData = localEditedData.LOGIN;
    const payload = editedData
      ? { ...editedData, source: "LOGIN", edited: editedData }
      : { source: "LOGIN" };
    const updatedState = editedData ? getStateWithEditedSource("LOGIN") : state;
    sendMessage(
      JSON.stringify(payload),
      updatedState,
      editedData ? (uiT("useEditedInformation") || "Use Edited Information") : (uiT("useSocialLogin") || "Use Social Login"),
      "RESOLVE_PROFILE_SOURCE",
    );
  };

  const handleSelectDocument = () => {
    const editedData = localEditedData.DOCUMENT;
    const updatedState = {
      ...(editedData ? getStateWithEditedSource("DOCUMENT") : state),
      documentConfirmed: true,
    };
    sendMessage(
      JSON.stringify(
        editedData
          ? { ...editedData, source: "DOCUMENT", edited: editedData }
          : { source: hasDocumentUploaded ? "DOCUMENT" : "MANUAL" },
      ),
      updatedState,
      hasDocumentUploaded
        ? (uiT("useDocument") || "Use Document")
        : (uiT("manualDetails") || "Manual Details"),
      "RESOLVE_PROFILE_SOURCE",
    );
  };

  const handleSelectProviderAndRemember = () => {
    setLocallySelectedSource("LOGIN");
    handleSelectProvider();
  };

  const handleSelectDocumentAndRemember = () => {
    setLocallySelectedSource("DOCUMENT");
    handleSelectDocument();
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
        <>
          <ProfileConfirmView
            fields={fields}
            localEditedData={localEditedData.MANUAL}
            parsed={parsed}
            chosenLabel={chosenLabel}
            isHistorical={isHistorical}
            isDark={isDark}
            theme={theme}
            uiT={uiT}
            getFieldIcon={getFieldIcon}
            onConfirm={handleConfirmProfile}
            onEditManually={() => handleStartManualEdit("MANUAL")}
          />
          {selectedProfileSource && (
            <ProfileSourceActions
              selectedSource={selectedProfileSource}
              isHistorical={isHistorical}
              leftButtonText={
                localEditedData.LOGIN
                  ? uiT("useEditedInformation") || "Use Edited Information"
                  : uiT("useSocialLogin") || "Use Social Login"
              }
              uiT={uiT}
              onSelectProvider={handleSelectProviderAndRemember}
              onSelectDocument={handleSelectDocumentAndRemember}
            />
          )}
        </>
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
          onSelectProvider={handleSelectProviderAndRemember}
          onSelectDocument={handleSelectDocumentAndRemember}
          onEditManually={handleStartManualEdit}
          selectedSource={selectedProfileSource}
          isHistorical={isHistorical}
        />
      )}
    </View>
  );
}
