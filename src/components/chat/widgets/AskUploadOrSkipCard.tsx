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

  const isUploadChosen = isHistorical && (
    chosenVal === "UPLOAD" ||
    (chosenLabel && String(chosenLabel).toLowerCase() === String(uploadLabel).toLowerCase())
  );
  const isManualChosen = isHistorical && (
    chosenVal === "MANUAL" ||
    (chosenLabel && String(chosenLabel).toLowerCase() === String(manualLabel).toLowerCase())
  );

  const uploadOpacity = isHistorical ? (isUploadChosen ? 1 : 0.55) : 1;
  const manualOpacity = isHistorical ? (isManualChosen ? 1 : 0.55) : 1;

  return (
    <View style={styles.optionContainer} pointerEvents={isHistorical ? "none" : "auto"}>
      <TouchableOpacity
        disabled={isHistorical}
        style={[
          styles.optionCard,
          {
            backgroundColor: isHistorical
              ? (isUploadChosen ? theme.colors.primary + "15" : "rgba(100, 116, 139, 0.1)")
              : theme.colors.primary + "15",
            opacity: uploadOpacity,
            borderWidth: isUploadChosen ? 2 : 0,
            borderColor: isUploadChosen ? theme.colors.primary : "transparent",
          },
        ]}
        onPress={handleDocumentUpload}
      >
        {isUploadChosen && (
          <View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
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
          style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
        >
          {uploadLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={isHistorical}
        style={[
          styles.optionCard,
          {
            backgroundColor: "rgba(100, 116, 139, 0.1)",
            opacity: manualOpacity,
            borderWidth: isManualChosen ? 2 : 0,
            borderColor: isManualChosen ? theme.colors.primary : "transparent",
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
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
          </View>
        )}
        <View style={[styles.iconCircle, { backgroundColor: "#64748b" }]}>
          <Ionicons name="create" size={24} color="#fff" />
        </View>
        <Text
          style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
        >
          {manualLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
export default AskUploadOrSkipCard;
