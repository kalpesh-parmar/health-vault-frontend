import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GoogleLogo from "../../../../assets/auth-logos/GoogleLogo";
import AppleLogo from "../../../../assets/auth-logos/AppleLogo";
import FacebookLogo from "../../../../assets/auth-logos/FacebookLogo";
import MicrosoftLogo from "../../../../assets/auth-logos/MicrosoftLogo";
import { ProfileField } from "./useProfileSourceState";

export type ProfileEditSource = "LOGIN" | "DOCUMENT";

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
  onEditManually: (source: ProfileEditSource) => void;
  isHistorical?: boolean;
}

const renderSocialLogo = (provider?: string, isDark = false, size = 20) => {
  if (!provider) {
    return <Ionicons name="person-circle-outline" size={size} color="#3b82f6" />;
  }
  const norm = provider.toLowerCase().trim();
  switch (norm) {
    case "microsoft":
      return <MicrosoftLogo width={size} height={size} />;
    case "google":
      return <GoogleLogo width={size} height={size} />;
    case "apple":
      return <AppleLogo width={size} height={size} color={isDark ? "#ffffff" : "#000000"} />;
    case "facebook":
      return <FacebookLogo width={size} height={size} />;
    case "phone":
    case "mobile":
      return <Ionicons name="call" size={size} color="#3b82f6" />;
    case "email":
      return <Ionicons name="mail" size={size} color="#3b82f6" />;
    default:
      return <Ionicons name="person-circle-outline" size={size} color="#3b82f6" />;
  }
};

const getSpecificFieldIcon = (key: string): any => {
  switch (key) {
    case "firstName":
    case "lastName":
      return "person-outline";
    case "phoneNumber":
    case "mobile":
    case "phone":
      return "call-outline";
    case "dateOfBirth":
    case "dob":
      return "calendar-outline";
    case "gender":
      return "female-outline";
    case "email":
      return "mail-outline";
    case "bloodGroup":
      return "water-outline";
    default:
      return "information-circle-outline";
  }
};

const formatFieldValue = (key: string, val: string | undefined | null) => {
  if (!val || String(val).trim() === "") return "—";
  if (key === "gender") {
    const lower = String(val).toLowerCase().trim();
    if (lower === "female" || lower === "f") return "Female";
    if (lower === "male" || lower === "m") return "Male";
    if (lower === "other") return "Other";
  }
  return String(val);
};

