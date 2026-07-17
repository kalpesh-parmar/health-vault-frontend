import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { parseChosenJson } from "./MedicineHelpers";

interface OptionItem {
  label: string;
  value: string;
  key?: string;
  primary?: boolean;
}

interface HistoricalChipsProps {
  options: (OptionItem | string)[];
  chosenVal: string | null;
  chosenLabel: string | null;
  theme: any;
}

/**
 * Searches for the chronologically subsequent user reply to a specific message.
 * Supporting both inverted lists (used in AIChatScreen) and chronological lists (used in OnboardingScreen).
 */
export function findHistoricalUserReply(
  messages: any[],
  activeMsgId: string,
  isInverted: boolean = false
): { chosenVal: string | null; chosenLabel: string | null } {
  const idx = messages.findIndex((m) => m.id === activeMsgId);
  if (idx === -1) return { chosenVal: null, chosenLabel: null };

  let nextMsg = null;
  if (isInverted) {
    // Scan backward (lower indices in newest-first array)
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        nextMsg = messages[i];
        break;
      }
    }
  } else {
    // Scan forward (higher indices in oldest-first array)
    for (let i = idx + 1; i < messages.length; i++) {
      if (messages[i].role === "user") {
        nextMsg = messages[i];
        break;
      }
    }
  }

  if (nextMsg) {
    return {
      chosenVal: nextMsg.rawValue || null,
      chosenLabel: nextMsg.text || nextMsg.content || null,
    };
  }
  return { chosenVal: null, chosenLabel: null };
}

export function HistoricalChips({
  options,
  chosenVal,
  chosenLabel,
  theme,
}: HistoricalChipsProps) {
  const safeOptions = options || [];
  const parsed = parseChosenJson(chosenVal);

  return (
    <View style={styles.chipRow} pointerEvents="none">
      {safeOptions.map((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const val = typeof opt === "string" ? opt : opt.value;
        const key = typeof opt === "string" ? null : opt.key;

        // Matching logic supporting JSON shapes and simple values, with backwards-compatible label fallbacks
        const isChosen = !!(
          (chosenVal && (
            String(val).toLowerCase() === String(chosenVal).toLowerCase() ||
            (key && String(key).toLowerCase() === String(chosenVal).toLowerCase()) ||
            (parsed && (
              (parsed.value && String(val).toLowerCase() === String(parsed.value).toLowerCase()) ||
              (parsed.key && String(key || val).toLowerCase() === String(parsed.key).toLowerCase()) ||
              (parsed.confirmed === true && String(val).toLowerCase() === "confirm") ||
              (parsed.confirmed === true && String(val).toLowerCase() === "confirmed")
            ))
          )) ||
          (chosenLabel && (
            String(label).toLowerCase() === String(chosenLabel).toLowerCase() ||
            (chosenLabel.toLowerCase().includes("saved manual changes") && String(val).toLowerCase() === "edit")
          ))
        );

        const isUnchosen = !isChosen && (chosenVal !== null || chosenLabel !== null);

        return (
          <View
            key={val}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.primary,
                opacity: isUnchosen ? 0.55 : 1,
                borderWidth: isChosen ? 2 : 0,
                borderColor: isChosen ? "#ffffff" : "transparent",
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, flexWrap: "wrap" }}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
