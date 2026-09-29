import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProfileField } from "./useProfileSourceState";

interface ProfileConfirmViewProps {
  fields: ProfileField[];
  localEditedData: any;
  parsed: any;
  chosenLabel?: string | null;
  isHistorical?: boolean;
  isDark: boolean;
  theme: any;
  uiT: (key: string) => string;
  getFieldIcon: (key: string) => any;
  onConfirm: () => void;
  onEditManually: () => void;
}

export const ProfileConfirmView = React.memo(function ProfileConfirmView({
  fields,
  localEditedData,
  parsed,
  chosenLabel,
  isHistorical,
  isDark,
  theme,
  uiT,
  getFieldIcon,
  onConfirm,
  onEditManually,
}: ProfileConfirmViewProps) {
  const isConfirmChosen =
    isHistorical &&
    (parsed?.confirmed === true ||
      parsed?.source === "CONFIRM" ||
      (chosenLabel &&
        (String(chosenLabel).toLowerCase().includes("confirm") ||
          String(chosenLabel).toLowerCase().includes(uiT("confirmAndContinue").toLowerCase()) ||
          String(chosenLabel).toLowerCase() === "confirm details")));

  const isEditChosen =
    isHistorical &&
    !isConfirmChosen &&
    ((parsed?.edited !== undefined && !parsed?.confirmed) ||
      (chosenLabel && String(chosenLabel).toLowerCase().includes("saved manual changes")));

  const confirmOpacity = isHistorical ? (isConfirmChosen ? 1 : 0.5) : 1;
  const editOpacity = isHistorical ? (isEditChosen ? 1 : 0.5) : 1;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderColor: isDark ? "#334155" : "#cbd5e1",
          },
        ]}
      >
        <View
          style={[
            styles.cardHeader,
            {
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
            },
          ]}
        >
          <Ionicons
            name="person-circle-outline"
            size={18}
            color={theme.colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.cardHeaderTitle,
              { color: theme.colors.textPrimary },
            ]}
          >
            {uiT("yourDetails")}
          </Text>
        </View>

        <View style={styles.cardBody}>
          {fields.map((field) => {
            const val =
              localEditedData && localEditedData[field.key] !== undefined
                ? localEditedData[field.key]
                : parsed?.edited && parsed.edited[field.key] !== undefined
                  ? parsed.edited[field.key]
                  : field.value;

            return (
              <View key={field.key} style={styles.fieldRow}>
                <View style={styles.labelRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={11}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {field.label}
                    </Text>
                    {field.verified && (
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#10b981"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>

                  {!field.verified && !isHistorical && (
                    <TouchableOpacity onPress={onEditManually}>
                      <Ionicons
                        name="pencil"
                        size={12}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text
                  style={[
                    styles.fieldValue,
                    {
                      color: field.verified
                        ? isDark
                          ? "#64748b"
                          : "#94a3b8"
                        : isDark
                          ? "#f1f5f9"
                          : theme.colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {val || "—"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Buttons */}
      <View
        style={styles.actionsRow}
        pointerEvents={isHistorical ? "none" : "auto"}
      >
        <TouchableOpacity
          disabled={isHistorical}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isHistorical
                ? isConfirmChosen
                  ? "#10b981"
                  : isDark
                    ? "#334155"
                    : "#e2e8f0"
                : "#10b981",
              marginRight: 6,
              opacity: confirmOpacity,
              borderWidth: isConfirmChosen ? 2 : 0,
              borderColor: isConfirmChosen
                ? isDark
                  ? "#ffffff"
                  : "#065f46"
                : "transparent",
            },
          ]}
          onPress={onConfirm}
        >
          <Text
            style={[
              styles.actionBtnText,
              {
                color:
                  isHistorical && !isConfirmChosen
                    ? theme.colors.textPrimary
                    : "#ffffff",
              },
            ]}
          >
            {uiT("confirmAndContinue")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={isHistorical}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isHistorical
                ? isEditChosen
                  ? isDark
                    ? "#475569"
                    : "#cbd5e1"
                  : isDark
                    ? "#334155"
                    : "#e2e8f0"
                : isDark
                  ? "#334155"
                  : "#e2e8f0",
              marginLeft: 6,
              opacity: editOpacity,
              borderWidth: isEditChosen ? 2 : 0,
              borderColor: isEditChosen
                ? isDark
                  ? "#ffffff"
                  : "#334155"
                : "transparent",
            },
          ]}
          onPress={onEditManually}
        >
          <Text
            style={[
              styles.actionBtnText,
              { color: theme.colors.textPrimary },
            ]}
          >
            {uiT("editDetails")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  cardBody: {
    padding: 12,
  },
  fieldRow: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: "bold",
    paddingLeft: 15,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
