import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";

export interface AskUploadOrSkipCardProps {
  activeMsg: any;
  preferredLang: string;
  theme: any;
  isHistorical?: boolean;
  handleDocumentUpload: () => void;
  sendMessage: (userText: string, updatedState?: any, displayLabel?: string) => Promise<void> | void;
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function AskUploadOrSkipCard({
  activeMsg,
  preferredLang,
  theme,
  isHistorical,
  handleDocumentUpload,
  sendMessage,
  state,
  setState,
  chosenVal,
  chosenLabel,
}: AskUploadOrSkipCardProps) {
  const uiT = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const uploadOpt =
    (activeMsg?.options || []).find((o: any) => o.value === "UPLOAD") || {};
  const manualOpt =
    (activeMsg?.options || []).find((o: any) => o.value === "MANUAL") || {};
  const uploadLabel = uploadOpt.label || uiT("useDocument");
  const manualLabel = manualOpt.label || uiT("editManuallyInstead");

  const isUploadChosen = isHistorical && !!(
    chosenVal === "UPLOAD" ||
    chosenVal === "DOCUMENT_UPLOADED" ||
    (chosenVal && String(chosenVal).toLowerCase().includes("upload")) ||
    (chosenLabel && (
      String(chosenLabel).toLowerCase() === String(uploadLabel).toLowerCase() ||
      String(chosenLabel).toLowerCase().includes("document uploaded") ||
      String(chosenLabel).toLowerCase().includes("upload")
    ))
  );
  const isManualChosen = isHistorical && !!(
    chosenVal === "MANUAL" ||
    (chosenVal && String(chosenVal).toLowerCase().includes("manual")) ||
    (chosenLabel && (
      String(chosenLabel).toLowerCase() === String(manualLabel).toLowerCase() ||
      String(chosenLabel).toLowerCase().includes("manual")
    ))
  );

  const uploadOpacity = isHistorical ? (isUploadChosen ? 1 : 0.45) : 1;
  const manualOpacity = isHistorical ? (isManualChosen ? 1 : 0.45) : 1;

  return (
    <View style={styles.optionContainer} pointerEvents={isHistorical ? "none" : "auto"}>
      <TouchableOpacity
        disabled={isHistorical}
        style={[
          styles.optionCard,
          {
            backgroundColor: isHistorical
              ? (isUploadChosen ? theme.colors.primary + "22" : "rgba(100, 116, 139, 0.08)")
              : theme.colors.primary + "15",
            opacity: uploadOpacity,
            borderWidth: isUploadChosen ? 2 : 1,
            borderColor: isUploadChosen ? theme.colors.primary : (isHistorical ? "transparent" : "rgba(100, 116, 139, 0.15)"),
          },
        ]}
        onPress={handleDocumentUpload}
      >
        {isUploadChosen && (
          <View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isHistorical
                ? (isUploadChosen ? theme.colors.primary : "#64748b")
                : theme.colors.primary,
            },
          ]}
        >
          <Ionicons name="cloud-upload" size={24} color="#fff" />
        </View>
        <Text
          style={[
            styles.optionTitle,
            {
              color: isUploadChosen ? theme.colors.primary : theme.colors.textPrimary,
              fontWeight: isUploadChosen ? "700" : "600",
            },
          ]}
        >
          {uploadLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={isHistorical}
        style={[
          styles.optionCard,
          {
            backgroundColor: isHistorical
              ? (isManualChosen ? theme.colors.primary + "22" : "rgba(100, 116, 139, 0.08)")
              : "rgba(100, 116, 139, 0.1)",
            opacity: manualOpacity,
            borderWidth: isManualChosen ? 2 : 1,
            borderColor: isManualChosen ? theme.colors.primary : (isHistorical ? "transparent" : "rgba(100, 116, 139, 0.15)"),
          },
        ]}
        onPress={() => {
          const newState = { ...state, flowMode: "MANUAL" };
          setState(newState);
          sendMessage("MANUAL", newState, manualLabel);
        }}
      >
        {isManualChosen && (
          <View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isHistorical
                ? (isManualChosen ? theme.colors.primary : "#64748b")
                : "#64748b",
            },
          ]}
        >
          <Ionicons name="create" size={24} color="#fff" />
        </View>
        <Text
          style={[
            styles.optionTitle,
            {
              color: isManualChosen ? theme.colors.primary : theme.colors.textPrimary,
              fontWeight: isManualChosen ? "700" : "600",
            },
          ]}
        >
          {manualLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
export default AskUploadOrSkipCard;
