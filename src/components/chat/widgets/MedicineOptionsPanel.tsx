import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { parseChosenJson } from "./MedicineHelpers";

export interface MedicineOptionsPanelProps {
  optionsList: any[];
  isDark: boolean;
  theme: any;
  onOptionPress: (key: string, label: string) => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function MedicineOptionsPanel({
  optionsList,
  isDark,
  theme,
  onOptionPress,
  readOnly,
  chosenVal,
  chosenLabel,
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
    <View style={styles.optionsPanel} pointerEvents={readOnly ? "none" : "auto"}>
      {safeOptionsList.map((opt: any) => {
        const isChosen = readOnly && (
          (chosenVal && (
            String(opt.key).toLowerCase() === String(chosenVal).toLowerCase() ||
            (parsedKey && String(opt.key).toLowerCase() === String(parsedKey).toLowerCase())
          )) ||
          (chosenLabel && String(opt.label).toLowerCase() === String(chosenLabel).toLowerCase())
        );
        const isUnchosen = readOnly && !isChosen;
        const isPrimary = !readOnly && opt.primary;

        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.optionsPanelButton,
              {
                backgroundColor: isPrimary
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
                opacity: isUnchosen ? 0.55 : 1,
              },
            ]}
            onPress={() => onOptionPress(opt.key, opt.label)}
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
                {opt.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

