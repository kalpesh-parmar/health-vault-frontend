import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedMedicine } from "../../../types/medicationReview";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";

// Helper to format food context
const formatFood = (val: string, t: (k: string) => string) => {
  if (!val) return t("none");
  const v = String(val).toUpperCase();
  if (v.includes("BEFORE") || v.includes("PRE")) return t("beforeFood");
  if (v.includes("AFTER") || v.includes("POST")) return t("afterFood");
  return val;
};

// ExtractedMedicinesCard component
interface ExtractedMedicinesCardProps {
  medicines: ExtractedMedicine[];
  documents: { id: string; fileName: string }[];
  isDark: boolean;
  isLatest: boolean;
  onEdit: (med: ExtractedMedicine) => void;
  onConfirm: () => void;
  isLoading: boolean;
  preferredLang?: string;
}

export function ExtractedMedicinesCard({
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
    <View style={[styles.card, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      {/* List of Report Names */}
      <View style={[styles.reportSection, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9" }]}>
        <Text style={styles.sectionLabel}>{t("reportNames")}</Text>
        {documents.map((doc, idx) => (
          <View key={doc.id || idx} style={styles.reportRow}>
            <Ionicons name="document-text-outline" size={14} color="#0f766e" style={{ marginRight: 6 }} />
            <Text style={[styles.reportName, { color: isDark ? "#cbd5e1" : "#334155" }]} numberOfLines={1}>
              {doc.fileName}
            </Text>
          </View>
        ))}
      </View>

      {/* Medicines Found Title */}
      <Text style={[styles.title, { color: isDark ? "#f8fafc" : "#1e293b" }]}>{t("medicinesFound")}</Text>

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
            <View key={med.id} style={[styles.medCard, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0" }]}>
              {/* Card Header */}
              <View style={styles.medHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.medName, { color: isDark ? "#f8fafc" : "#0f172a" }]}>{med.name}</Text>
                  <Text style={styles.medType}>{med.medicineType || "Tablet"}</Text>
                </View>
                <TouchableOpacity onPress={() => onEdit(med)} style={[styles.editButton, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9" }]}>
                  <Ionicons name="pencil" size={14} color="#0f766e" />
                  <Text style={styles.editButtonText}>✏ Edit</Text>
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
                    {med.frequency === "ONCE" ? "Once Daily" : med.frequency === "TWICE" ? "Twice Daily" : med.frequency === "THRICE" ? "3x Daily" : med.frequency}
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
                  <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]} numberOfLines={1}>
                    {scheduleStr}
                  </Text>
                </View>
              </View>

              {/* Special Instructions Notes */}
              {med.notes ? (
                <View style={[styles.notesWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f1f5f9" }]}>
                  <Text style={[styles.notesText, { color: isDark ? "#94a3b8" : "#475569" }]} numberOfLines={2}>
                    <Text style={{ fontWeight: "bold" }}>Notes: </Text>{med.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Confirm Proceed Button */}
      {isLatest && (
        <TouchableOpacity onPress={onConfirm} disabled={isLoading} style={styles.primaryButton}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirm & Check Conflicts</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ConflictCarouselCard component
interface ConflictCarouselCardProps {
  conflicts: any[];
  currentIndex: number;
  isDark: boolean;
  isLatest: boolean;
  onResolve: (resolution: "keep" | "replace" | "merge" | "remove_new", mergedPayload?: any) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onContinueAnyway: () => void;
  onReviewMedicines: () => void;
  onEdit: (med: ExtractedMedicine) => void;
  preferredLang?: string;
}

export function ConflictCarouselCard({
  conflicts,
  currentIndex,
  isDark,
  isLatest,
  onResolve,
  onNavigate,
  onContinueAnyway,
  onReviewMedicines,
  onEdit,
  preferredLang = "english",
}: ConflictCarouselCardProps) {
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const currentConflict = conflicts[currentIndex];
  if (!currentConflict) return null;

  const { extractedMedicine, existingMedication } = currentConflict;

  const getExistingDosage = () => {
    return `${existingMedication.dosePerIntake || "1"} ${existingMedication.medicationType?.toLowerCase() || "tablet"}(s)`;
  };

  const getExtractedDosage = () => {
    return `${extractedMedicine.dosage || "1"} ${extractedMedicine.dosageUnit || "tablet"}`;
  };

  const resolvedLabel = currentConflict.resolvedAction === "keep" 
    ? "Keep Existing" 
    : currentConflict.resolvedAction === "replace"
    ? "Replace"
    : currentConflict.resolvedAction === "merge"
    ? "Merge"
    : currentConflict.resolvedAction === "remove_new"
    ? "Remove New"
    : "";

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Header Info */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: "#b91c1c" }}>
          Conflict {currentIndex + 1} of {conflicts.length}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginTop: 4 }}>
          {extractedMedicine.name}
        </Text>
      </View>

      {/* Grid Comparison */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
        {/* Left: Existing */}
        <View style={{ flex: 1, marginRight: 8, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
          <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
            Existing in your profile
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
            {existingMedication.medicationName}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            {getExistingDosage()}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            {existingMedication.frequency || "Once Daily"}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {existingMedication.duration || (existingMedication.totalQuantity ? `${existingMedication.totalQuantity} Days` : "Ongoing")}
          </Text>
        </View>

        {/* Right: New Extracted */}
        <View style={{ flex: 1, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
          <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
            Newly extracted
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
            {extractedMedicine.name}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            {getExtractedDosage()}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            {(() => {
              const freq = extractedMedicine.frequency || "ONCE";
              if (freq === "ONCE") return "Once Daily";
              if (freq === "TWICE") return "Twice Daily";
              if (freq === "THRICE") return "3x Daily";
              return freq;
            })()}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {extractedMedicine.duration || "30 Days"}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginBottom: 4 }}>
          Reason
        </Text>
        <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#475569", fontStyle: "italic" }}>
          Duplicate medicine with same strength and frequency
        </Text>
      </View>

      {/* Resolution Choice Buttons */}
      {currentConflict.resolvedAction !== undefined ? (
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(16, 185, 129, 0.08)" : "#f0fdf4", borderColor: "#10b981", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 6 }} />
          <Text style={{ color: "#10b981", fontWeight: "bold", fontSize: 13 }}>
            ✓ Resolved - {resolvedLabel}
          </Text>
        </View>
      ) : (
        isLatest && (
          <View style={{ marginBottom: 16 }}>
            {/* Row 1: Solid blue buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => onResolve("keep")}
                style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                  Keep Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onResolve("replace")}
                style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Outlined buttons */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                onPress={() => onResolve("merge", existingMedication)}
                style={{ flex: 1, borderColor: "#2563eb", borderWidth: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#2563eb", fontWeight: "bold", fontSize: 12 }}>
                  Merge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onEdit(extractedMedicine)}
                style={{ flex: 1, borderColor: "#2563eb", borderWidth: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#2563eb", fontWeight: "bold", fontSize: 12 }}>
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onResolve("remove_new")}
                style={{ flex: 1.2, borderColor: "#fca5a5", borderWidth: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 12 }}>
                  Remove New
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}

      {/* Footer Pager */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
        <TouchableOpacity
          disabled={currentIndex === 0}
          onPress={() => onNavigate("prev")}
          style={{ opacity: currentIndex === 0 ? 0.3 : 1, padding: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#475569" }}>
          {currentIndex + 1} of {conflicts.length}
        </Text>

        <TouchableOpacity
          disabled={currentIndex === conflicts.length - 1}
          onPress={() => onNavigate("next")}
          style={{ opacity: currentIndex === conflicts.length - 1 ? 0.3 : 1, padding: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>
      </View>

      {/* Bottom Option buttons to bypass conflicts */}
      {isLatest && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, borderTopWidth: 0.5, borderTopColor: isDark ? "#334155" : "#e2e8f0", paddingTop: 12 }}>
          <TouchableOpacity onPress={onContinueAnyway} style={{ padding: 4 }}>
            <Text style={{ fontSize: 12, color: "#3b82f6", fontWeight: "600" }}>Continue Anyway</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReviewMedicines} style={{ padding: 4 }}>
            <Text style={{ fontSize: 12, color: "#3b82f6", fontWeight: "600" }}>Review Medicines</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ConfirmMedicinesCard component
interface ConfirmMedicinesCardProps {
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

export function ConfirmMedicinesCard({
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
    <View style={[styles.card, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      {/* Title */}
      <View style={styles.confirmHeader}>
        <View style={styles.badgeCheck}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        </View>
        <Text style={[styles.confirmTitle, { color: isDark ? "#f8fafc" : "#1e293b" }]}>{t("finalConfirmation")}</Text>
      </View>

      {/* Summary Rows */}
      <View style={styles.summaryList}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{t("docsProcessed")}</Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>{docsCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{t("medsExtractedLabel")}</Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>{extractedCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{t("duplicateConflictsResolved")}</Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#cbd5e1" : "#1e293b" }]}>{conflictsResolvedCount}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryTotalLabel, { color: "#10b981" }]}>{t("medsReadyToAdd")}</Text>
          <Text style={[styles.summaryTotalValue, { color: "#10b981" }]}>{toBeAddedCount}</Text>
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
        <TouchableOpacity onPress={onConfirm} disabled={isLoading} style={[styles.primaryButton, { backgroundColor: "#10b981" }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("confirmAndAddMeds")}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// SuccessCard component
interface SuccessCardProps {
  count: number;
  isDark: boolean;
  onViewMedicines: () => void;
  preferredLang?: string;
}

export function SuccessCard({
  count,
  isDark,
  onViewMedicines,
  preferredLang = "english",
}: SuccessCardProps) {
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const getDescription = () => {
    const lang = preferredLang || "english";
    const descMap: Record<string, string> = {
      english: `${count} medicine(s) have been added to your profile.`,
      gujarati: `${count} દવા(ઓ) તમારી પ્રોફાઇલમાં ઉમેરવામાં આવી છે.`,
      hindi: `${count} दवाएं आपकी प्रोफाइल में जोड़ दी गई हैं।`,
      marathi: `${count} औषधे तुमच्या प्रोफाइलमध्ये जोडली गेली आहेत.`,
      tamil: `${count} மருந்து(கள்) உங்கள் சுயவிவரத்தில் சேர்க்கப்பட்டுள்ளன.`,
    };
    return descMap[lang] || descMap.english;
  };

  const getViewMedicinesText = () => {
    const lang = preferredLang || "english";
    const viewMap: Record<string, string> = {
      english: "View My Medicines",
      gujarati: "મારી દવાઓ જુઓ",
      hindi: "मेरी दवाएं देखें",
      marathi: "माझी औषधे पहा",
      tamil: "எனது மருந்துகளைப் பார்க்கவும்",
    };
    return viewMap[lang] || viewMap.english;
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0", alignItems: "center", paddingVertical: 24 }]}>
      {/* Checkmark circle graphic illustration */}
      <View style={styles.successIconWrapper}>
        <View style={styles.successPulseBg} />
        <Ionicons name="checkmark-circle" size={72} color="#10b981" />
      </View>

      <Text style={[styles.successTitle, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
        {t("medicinesAddedSuccess") || "Medicines Added Successfully!"}
      </Text>

      <Text style={[styles.successDescription, { color: isDark ? "#cbd5e1" : "#64748b" }]}>
        {getDescription()}
      </Text>

      <TouchableOpacity onPress={onViewMedicines} style={[styles.primaryButton, { backgroundColor: "#3b82f6", width: "85%", marginTop: 12 }]}>
        <Text style={styles.primaryButtonText}>{getViewMedicinesText()}</Text>
      </TouchableOpacity>
    </View>
  );
}

// MedicineExtractionSummaryCard component
interface MedicineExtractionSummaryCardProps {
  documents: { id: string; fileName: string; medicinesCount: number }[];
  isDark: boolean;
  isLatest: boolean;
  onReview: () => void;
}

export function MedicineExtractionSummaryCard({
  documents,
  isDark,
  isLatest,
  onReview,
}: MedicineExtractionSummaryCardProps) {
  const totalCount = documents.reduce((sum, doc) => sum + (doc.medicinesCount || 0), 0);

  return (
    <View style={[styles.card, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      <View style={styles.summaryPillHeader}>
        <Text style={[styles.summaryPillTitle, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
          💊 {totalCount} Medicine{totalCount === 1 ? "" : "s"} Extracted
        </Text>
      </View>
      <View style={{ marginVertical: 8 }}>
        {documents.map((doc, idx) => (
          <View key={doc.id || idx} style={styles.summaryDocRow}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
              <Ionicons name="document-text-outline" size={16} color="#0f766e" style={{ marginRight: 6 }} />
              <Text style={[styles.summaryDocName, { color: isDark ? "#cbd5e1" : "#334155" }]} numberOfLines={1}>
                {doc.fileName}
              </Text>
            </View>
            <Text style={[styles.summaryDocCount, { color: doc.medicinesCount > 0 ? "#10b981" : "#ef4444" }]}>
              {doc.medicinesCount > 0 ? `${doc.medicinesCount} medicine${doc.medicinesCount === 1 ? "" : "s"}` : "NO MEDICINES FOUND"}
            </Text>
          </View>
        ))}
      </View>
      {isLatest && (
        <TouchableOpacity onPress={onReview} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Review Medicines</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// MedicineDocumentAccordionCard component
interface MedicineDocumentAccordionCardProps {
  documents: { id: string; fileName: string; medicinesCount: number }[];
  medicines: ExtractedMedicine[];
  isDark: boolean;
  isLatest: boolean;
  onEdit: (med: ExtractedMedicine) => void;
  onContinue: () => void;
  isLoading: boolean;
  preferredLang?: string;
}

export function MedicineDocumentAccordionCard({
  documents,
  medicines,
  isDark,
  isLatest,
  onEdit,
  onContinue,
  isLoading,
  preferredLang = "english",
}: MedicineDocumentAccordionCardProps) {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(
    documents.find(d => d.medicinesCount > 0)?.id || null
  );
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  const toggleDoc = (id: string) => {
    setExpandedDocId(prev => (prev === id ? null : id));
    setExpandedMedId(null);
  };

  const toggleMed = (id: string) => {
    setExpandedMedId(prev => (prev === id ? null : id));
  };

  const getFrequencyLabel = (freq?: string) => {
    if (!freq) return "Once Daily";
    if (freq === "ONCE") return "Once Daily";
    if (freq === "TWICE") return "Twice Daily";
    if (freq === "THRICE") return "3x Daily";
    return freq;
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      {documents.map((doc) => {
        const isDocExpanded = expandedDocId === doc.id;
        const docMeds = medicines.filter(m => m.documentId === doc.id);

        return (
          <View key={doc.id} style={[styles.accordionSection, { borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9" }]}>
            {/* Document Header */}
            <TouchableOpacity onPress={() => toggleDoc(doc.id)} style={styles.accordionHeader}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="document-text-outline" size={18} color="#0f766e" style={{ marginRight: 8 }} />
                <View>
                  <Text style={[styles.accordionDocName, { color: isDark ? "#f8fafc" : "#1e293b" }]} numberOfLines={1}>
                    {doc.fileName}
                  </Text>
                  <Text style={styles.accordionDocSub}>
                    {doc.medicinesCount} medicine{doc.medicinesCount === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isDocExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={isDark ? "#cbd5e1" : "#475569"}
              />
            </TouchableOpacity>

            {/* Document Content - Medicine list */}
            {isDocExpanded && (
              <View style={styles.accordionContent}>
                {docMeds.length === 0 ? (
                  <Text style={styles.noMedsText}>No medicines found in this document.</Text>
                ) : (
                  docMeds.map((med) => {
                    const isMedExpanded = expandedMedId === med.id;
                    return (
                      <View key={med.id} style={[styles.medAccordionCard, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0" }]}>
                        {/* Collapsed Header */}
                        <TouchableOpacity onPress={() => toggleMed(med.id)} style={styles.medAccordionHeader}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.medAccordionName, { color: isDark ? "#f8fafc" : "#0f172a" }]}>{med.name}</Text>
                            {!isMedExpanded && (
                              <Text style={styles.medAccordionDesc}>
                                {med.dosage || "1"} {med.dosageUnit || "tablet"} • {getFrequencyLabel(med.frequency)} • {med.timing || "After Food"}
                              </Text>
                            )}
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            {isLatest && (
                              <TouchableOpacity onPress={() => onEdit(med)} style={styles.medEditIcon}>
                                <Ionicons name="pencil-outline" size={16} color="#0f766e" />
                              </TouchableOpacity>
                            )}
                            <Ionicons
                              name={isMedExpanded ? "chevron-up" : "chevron-down"}
                              size={16}
                              color={isDark ? "#94a3b8" : "#64748b"}
                              style={{ marginLeft: 8 }}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded details */}
                        {isMedExpanded && (
                          <View style={styles.medAccordionDetail}>
                            <View style={styles.grid}>
                              <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Strength</Text>
                                <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                                  {med.dosage || "Not specified"}
                                </Text>
                              </View>
                              <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Dose</Text>
                                <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                                  {med.dosage || "1"} {med.dosageUnit || "tablet"}
                                </Text>
                              </View>
                              <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Frequency</Text>
                                <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                                  {getFrequencyLabel(med.frequency)}
                                </Text>
                              </View>
                              <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Duration</Text>
                                <Text style={[styles.gridValue, { color: isDark ? "#cbd5e1" : "#334155" }]}>
                                  {"30 Days"}
                                </Text>
                              </View>
                            </View>
                            {med.notes ? (
                              <View style={[styles.notesWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f1f5f9" }]}>
                                <Text style={[styles.notesText, { color: isDark ? "#94a3b8" : "#475569" }]}>
                                  <Text style={{ fontWeight: "bold" }}>Notes: </Text>{med.notes}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}

      {isLatest && (
        <TouchableOpacity onPress={onContinue} disabled={isLoading} style={styles.primaryButton}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// Stylesheet
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
  reportSection: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  reportName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 8,
  },
  medCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  medHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  medName: {
    fontSize: 15,
    fontWeight: "700",
  },
  medType: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 11,
    color: "#0f766e",
    fontWeight: "700",
    marginLeft: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  gridItem: {
    width: "50%",
  },
  gridLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  notesWrapper: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0f766e",
  },
  notesText: {
    fontSize: 11,
    lineHeight: 14,
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  conflictHeader: {
    marginBottom: 10,
  },
  conflictSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b45309",
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  comparisonContainer: {
    flexDirection: "row",
    marginVertical: 6,
  },
  comparisonCol: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  colHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  colValueBold: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  colValue: {
    fontSize: 11,
    marginTop: 2,
  },
  reasonBlock: {
    marginVertical: 8,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  reasonText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.32,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 16,
  },
  pagerArrow: {
    padding: 6,
  },
  pagerIndicator: {
    fontSize: 12,
    fontWeight: "700",
  },
  bypassRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  secondaryTextBtn: {
    padding: 6,
  },
  secondaryTextBtnText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "700",
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  summaryList: {
    gap: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  confirmText: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 8,
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  successPulseBg: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  successDescription: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  resolvedBlock: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    justifyContent: "center",
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryPillHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  summaryPillTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  summaryDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryDocName: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryDocCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  accordionSection: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionDocName: {
    fontSize: 14,
    fontWeight: "700",
  },
  accordionDocSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  accordionContent: {
    marginTop: 10,
    paddingLeft: 8,
  },
  noMedsText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  medAccordionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  medAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medAccordionName: {
    fontSize: 13,
    fontWeight: "700",
  },
  medAccordionDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  medEditIcon: {
    padding: 4,
  },
  medAccordionDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
});
