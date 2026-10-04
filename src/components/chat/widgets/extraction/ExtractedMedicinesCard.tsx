import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedMedicine } from "../../../../types/medicationReview";
import { I18N_ONBOARDING_UI } from "../OnboardingI18n";

const formatFood = (val: string, t: (k: string) => string) => {
  if (!val) return t("none");
  const v = String(val).toUpperCase();
  if (v.includes("BEFORE") || v.includes("PRE")) return t("beforeFood");
  if (v.includes("AFTER") || v.includes("POST")) return t("afterFood");
  return val;
};

export interface ExtractedMedicinesCardProps {
  medicines: ExtractedMedicine[];
  documents: { id: string; fileName: string }[];
  isDark: boolean;
  isLatest: boolean;
  onEdit: (med: ExtractedMedicine) => void;
  onConfirm: () => void;
  isLoading: boolean;
  preferredLang?: string;
}

export const ExtractedMedicinesCard = React.memo(function ExtractedMedicinesCard({
  medicines,
  documents,
  isDark,
  isLatest,
  onEdit,
  onConfirm,
  isLoading,
  preferredLang = "english",
}: ExtractedMedicinesCardProps) {
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
      {/* List of Report Names */}
      {documents && documents.length > 0 && (
        <View
          style={[
            styles.reportSection,
            { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9" },
          ]}
        >
          <Text style={styles.sectionLabel}>{t("reportNames")}</Text>
          {documents.map((doc, idx) => (
            <View key={doc.id || idx} style={styles.reportRow}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color="#5B4BFF"
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.reportName, { color: isDark ? "#cbd5e1" : "#334155" }]}
                numberOfLines={1}
              >
                {doc.fileName}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Medicines Found Title */}
      <Text style={[styles.title, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
        {t("medicinesFound")}
      </Text>

      {/* List of Medication Cards */}
      <View style={{ marginVertical: 8 }}>
        {medicines.map((med) => {
          const foodStr = med.foodFrequency || med.timing || "AFTER_FOOD";
          const scheduleStr = Array.isArray(med.medicationSchedule)
            ? med.medicationSchedule.join(", ")
            : typeof med.medicationSchedule === "string"
              ? med.medicationSchedule
              : "Not set";

          return (
            <View
              key={med.id}
              style={[
                styles.medCard,
                {
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.medHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.medName, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
                    {med.name}
                  </Text>
                  <Text style={styles.medType}>{med.medicineType || "Tablet"}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => onEdit(med)}
                  style={[
                    styles.editButton,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9" },
                  ]}
                >
                  <Ionicons name="pencil" size={14} color="#5B4BFF" />
                  <Text style={[styles.editButtonText, { color: "#5B4BFF" }]}>✏ Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Grid Specifications */}
              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Dosage</Text>
                  <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                    {med.dosage || "1"} {med.dosageUnit || "tablet"}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Frequency</Text>
                  <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                    {med.frequency === "ONCE"
                      ? "Once Daily"
                      : med.frequency === "TWICE"
                        ? "Twice Daily"
                        : med.frequency === "THRICE"
                          ? "3x Daily"
                          : med.frequency}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Timing</Text>
                  <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                    {formatFood(foodStr, t)}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Reminders</Text>
                  <Text
                    style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}
                    numberOfLines={1}
                  >
                    {scheduleStr}
                  </Text>
                </View>
              </View>

              {/* Special Instructions Notes */}
              {Boolean(med.notes) && (
                <View
                  style={[
                    styles.notesWrapper,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f1f5f9" },
                  ]}
                >
                  <Text
                    style={[styles.notesText, { color: isDark ? "#94a3b8" : "#475569" }]}
                    numberOfLines={2}
                  >
                    <Text style={{ fontWeight: "bold" }}>Notes: </Text>
                    {med.notes}
                  </Text>
                </View>
              )}

              {/* Fallback Warning Badge */}
              {Boolean(med.provenance === "vlm_fallback" || med.verificationRequired) && (
                <View
                  style={[
                    styles.fallbackBadge,
                    {
                      backgroundColor: isDark ? "rgba(234, 88, 12, 0.15)" : "#ffedd5",
                      borderColor: isDark ? "rgba(234, 88, 12, 0.3)" : "#fed7aa",
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={13} color="#ea580c" style={{ marginRight: 5 }} />
                  <Text
                    style={[
                      styles.fallbackText,
                      { color: isDark ? "#fb923c" : "#c2410c" },
                    ]}
                    numberOfLines={1}
                  >
                    AI Fallback • Verify against original scan
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Confirm Proceed Button */}
      {isLatest && (
        <TouchableOpacity
          onPress={onConfirm}
          disabled={isLoading}
          style={styles.primaryButton}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirm & Check Conflicts</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  reportSection: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  reportName: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    marginVertical: 6,
  },
  medCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  medHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  medType: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  gridItem: {
    width: "50%",
  },
  gridLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  gridValue: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 1,
  },
  notesWrapper: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
  },
  notesText: {
    fontSize: 11,
  },
  primaryButton: {
    backgroundColor: "#5B4BFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  fallbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  fallbackText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
});
