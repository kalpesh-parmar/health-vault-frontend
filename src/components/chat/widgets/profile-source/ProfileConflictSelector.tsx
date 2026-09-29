import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProfileField } from "./useProfileSourceState";

interface ProfileConflictSelectorProps {
  fields: ProfileField[];
  loginProvider?: string;
  localEditedData: any;
  isDark: boolean;
  theme: any;
  uiT: (key: string) => string;
  getFieldIcon: (key: string) => any;
  renderProviderLogo: (p: string | undefined, size?: number, isButton?: boolean) => React.ReactNode;
  getProviderLabel: (p: string | undefined) => string;
  onSelectProvider: () => void;
  onSelectDocument: () => void;
  onEditManually: () => void;
  isHistorical?: boolean;
}

export const ProfileConflictSelector = React.memo(function ProfileConflictSelector({
  fields,
  loginProvider,
  localEditedData,
  isDark,
  theme,
  uiT,
  getFieldIcon,
  renderProviderLogo,
  getProviderLabel,
  onSelectProvider,
  onSelectDocument,
  onEditManually,
  isHistorical,
}: ProfileConflictSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.vsContainer}>
        {/* Social / Edited Column */}
        <View
          style={[
            styles.vsColumn,
            {
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#334155" : "#cbd5e1",
            },
          ]}
        >
          <View
            style={[
              styles.columnHeader,
              {
                backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
              },
            ]}
          >
            {localEditedData ? (
              <Ionicons
                name="create-outline"
                size={16}
                color={theme.colors.primary}
                style={{ marginRight: 6 }}
              />
            ) : (
              renderProviderLogo(loginProvider, 18, false)
            )}
            <Text
              style={[
                styles.columnHeaderTitle,
                { color: theme.colors.primary },
              ]}
            >
              {localEditedData ? "Edited Information" : getProviderLabel(loginProvider)}
            </Text>
          </View>

          <View style={styles.columnBody}>
            {fields.map((field) => {
              const val =
                localEditedData && localEditedData[field.key] !== undefined
                  ? localEditedData[field.key]
                  : field.loginValue || (field.isMismatch ? null : field.value);

              return (
                <View key={field.key} style={styles.fieldRow}>
                  <View style={styles.labelRow}>
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={11}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
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

                  <Text
                    style={[
                      styles.fieldValue,
                      { color: isDark ? "#f1f5f9" : "#1e293b" },
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

        {/* Document / Medical Record Column */}
        <View
          style={[
            styles.vsColumn,
            {
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#334155" : "#cbd5e1",
            },
          ]}
        >
          <View
            style={[
              styles.columnHeader,
              {
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color="#10b981"
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.columnHeaderTitle, { color: "#10b981" }]}>
              {uiT("fromDocument") || "Medical Record"}
            </Text>
          </View>

          <View style={styles.columnBody}>
            {fields.map((field) => {
              const val = field.documentValue || (field.isMismatch ? null : field.value);

              return (
                <View key={field.key} style={styles.fieldRow}>
                  <View style={styles.labelRow}>
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={11}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {field.label}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.fieldValue,
                      { color: isDark ? "#f1f5f9" : "#1e293b" },
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
      </View>

      {/* Action Buttons */}
      {!isHistorical && (
        <View style={styles.actionsContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onSelectProvider}
            >
              <Text style={styles.actionBtnText}>
                Use {getProviderLabel(loginProvider)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
              onPress={onSelectDocument}
            >
              <Text style={styles.actionBtnText}>
                Use Document
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.editManualBtn,
              {
                backgroundColor: isDark ? "#334155" : "#f1f5f9",
                borderColor: isDark ? "#475569" : "#cbd5e1",
              },
            ]}
            onPress={onEditManually}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={theme.colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.editManualText, { color: theme.colors.primary }]}>
              {uiT("editManually") || "Edit Details Manually"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  vsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  vsColumn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  columnHeaderTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  columnBody: {
    padding: 10,
  },
  fieldRow: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: "bold",
    paddingLeft: 14,
  },
  actionsContainer: {
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  editManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  editManualText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
