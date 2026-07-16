import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";

export interface ResolveProfileSourceCardProps {
  activeMsg: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  sendMessage: (userText: string, updatedState?: any, displayLabel?: string) => Promise<void> | void;
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
  const mode = activeMsg?.mode || "CONFIRM";
  const fields = activeMsg?.fields || [];
  const loginSummary = activeMsg?.loginSummary || "";
  const documentSummary = activeMsg?.documentSummary || "";

  // Local state for manual profile editing
  const [isEditingProfileManually, setIsEditingProfileManually] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");

  const uiT = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };


  const getFieldIcon = (key: string): any => {
    switch (key) {
      case "firstName":
      case "lastName":
        return "person-outline";
      case "phoneNumber":
      case "mobile":
        return "call-outline";
      case "dateOfBirth":
      case "dob":
        return "calendar-outline";
      case "gender":
        return "male-female-outline";
      case "email":
        return "mail-outline";
      case "bloodGroup":
        return "water-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getProviderIcon = (p: string | undefined): any => {
    if (!p) return "person-circle-outline";
    const iconMap: Record<string, string> = {
      google: "logo-google",
      facebook: "logo-facebook",
      microsoft: "logo-windows",
      apple: "logo-apple",
      mobile: "call",
      email: "mail",
    };
    return iconMap[p.toLowerCase()] || "person-circle-outline";
  };

  const getProviderIconColor = (p: string | undefined) => {
    if (!p) return "#3b82f6";
    const colorMap: Record<string, string> = {
      google: "#4285F4",
      facebook: "#1877F2",
      microsoft: "#00A4EF",
      apple: theme.colors.textPrimary,
      mobile: theme.colors.primary,
      email: theme.colors.primary,
    };
    return colorMap[p.toLowerCase()] || "#3b82f6";
  };

  const getProviderLabel = (p: string | undefined) => {
    if (!p) return uiT("fromSocialLogin");
    switch (p.toLowerCase()) {
      case "google":
        return uiT("fromGoogle");
      case "facebook":
        return uiT("fromFacebook");
      case "apple":
        return uiT("fromApple");
      case "microsoft":
        return uiT("fromMicrosoft");
      case "mobile":
        return uiT("fromPhone");
      case "email":
        return uiT("fromEmail");
      default:
        return uiT("fromSocialLogin");
    }
  };

  // Render Manual Editing Form
  if (isEditingProfileManually && !isHistorical) {
    return (
      <View style={styles.resolveCardContainer}>
        <View style={styles.resolveCardHeader}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary, marginLeft: 8 }]}>
            {uiT("editProfileDetails")}
          </Text>
        </View>
        <View style={styles.editFormContainer}>
          {fields.map((field: any) => {
            if (field.verified) return null;

            if (field.key === "dateOfBirth") {
              return (
                <View key={field.key} style={styles.inputGroup}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={14}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: theme.colors.textSecondary,
                          marginBottom: 0,
                        },
                      ]}
                    >
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
                    <Text style={{ color: editedProfileData.dateOfBirth ? theme.colors.textPrimary : (isDark ? "#64748b" : "#94a3b8") }}>
                      {editedProfileData.dateOfBirth || uiT("selectDateOfBirth")}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (field.key === "gender") {
              const currentGen = (
                editedProfileData.gender || ""
              ).toLowerCase();
              return (
                <View key={field.key} style={styles.inputGroup}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={14}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: theme.colors.textSecondary,
                          marginBottom: 0,
                        },
                      ]}
                    >
                      {field.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.resolveActionButton,
                        {
                          flex: 1,
                          marginRight: 6,
                          backgroundColor:
                            currentGen === "male"
                              ? theme.colors.primary
                              : isDark
                                ? "#1e293b"
                                : "#f1f5f9",
                          borderColor:
                            currentGen === "male"
                              ? theme.colors.primary
                              : isDark
                                ? "#475569"
                                : "#cbd5e1",
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() =>
                        setEditedProfileData((prev: any) => ({
                          ...prev,
                          gender: "male",
                        }))
                      }
                    >
                      <Text style={[styles.resolveActionButtonText, { color: currentGen === "male" ? "#ffffff" : theme.colors.textPrimary }]}>
                        {uiT("male")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.resolveActionButton,
                        {
                          flex: 1,
                          marginLeft: 6,
                          backgroundColor:
                            currentGen === "female"
                              ? theme.colors.primary
                              : isDark
                                ? "#1e293b"
                                : "#f1f5f9",
                          borderColor:
                            currentGen === "female"
                              ? theme.colors.primary
                              : isDark
                                ? "#475569"
                                : "#cbd5e1",
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() =>
                        setEditedProfileData((prev: any) => ({
                          ...prev,
                          gender: "female",
                        }))
                      }
                    >
                      <Text style={[styles.resolveActionButtonText, { color: currentGen === "female" ? "#ffffff" : theme.colors.textPrimary }]}>
                        {uiT("female")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            if (field.key === "phoneNumber") {
              const phoneStr = editedProfileData.phoneNumber || "";
              let countryCode = "+91";
              let nationalNumber = phoneStr;
              if (phoneStr.startsWith("+")) {
                countryCode = phoneStr.slice(0, 3);
                nationalNumber = phoneStr.slice(3);
              } else if (phoneStr.length > 10) {
                countryCode = "+" + phoneStr.slice(0, 2);
                nationalNumber = phoneStr.slice(2);
              }

              const setPhoneNumber = (val: string) => {
                const clean = val.replace(/\D/g, "");
                setEditedProfileData((prev: any) => ({ ...prev, phoneNumber: countryCode + clean }));
              };

              return (
                <View key={field.key} style={styles.inputGroup}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons
                      name={getFieldIcon(field.key)}
                      size={14}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: theme.colors.textSecondary,
                          marginBottom: 0,
                        },
                      ]}
                    >
                      {field.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <View
                      style={[
                        {
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                          justifyContent: "center",
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{countryCode}</Text>
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          flex: 1,
                          marginLeft: 8,
                          color: theme.colors.textPrimary,
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        },
                      ]}
                      value={nationalNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="98765 43210"
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              );
            }

            return (
              <View key={field.key} style={styles.inputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Ionicons
                    name={getFieldIcon(field.key)}
                    size={14}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color: theme.colors.textSecondary,
                        marginBottom: 0,
                      },
                    ]}
                  >
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
                  placeholder={field.label}
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType={
                    field.key === "email" ? "email-address" : "default"
                  }
                />
              </View>
            );
          })}
        </View>
        <View style={styles.resolveActionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.resolveActionButton,
              {
                backgroundColor: theme.colors.primary,
                flex: 1,
                marginRight: 8,
              },
            ]}
            onPress={() => {
              const userMessage = uiT("saveDetails");
              console.log(userMessage);
              setIsEditingProfileManually(false);
              sendMessage(
                JSON.stringify({ edited: editedProfileData }),
                state,
                userMessage
              );
            }}
          >
            <Text style={styles.resolveActionButtonText}>
              {uiT("saveDetails")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.resolveActionButton,
              { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 1 },
            ]}
            onPress={() => setIsEditingProfileManually(false)}
          >
            <Text style={[styles.resolveActionButtonText, { color: theme.colors.textPrimary }]}>
              {uiT("cancel")}
            </Text>
          </TouchableOpacity>
        </View>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          onConfirm={(date: Date) => {
            setDatePickerVisible(false);
            const dateStr = date.toISOString().split("T")[0]; // yyyy-MM-dd
            setEditedProfileData((prev: any) => ({
              ...prev,
              dateOfBirth: dateStr,
            }));
          }}
          onCancel={() => setDatePickerVisible(false)}
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
            {activeMsg?.title || (mode === "CONFIRM"
              ? uiT("confirmYourProfileDetails")
              : uiT("weFoundTwoDifferentProfiles"))}
          </Text>
          <Text style={[styles.resolveCardSubtitle, { color: theme.colors.textSecondary }]}>
            {activeMsg?.subtitle || (mode === "CONFIRM"
              ? uiT("pleaseCheckAndConfirmAllDetails")
              : uiT("pleaseReviewAndChooseOneYouPrefer"))}
          </Text>
        </View>
      </View>

      {/* VS Card Columns or CONFIRM layout */}
      {mode === "CONFIRM" ? (
        <View style={[styles.vsColumn, { borderColor: isDark ? "#475569" : "#cbd5e1", width: "100%", marginBottom: 12, borderWidth: 1, borderRadius: 8, overflow: "hidden" }]}>
          <View style={[styles.columnHeader, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
            <Ionicons name="person-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.columnHeaderTitle, { color: theme.colors.textPrimary }]}>
              {uiT("yourDetails")}
            </Text>
          </View>
          <View style={styles.columnBody}>
            {fields.map((field: any) => {
              const val = field.value;
              return (
                <View key={field.key} style={styles.fieldRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 2,
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name={getFieldIcon(field.key)}
                        size={11}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.fieldLabel,
                          {
                            color: theme.colors.textSecondary,
                            marginBottom: 0,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {field.label}
                      </Text>
                      {field.verified ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#10b981"
                          style={{ marginLeft: 4 }}
                        />
                      ) : null}
                    </View>
                    {!field.verified && !isHistorical && (
                      <TouchableOpacity
                        onPress={() => {
                          const initData: any = {};
                          fields.forEach((f: any) => {
                            initData[f.key] = f.value || "";
                          });
                          setEditedProfileData(initData);
                          setIsEditingProfileManually(true);
                        }}
                      >
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
                          : theme.colors.textPrimary,
                        paddingLeft: 15,
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
      ) : (
        <View style={styles.vsContainer}>
          {/* Social Login Column */}
          <View
            style={[
              styles.vsColumn,
              { borderColor: "rgba(59, 130, 246, 0.2)" },
            ]}
          >
            <View
              style={[
                styles.columnHeader,
                {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.15)"
                    : "#eff6ff",
                },
              ]}
            >
              <Ionicons
                name={getProviderIcon(activeMsg?.loginProvider)}
                size={16}
                color={getProviderIconColor(activeMsg?.loginProvider)}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.columnHeaderTitle,
                  { color: getProviderIconColor(activeMsg?.loginProvider) },
                ]}
              >
                {getProviderLabel(activeMsg?.loginProvider)}
              </Text>
            </View>
            <View style={styles.columnBody}>
              {fields.map((field: any) => {
                const val = field.loginValue;
                return (
                  <View key={field.key} style={styles.fieldRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <Ionicons
                        name={getFieldIcon(field.key)}
                        size={11}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.fieldLabel,
                          {
                            color: theme.colors.textSecondary,
                            marginBottom: 0,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {field.label}
                      </Text>
                      {field.verified ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#10b981"
                          style={{ marginLeft: 4 }}
                        />
                      ) : field.isMismatch ? (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#d97706",
                            marginLeft: 4,
                          }}
                        />
                      ) : null}
                    </View>
                    {field.isMismatch ? (
                      <View
                        style={[
                          styles.highlightChip,
                          {
                            backgroundColor: isDark
                              ? "rgba(245, 158, 11, 0.2)"
                              : "#fef3c7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fieldValue,
                            { color: "#d97706", fontWeight: "bold" },
                          ]}
                          numberOfLines={1}
                        >
                          {val || "—"}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.fieldValue,
                          {
                            color: field.verified
                              ? isDark
                                ? "#64748b"
                                : "#94a3b8"
                              : theme.colors.textPrimary,
                            paddingLeft: 15,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {val || "—"}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* VS Badge */}
          <View
            style={[
              styles.vsBadge,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderColor: isDark ? "#475569" : "#cbd5e1",
              },
            ]}
          >
            <Text
              style={[
                styles.vsBadgeText,
                { color: theme.colors.textPrimary },
              ]}
            >
              VS
            </Text>
          </View>

          {/* Document Column */}
          <View style={[styles.vsColumn, { borderColor: "rgba(16, 185, 129, 0.2)" }]}>
            <View style={[styles.columnHeader, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5" }]}>
              <Ionicons name="document-text" size={16} color="#10b981" style={{ marginRight: 6 }} />
              <Text style={[styles.columnHeaderTitle, { color: "#10b981" }]}>
                {uiT("fromDocument")}
              </Text>
            </View>
            <View style={styles.columnBody}>
              {fields.map((field: any) => {
                const val = field.documentValue;
                return (
                  <View key={field.key} style={styles.fieldRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <Ionicons
                        name={getFieldIcon(field.key)}
                        size={11}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.fieldLabel,
                          {
                            color: theme.colors.textSecondary,
                            marginBottom: 0,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {field.label}
                      </Text>
                      {field.verified ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#10b981"
                          style={{ marginLeft: 4 }}
                        />
                      ) : field.isMismatch ? (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#d97706",
                            marginLeft: 4,
                          }}
                        />
                      ) : null}
                    </View>
                    {field.isMismatch ? (
                      <View
                        style={[
                          styles.highlightChip,
                          {
                            backgroundColor: isDark
                              ? "rgba(245, 158, 11, 0.2)"
                              : "#fef3c7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fieldValue,
                            { color: "#d97706", fontWeight: "bold" },
                          ]}
                          numberOfLines={1}
                        >
                          {val || "—"}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.fieldValue,
                          {
                            color: field.verified
                              ? isDark
                                ? "#64748b"
                                : "#94a3b8"
                              : theme.colors.textPrimary,
                            paddingLeft: 15,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {val || "—"}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Explainer box */}
      {mode === "CONFLICT" && (
        <View style={[styles.explainerBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={[styles.explainerText, { color: theme.colors.textSecondary }]}>
            {activeMsg?.explainer || ""}
          </Text>
        </View>
      )}

      {/* Large Action Buttons Side-by-Side */}
      {(() => {
        const parsed = parseChosenJson(chosenVal);
        if (mode === "CONFIRM") {
          const isConfirmChosen = isHistorical && (
            parsed?.confirmed === true ||
            (chosenLabel && String(chosenLabel).toLowerCase() === "confirm details")
          );
          const isEditChosen = isHistorical && (
            parsed?.edited !== undefined ||
            (chosenLabel && String(chosenLabel).toLowerCase().includes("saved manual changes"))
          );

          const confirmOpacity = isHistorical ? (isConfirmChosen ? 1 : 0.55) : 1;
          const editOpacity = isHistorical ? (isEditChosen ? 1 : 0.55) : 1;

          return (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
              pointerEvents={isHistorical ? "none" : "auto"}
            >
              <TouchableOpacity
                disabled={isHistorical}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isHistorical
                      ? (isConfirmChosen ? "#10b981" : (isDark ? "#334155" : "#e2e8f0"))
                      : "#10b981",
                    flex: 1,
                    marginRight: 6,
                    justifyContent: "center",
                    paddingVertical: 12,
                    opacity: confirmOpacity,
                    borderWidth: isConfirmChosen ? 2 : 0,
                    borderColor: isConfirmChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() =>
                  sendMessage(
                    JSON.stringify({ confirmed: true }),
                    state,
                    uiT("confirmAndContinue"),
                  )
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  {isConfirmChosen && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />}
                  <Text
                    style={[
                      styles.bigActionButtonTextSide,
                      {
                        color: (isHistorical && !isConfirmChosen) ? theme.colors.textPrimary : "#ffffff",
                        textAlign: "center",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {uiT("confirmAndContinue")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isHistorical}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    flex: 1,
                    marginLeft: 6,
                    justifyContent: "center",
                    paddingVertical: 12,
                    opacity: editOpacity,
                    borderWidth: isEditChosen ? 2 : 0,
                    borderColor: isEditChosen ? (isDark ? "#ffffff" : "#475569") : "transparent",
                  },
                ]}
                onPress={() => {
                  const initData: any = {};
                  fields.forEach((f: any) => {
                    initData[f.key] = f.value || "";
                  });
                  setEditedProfileData(initData);
                  setIsEditingProfileManually(true);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  {isEditChosen && <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary, textAlign: "center" }]} numberOfLines={1}>
                    {uiT("editDetails")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        } else {
          const isLoginChosen = isHistorical && (
            parsed?.source === "LOGIN" ||
            (chosenLabel && String(chosenLabel).toLowerCase() === "use social login")
          );
          const isDocChosen = isHistorical && (
            parsed?.source === "DOCUMENT" ||
            (chosenLabel && String(chosenLabel).toLowerCase() === "use document")
          );

          const loginOpacity = isHistorical ? (isLoginChosen ? 1 : 0.55) : 1;
          const docOpacity = isHistorical ? (isDocChosen ? 1 : 0.55) : 1;

          return (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
              pointerEvents={isHistorical ? "none" : "auto"}
            >
              <TouchableOpacity
                disabled={isHistorical}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isHistorical
                      ? (isLoginChosen ? "#3b82f6" : (isDark ? "#334155" : "#e2e8f0"))
                      : "#3b82f6",
                    flex: 1,
                    marginRight: 6,
                    opacity: loginOpacity,
                    borderWidth: isLoginChosen ? 2 : 0,
                    borderColor: isLoginChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() =>
                  sendMessage(
                    JSON.stringify({ source: "LOGIN" }),
                    state,
                    uiT("useSocialLogin"),
                  )
                }
              >
                <View style={{ alignItems: "center", width: "100%" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    {isLoginChosen && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />}
                    <Text
                      style={[
                        styles.bigActionButtonTextSide,
                        { color: (isHistorical && !isLoginChosen) ? theme.colors.textPrimary : "#ffffff" },
                      ]}
                      numberOfLines={1}
                    >
                      {uiT("useSocialLogin")}
                    </Text>
                  </View>
                  {loginSummary ? (
                    <Text
                      style={[
                        styles.bigActionButtonSubtitleSide,
                        { color: (isHistorical && !isLoginChosen) ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)" },
                      ]}
                      numberOfLines={1}
                    >
                      {loginSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isHistorical}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isHistorical
                      ? (isDocChosen ? "#10b981" : (isDark ? "#334155" : "#e2e8f0"))
                      : "#10b981",
                    flex: 1,
                    marginLeft: 6,
                    opacity: docOpacity,
                    borderWidth: isDocChosen ? 2 : 0,
                    borderColor: isDocChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() =>
                  sendMessage(
                    JSON.stringify({ source: "DOCUMENT" }),
                    state,
                    uiT("useDocument"),
                  )
                }
              >
                <View style={{ alignItems: "center", width: "100%" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    {isDocChosen && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />}
                    <Text
                      style={[
                        styles.bigActionButtonTextSide,
                        { color: (isHistorical && !isDocChosen) ? theme.colors.textPrimary : "#ffffff" },
                      ]}
                      numberOfLines={1}
                    >
                      {uiT("useDocument")}
                    </Text>
                  </View>
                  {documentSummary ? (
                    <Text
                      style={[
                        styles.bigActionButtonSubtitleSide,
                        { color: (isHistorical && !isDocChosen) ? theme.colors.textSecondary : "rgba(255, 255, 255, 0.8)" },
                      ]}
                      numberOfLines={1}
                    >
                      {documentSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        }
      })()}

      {/* Center Manual Edit Link */}
      {mode === "CONFLICT" && !isHistorical && (
        <TouchableOpacity
          style={styles.manualEditLink}
          onPress={() => {
            const initData: any = {};
            fields.forEach((f: any) => {
              initData[f.key] = f.loginValue || f.documentValue || "";
            });
            setEditedProfileData(initData);
            setIsEditingProfileManually(true);
          }}
        >
          <Text style={[styles.manualEditLinkLabel, { color: theme.colors.primary }]}>
            {uiT("editManuallyInstead")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