export const ProfileConflictSelector = React.memo(function ProfileConflictSelector({
  fields,
  loginProvider,
  localEditedData,
  isDark,
  theme,
  uiT,
  getProviderLabel,
  onSelectProvider,
  onSelectDocument,
  onEditManually,
  isHistorical,
}: ProfileConflictSelectorProps) {
  const editedLoginData = localEditedData?.LOGIN || null;
  const editedDocumentData = localEditedData?.DOCUMENT || null;
  const providerLabel = editedLoginData
    ? (uiT("editedInformation") || "Edited Information")
    : (getProviderLabel(loginProvider) || uiT("fromSocialLogin") || "From Social Login");

  const leftButtonText = editedLoginData
    ? (uiT("useEditedInformation") || "Use Edited Information")
    : (uiT("useSocialLogin") || "Use Social Login");

  return (
    <View style={styles.container}>
      <View style={styles.vsWrapper}>
        {/* Left Column (Social / Edited) */}
        <View
          style={[
            styles.columnCard,
            styles.leftCard,
            {
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#3b82f660" : "#93c5fd",
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.columnHeader,
              {
                backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
                borderBottomColor: isDark ? "#3b82f640" : "#bfdbfe",
              },
            ]}
          >
            <View style={styles.headerLogoContainer}>
              {editedLoginData ? (
                <Ionicons
                  name="create-outline"
                  size={18}
                  color="#2563eb"
                />
              ) : (
                renderSocialLogo(loginProvider, isDark, 18)
              )}
            </View>
            <Text
              style={[
                styles.columnHeaderTitle,
                { color: isDark ? "#60a5fa" : "#2563eb" },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {providerLabel}
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.columnBody}>
            {fields.map((field) => {
              const rawVal =
                editedLoginData && editedLoginData[field.key] !== undefined
                  ? editedLoginData[field.key]
                  : field.loginValue || (field.isMismatch ? null : field.value);

              const formattedVal = formatFieldValue(field.key, rawVal);

              return (
                <View key={`left-${field.key}`} style={styles.fieldRow}>
                  <Ionicons
                    name={getSpecificFieldIcon(field.key)}
                    size={16}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={styles.fieldIcon}
                  />
                  <View style={styles.fieldContent}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: isDark ? "#94a3b8" : "#64748b" },
                        ]}
                        numberOfLines={1}
                      >
                        {field.label}
                      </Text>
                      {field.isMismatch && (
                        <View style={styles.mismatchDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.fieldValue,
                        { color: isDark ? "#f8fafc" : "#0f172a" },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formattedVal}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Edit Profile Button inside card */}
            {!isHistorical && (
              <TouchableOpacity
                style={[
                  styles.cardEditBtn,
                  {
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "#eff6ff",
                    borderColor: isDark ? "#3b82f650" : "#93c5fd",
                  },
                ]}
                onPress={() => onEditManually("LOGIN")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={isDark ? "#60a5fa" : "#2563eb"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.cardEditBtnText,
                    { color: isDark ? "#60a5fa" : "#2563eb" },
                  ]}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Center "VS" Badge */}
        <View style={styles.vsBadgeContainer} pointerEvents="none">
          <View style={[styles.vsDashLine, { backgroundColor: isDark ? "#3b82f6" : "#3b82f6" }]} />
          <View
            style={[
              styles.vsBadgeCircle,
              {
                borderColor: isDark ? "#0f172a" : "#ffffff",
              },
            ]}
          >
            <Text style={styles.vsBadgeText}>VS</Text>
          </View>
          <View style={[styles.vsDashLine, { backgroundColor: isDark ? "#3b82f6" : "#3b82f6" }]} />
        </View>

        {/* Right Column (Document) */}
        <View
          style={[
            styles.columnCard,
            styles.rightCard,
            {
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#10b98160" : "#86efac",
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.columnHeader,
              {
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#f0fdf4",
                borderBottomColor: isDark ? "#10b98140" : "#bbf7d0",
              },
            ]}
          >
            <View style={styles.headerLogoContainer}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#16a34a"
              />
            </View>
            <Text
              style={[
                styles.columnHeaderTitle,
                { color: isDark ? "#34d399" : "#16a34a" },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {uiT("fromDocument") || "From Document"}
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.columnBody}>
            {fields.map((field) => {
              const rawVal =
                editedDocumentData && editedDocumentData[field.key] !== undefined
                  ? editedDocumentData[field.key]
                  : field.documentValue || (field.isMismatch ? null : field.value);

              const formattedVal = formatFieldValue(field.key, rawVal);

              return (
                <View key={`right-${field.key}`} style={styles.fieldRow}>
                  <Ionicons
                    name={getSpecificFieldIcon(field.key)}
                    size={16}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={styles.fieldIcon}
                  />
                  <View style={styles.fieldContent}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: isDark ? "#94a3b8" : "#64748b" },
                        ]}
                        numberOfLines={1}
                      >
                        {field.label}
                      </Text>
                      {field.isMismatch && (
                        <View style={styles.mismatchDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.fieldValue,
                        { color: isDark ? "#f8fafc" : "#0f172a" },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formattedVal}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Edit Profile Button inside card */}
            {!isHistorical && (
              <TouchableOpacity
                style={[
                  styles.cardEditBtn,
                  {
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "#f0fdf4",
                    borderColor: isDark ? "#10b98150" : "#86efac",
                  },
                ]}
                onPress={() => onEditManually("DOCUMENT")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={isDark ? "#34d399" : "#16a34a"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.cardEditBtnText,
                    { color: isDark ? "#34d399" : "#16a34a" },
                  ]}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Main Action Buttons Below */}
      {!isHistorical && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.mainActionBtn, styles.leftMainActionBtn]}
            onPress={onSelectProvider}
            activeOpacity={0.85}
          >
            <Text style={styles.mainActionBtnText}>
              {leftButtonText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainActionBtn, styles.rightMainActionBtn]}
            onPress={onSelectDocument}
            activeOpacity={0.85}
          >
            <Text style={styles.mainActionBtnText}>
              {uiT("useDocument") || "Use Document"}
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
  vsWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    gap: 6,
  },
  columnCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: "hidden",
  },
  leftCard: {},
  rightCard: {},
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLogoContainer: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
  columnHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  columnBody: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  fieldIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  mismatchDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#f97316",
    marginLeft: 4,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  cardEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    marginTop: 4,
  },
  cardEditBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  vsBadgeContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  vsDashLine: {
    width: 10,
    height: 2,
  },
  vsBadgeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  vsBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  mainActionBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  leftMainActionBtn: {
    backgroundColor: "#4f46e5",
  },
  rightMainActionBtn: {
    backgroundColor: "#10b981",
  },
  mainActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
