import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { I18N_ONBOARDING_UI } from "../OnboardingI18n";

export interface ConfirmMedicinesCardProps {
  docsCount: number;
  extractedCount: number;
  conflictsResolvedCount: number;
  toBeAddedCount: number;
  isDark: boolean;
  isLatest: boolean;
  onConfirm: () => void;
  isLoading: boolean;
  preferredLang?: string;
}

export const ConfirmMedicinesCard = React.memo(function ConfirmMedicinesCard({
  docsCount,
  extractedCount,
  conflictsResolvedCount,
  toBeAddedCount,
  isDark,
  isLatest,
  onConfirm,
  isLoading,
  preferredLang = "english",
}: ConfirmMedicinesCardProps) {
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
      ]}
    >
      {/* Title */}
      <View style={styles.confirmHeader}>
        <View style={styles.badgeCheck}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        </View>
        <Text style={[styles.confirmTitle, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
          {t("finalConfirmation")}
        </Text>
      </View>

      {/* Summary Rows */}
      <View style={styles.summaryList}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            {t("docsProcessed")}
          </Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>
            {docsCount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            {t("medsExtractedLabel")}
          </Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>
            {extractedCount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            {t("duplicateConflictsResolved")}
          </Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>
            {conflictsResolvedCount}
          </Text>
        </View>

        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" },
          ]}
        />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryTotalLabel, { color: "#10b981" }]}>
            {t("medsReadyToAdd")}
          </Text>
          <Text style={[styles.summaryTotalValue, { color: "#10b981" }]}>
            {toBeAddedCount}
          </Text>
        </View>
      </View>

      <Text style={[styles.confirmText, { color: isDark ? "#cbd5e1" : "#475569" }]}>
        {(() => {
          const confirmMap: Record<string, string> = {
            english: "Please review and confirm to add these medicines to your profile.",
            gujarati: "કૃપા કરીને આ દવાઓ તમારા પ્રોફાઇલમાં ઉમેરવા માટે સમીક્ષા કરો અને પુષ્ટિ કરો.",
            hindi: "कृपया अपने प्रोफाइल में इन दवाओं को जोड़ने के लिए समीक्षा और पुष्टि करें।",
            marathi: "कृपया या औषधांचे पुनरावलोकन करा आणि आपल्या प्रोफाइलमध्ये जोडण्यासाठी पुष्टी करा.",
            tamil: "இந்த மருந்துகளை உங்கள் சுயவிவரத்தில் சேர்க்க மதிப்பாய்வு செய்து உறுதிப்படுத்தவும்.",
          };
          return confirmMap[preferredLang || "english"] || confirmMap.english;
        })()}
      </Text>

      {/* Proceed Confirm and Save */}
      {isLatest && (
        <TouchableOpacity
          onPress={onConfirm}
          disabled={isLoading}
          style={[styles.primaryButton, { backgroundColor: "#10b981" }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("confirmAndAddMeds")}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    width: "100%",
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeCheck: {
    marginRight: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  summaryList: {
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  confirmText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
