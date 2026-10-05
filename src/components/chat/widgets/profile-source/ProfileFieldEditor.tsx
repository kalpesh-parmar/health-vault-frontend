import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { setActiveFormDictationCallback } from "../../ChatInput";
import { formatLocalDateToYMD, parseYMDToLocalDate } from "../../../../utils/dateUtils";
import { ProfileField } from "./useProfileSourceState";

interface ProfileFieldEditorProps {
  fields: ProfileField[];
  editedProfileData: any;
  setEditedProfileData: React.Dispatch<React.SetStateAction<any>>;
  isDatePickerVisible: boolean;
  setDatePickerVisible: (visible: boolean) => void;
  datePickerMode: "date" | "time";
  setDatePickerMode: (mode: "date" | "time") => void;
  isDark: boolean;
  theme: any;
  uiT: (key: string) => string;
  getFieldIcon: (key: string) => any;
  normalizeGenderFrontend: (val: string | null | undefined) => string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const ProfileFieldEditor = React.memo(function ProfileFieldEditor({
  fields,
  editedProfileData,
  setEditedProfileData,
  isDatePickerVisible,
  setDatePickerVisible,
  datePickerMode,
  setDatePickerMode,
  isDark,
  theme,
  uiT,
  getFieldIcon,
  normalizeGenderFrontend,
  onSave,
  onCancel,
}: ProfileFieldEditorProps) {
  const handleSave = () => {
    const dataToSend = { ...editedProfileData };
    if (dataToSend.gender) {
      dataToSend.gender = normalizeGenderFrontend(dataToSend.gender);
    }
    onSave(dataToSend);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {uiT("editProfileDetails")}
        </Text>
      </View>

      <View style={styles.formBody}>
        {fields.map((field) => {
          if (field.verified) return null;

          if (field.key === "dateOfBirth" || field.key === "dob") {
            return (
              <View key={field.key} style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name={getFieldIcon(field.key)}
                    size={14}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {field.label}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.textInput,
                    {
                      borderColor: isDark ? "#475569" : "#cbd5e1",
                      backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                      justifyContent: "center",
                    },
                  ]}
                  onPress={() => {
                    setDatePickerMode("date");
                    setDatePickerVisible(true);
                  }}
                >
                  <Text
                    style={{
                      color: editedProfileData.dateOfBirth
                        ? theme.colors.textPrimary
                        : isDark
                          ? "#64748b"
                          : "#94a3b8",
                    }}
                  >
                    {editedProfileData.dateOfBirth || uiT("selectDateOfBirth")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }

          if (field.key === "gender") {
            const currentGen = (editedProfileData.gender || "").toLowerCase().trim();
            const isMale = currentGen === "male" || currentGen === "m";
            const isFemale = currentGen === "female" || currentGen === "f";

            return (
              <View key={field.key} style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name={getFieldIcon(field.key)}
                    size={14}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {field.label}
                  </Text>
                </View>
                <View style={styles.radioGroupContainer}>
                  {/* Male Radio Option */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.radioOptionCard,
                      {
                        backgroundColor: isMale
                          ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff")
                          : (isDark ? "#1e293b" : "#f8fafc"),
                        borderColor: isMale
                          ? (isDark ? "#3b82f6" : "#2563eb")
                          : (isDark ? "#334155" : "#cbd5e1"),
                      },
                    ]}
                    onPress={() =>
                      setEditedProfileData((prev: any) => ({
                        ...prev,
                        gender: "male",
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.radioOuterCircle,
                        {
                          borderColor: isMale
                            ? (isDark ? "#3b82f6" : "#2563eb")
                            : (isDark ? "#64748b" : "#94a3b8"),
                        },
                      ]}
                    >
                      {isMale && (
                        <View
                          style={[
                            styles.radioInnerCircle,
                            {
                              backgroundColor: isDark ? "#3b82f6" : "#2563eb",
                            },
                          ]}
                        />
                      )}
                    </View>
                    <Ionicons
                      name="male"
                      size={16}
                      color={isMale ? (isDark ? "#60a5fa" : "#2563eb") : (isDark ? "#94a3b8" : "#64748b")}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.radioLabel,
                        {
                          color: isMale
                            ? (isDark ? "#60a5fa" : "#2563eb")
                            : theme.colors.textPrimary,
                          fontWeight: isMale ? "700" : "500",
                        },
                      ]}
                    >
                      {uiT("male")}
                    </Text>
                  </TouchableOpacity>

                  {/* Female Radio Option */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.radioOptionCard,
                      {
                        backgroundColor: isFemale
                          ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff")
                          : (isDark ? "#1e293b" : "#f8fafc"),
                        borderColor: isFemale
                          ? (isDark ? "#3b82f6" : "#2563eb")
                          : (isDark ? "#334155" : "#cbd5e1"),
                      },
                    ]}
                    onPress={() =>
                      setEditedProfileData((prev: any) => ({
                        ...prev,
                        gender: "female",
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.radioOuterCircle,
                        {
                          borderColor: isFemale
                            ? (isDark ? "#3b82f6" : "#2563eb")
                            : (isDark ? "#64748b" : "#94a3b8"),
                        },
                      ]}
                    >
                      {isFemale && (
                        <View
                          style={[
                            styles.radioInnerCircle,
                            {
                              backgroundColor: isDark ? "#3b82f6" : "#2563eb",
                            },
                          ]}
                        />
                      )}
                    </View>
                    <Ionicons
                      name="female"
                      size={16}
                      color={isFemale ? (isDark ? "#60a5fa" : "#2563eb") : (isDark ? "#94a3b8" : "#64748b")}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.radioLabel,
                        {
                          color: isFemale
                            ? (isDark ? "#60a5fa" : "#2563eb")
                            : theme.colors.textPrimary,
                          fontWeight: isFemale ? "700" : "500",
                        },
                      ]}
                    >
                      {uiT("female")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View key={field.key} style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons
                  name={getFieldIcon(field.key)}
                  size={14}
                  color={theme.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                  {field.label}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: isDark ? "#475569" : "#cbd5e1",
                    backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                  },
                ]}
                value={editedProfileData[field.key] || ""}
                onChangeText={(val) =>
                  setEditedProfileData((prev: any) => ({
                    ...prev,
                    [field.key]: val,
                  }))
                }
                onFocus={() => {
                  setActiveFormDictationCallback((transcript: string) => {
                    setEditedProfileData((prev: any) => ({
                      ...prev,
                      [field.key]: prev[field.key] ? prev[field.key] + " " + transcript : transcript,
                    }));
                  });
                }}
                placeholder={field.label}
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                keyboardType={field.key === "email" ? "email-address" : field.key === "phoneNumber" ? "phone-pad" : "default"}
                autoCapitalize={field.key === "email" ? "none" : "sentences"}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{uiT("saveDetails")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelBtnText, { color: theme.colors.textPrimary }]}>
            {uiT("cancel")}
          </Text>
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode={datePickerMode}
        date={
          editedProfileData.dateOfBirth
            ? parseYMDToLocalDate(editedProfileData.dateOfBirth)
            : new Date()
        }
        maximumDate={new Date()}
        onConfirm={(date: Date) => {
          setDatePickerVisible(false);
          const dateStr = formatLocalDateToYMD(date);
          setEditedProfileData((prev: any) => ({
            ...prev,
            dateOfBirth: dateStr,
          }));
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  formBody: {
    marginVertical: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  radioGroupContainer: {
    flexDirection: "row",
    gap: 10,
  },
  radioOptionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  radioOuterCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioInnerCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  radioLabel: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
