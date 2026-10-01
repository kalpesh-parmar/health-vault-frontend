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
  disableDashboardOption?: boolean;
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
  disableDashboardOption,
  loading,
  chosenVal,
  chosenLabel,
  preferredLang,
}: MedicineOptionsPanelProps) {
  const getOptionIcon = (key: string) => {
    if (key === "ADD" || key === "ADD_MEDICINES" || key === "ADD_MEDICINE") return "add-circle";
    if (key === "DASHBOARD" || key === "GO_TO_DASHBOARD") return "grid";
    if (key === "ASK_REPORT" || key === "ASK_ABOUT_REPORT") return "document-text";
    return "arrow-forward-circle";
  };

  const isDashboardOption = (opt: any) => {
    const k = String(opt?.key || opt?.value || "").toUpperCase();
    const lbl = String(opt?.label || "").toLowerCase();
    return (
      k === "DASHBOARD" ||
      k === "GO_TO_DASHBOARD" ||
      k === "GO_DASHBOARD" ||
      lbl === "go to dashboard" ||
      lbl === "go to the dashboard" ||
      lbl.includes("dashboard")
    );
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
        const isDashboard = isDashboardOption(opt);
        const isOptDisabled = readOnly || loading || (disableDashboardOption && isDashboard);
        const isUnchosen = (readOnly && !isChosen) || (disableDashboardOption && isDashboard && !readOnly);
        const isPrimary = !readOnly && !isOptDisabled && opt.primary;

        const resolveLabel = () => {
          if (!opt.label || optKey === "ADD" || optKey === "ADD_MEDICINES" || optKey === "ADD_MEDICINE") {
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
            disabled={isOptDisabled}
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
                opacity: isUnchosen || loading || isOptDisabled ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (isOptDisabled) return;
              onOptionPress(optKey, displayLabel);
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons
                name={isChosen ? "checkmark-circle" : getOptionIcon(opt.key || opt.value)}
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
