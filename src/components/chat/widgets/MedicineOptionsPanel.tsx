import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { parseChosenJson } from "./MedicineHelpers";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";

export interface MedicineOptionsPanelProps {
  optionsList: any[];
  isDark: boolean;
  theme: any;
  onOptionPress: (key: string, label: string) => void;
  readOnly?: boolean;
  loading?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
  preferredLang?: string;
}

export function MedicineOptionsPanel({
  optionsList,
  isDark,
  theme,
  onOptionPress,
  readOnly,
  loading,
  chosenVal,
  chosenLabel,
  preferredLang,
}: MedicineOptionsPanelProps) {
  const getOptionIcon = (key: string) => {
    if (key === "ADD") return "add-circle";
    if (key === "DASHBOARD") return "grid";
    if (key === "ASK_REPORT") return "document-text";
    return "arrow-forward-circle";
  };

  const safeOptionsList = optionsList || [];
  const parsed = parseChosenJson(chosenVal);
  const parsedKey = parsed?.key || null;

  return (
    <View
      style={styles.optionsPanel}
      pointerEvents={readOnly || loading ? "none" : "auto"}
    >
      {safeOptionsList.map((opt: any) => {
        const optKey = opt.key || opt.value;
        const isChosen = readOnly && !!(
          (chosenVal && (
            String(optKey).toLowerCase() === String(chosenVal).toLowerCase() ||
            (opt.value && String(opt.value).toLowerCase() === String(chosenVal).toLowerCase()) ||
            (parsedKey && String(optKey).toLowerCase() === String(parsedKey).toLowerCase())
          )) ||
          (chosenLabel && String(opt.label).toLowerCase() === String(chosenLabel).toLowerCase())
        );
        const isUnchosen = readOnly && !isChosen;
        const isPrimary = !readOnly && opt.primary;

        const resolveLabel = () => {
          if (!opt.label || optKey === "ADD" || optKey === "ADD_MEDICINES") {
            const lang = (preferredLang || "english").toLowerCase();
            const localized = I18N_ONBOARDING_UI[lang]?.addMedicines || I18N_ONBOARDING_UI.english?.addMedicines;
            if (localized && (opt.label === "Add Medicines" || !opt.label || lang !== "english")) {
              return localized;
            }
          }
          return opt.label;
        };
        const displayLabel = resolveLabel();

        return (
          <TouchableOpacity
            key={optKey}
            disabled={readOnly || loading}
            style={[
              styles.optionsPanelButton,
              {
                backgroundColor: isChosen
                  ? theme.colors.primary + "20"
                  : isPrimary
                    ? theme.colors.primary
                    : isDark
                      ? "#1e293b"
                      : "#f1f5f9",
                borderColor: isChosen
                  ? theme.colors.primary
                  : isPrimary
                    ? theme.colors.primary
                    : isDark
                      ? "#334155"
                      : "#e2e8f0",
                borderWidth: isChosen ? 2 : 1,
                opacity: isUnchosen || loading ? 0.5 : 1,
              },
            ]}
            onPress={() => onOptionPress(optKey, displayLabel)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons
                name={isChosen ? "checkmark-circle" : getOptionIcon(opt.key)}
                size={20}
                color={isChosen ? "#22c55e" : isPrimary ? "#ffffff" : theme.colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.optionsPanelText,
                  { color: isPrimary ? "#ffffff" : theme.colors.textPrimary, flex: 1 },
                ]}
              >
                {displayLabel}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

