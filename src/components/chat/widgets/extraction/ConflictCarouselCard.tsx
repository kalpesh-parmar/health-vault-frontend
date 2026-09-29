import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedMedicine } from "../../../../types/medicationReview";
import { I18N_ONBOARDING_UI } from "../OnboardingI18n";
import { DocumentProgressSummaryContainer } from "../DocumentProgressSummaryContainer";

export interface ConflictCarouselCardProps {
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
  documents?: any[];
  onRetryDocument?: (fileKey: string, batchId?: string) => Promise<void> | void;
}

export const ConflictCarouselCard = React.memo(function ConflictCarouselCard({
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
  documents,
  onRetryDocument,
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
    <View style={{ width: "100%" }}>
      <DocumentProgressSummaryContainer
        documents={documents}
        preferredLang={preferredLang}
        isDark={isDark}
        onRetry={onRetryDocument}
        canRetry={isLatest}
        readOnly={!isLatest}
      />
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
            <TouchableOpacity
              onPress={onContinueAnyway}
              style={{
                flex: 1,
                marginRight: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isDark ? "#334155" : "#f1f5f9",
                borderColor: isDark ? "#475569" : "#cbd5e1",
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#475569", fontWeight: "600" }}>
                {t("skipAll") || "Skip All"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onReviewMedicines}
              style={{
                flex: 1,
                marginLeft: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isDark ? "#334155" : "#e2e8f0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: isDark ? "#f8fafc" : "#1e293b", fontWeight: "600" }}>
                {t("review") || "Review Medicines"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});
