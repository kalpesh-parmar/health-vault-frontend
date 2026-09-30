import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";
import { DocumentProgressSummaryContainer } from "./DocumentProgressSummaryContainer";
import { deduplicateDrafts } from "./AddMedicineCard";
import {
  useMedicineReviewState,
  isPastDate,
  formatFoodContext,
  formatStartDate,
} from "./medicine-review/useMedicineReviewState";
import { MedicineReviewItem } from "./medicine-review/MedicineReviewItem";
import { MedicineConflictResolver } from "./medicine-review/MedicineConflictResolver";
import { MedicineActionFooter } from "./medicine-review/MedicineActionFooter";

export interface ReviewMedicinesListCardProps {
  localMedicines: any[];
  setLocalMedicines: React.Dispatch<React.SetStateAction<any[]>>;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: (checkedMeds: string[], formattedMeds?: any[]) => void;
  onAddNew: () => void;
  onSkipAll: () => void;
  onEdit: (med: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  canRetry?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
  documents?: any[];
  onRetryDocument?: (fileKey: string, batchId?: string) => Promise<void> | void;
  showDocumentSummary?: boolean;
}

export function ReviewMedicinesListCard({
  localMedicines,
  setLocalMedicines,
  preferredLang,
  isDark,
  theme,
  onConfirm,
  onAddNew,
  onSkipAll,
  onEdit,
  onCancel,
  readOnly,
  canRetry,
  chosenVal,
  chosenLabel,
  documents,
  onRetryDocument,
  showDocumentSummary = true,
}: ReviewMedicinesListCardProps) {
  const {
    safeLocalMedicines,
    checkedMeds,
    expandedMedIds,
    expandedMedId,
    isExpanded,
    setIsExpanded,
    resolutions,
    conflictingMeds,
    viewMode,
    setViewMode,
    currentConflictIdx,
    setCurrentConflictIdx,
    toggleCheck,
    toggleExpandPill,
    handleResolveConflict,
  } = useMedicineReviewState({ localMedicines, setLocalMedicines, readOnly });

  // Language normalization helper
  const normalizeLang = (l?: string) => {
    if (!l) return "english";
    const lower = l.toLowerCase();
    if (lower.startsWith("gu")) return "gujarati";
    if (lower.startsWith("hi")) return "hindi";
    if (lower.startsWith("mr")) return "marathi";
    if (lower.startsWith("ta")) return "tamil";
    return "english";
  };

  // Translation helper
  const t = (key: string) => {
    const lang = normalizeLang(preferredLang);
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const resolveCanonicalFrequency = (freqVal: any): string => {
    if (!freqVal || freqVal === "None") return "Once Daily";
    const str = String(freqVal).trim();
    const upper = str.toUpperCase().replace(/\s+/g, "_");
    if (upper === "ONCE" || upper === "ONCE_DAILY" || upper === "1X_DAILY" || upper === "1_TIME_A_DAY") {
      return "Once Daily";
    }
    if (upper === "TWICE" || upper === "TWICE_DAILY" || upper === "2X_DAILY" || upper === "2_TIMES_A_DAY") {
      return "Twice Daily";
    }
    if (upper === "THRICE" || upper === "THREE_TIMES_DAILY" || upper === "3X_DAILY" || upper === "3_TIMES_A_DAY") {
      return "Three Times Daily";
    }
    if (upper === "AS_NEEDED") {
      return "As Needed";
    }
    if (str === "Once Daily" || str === "Twice Daily" || str === "Three Times Daily" || str === "As Needed") {
      return str;
    }
    return "Once Daily";
  };

  const handleConfirm = () => {
    if (readOnly) return;
    const formattedMedicines = deduplicateDrafts(localMedicines || [])
      .filter((m) => Boolean((m.client_med_id && checkedMeds.includes(m.client_med_id)) || (m.id && checkedMeds.includes(m.id))))
      .map((m) => {
        const medKey = m.client_med_id || m.id;
        const resValue = resolutions[medKey] || resolutions[m.id] || (m.client_med_id && resolutions[m.client_med_id]) || "KEEP_NEW";
        const matchedMed = m.duplicateInfo?.matchedMedication || m.duplicateInfo?.matchedMedications?.[0];

        const medTypeUpper = String(m.type || m.medicationType || "TABLET").toUpperCase();
        let doseObj: any;
        if (medTypeUpper === "TABLET" || medTypeUpper === "CAPSULE") {
          const doseCount =
            typeof m.dose === "object" && m.dose !== null && m.dose.count !== undefined
              ? parseFloat(String(m.dose.count)) || 1
              : parseFloat(String(m.dosePerIntake || "1")) || 1;
          doseObj = { count: doseCount };
        } else {
          let val =
            typeof m.dose === "object" && m.dose !== null && m.dose.value !== undefined
              ? parseFloat(String(m.dose.value))
              : typeof m.dose === "object" && m.dose !== null && m.dose.count !== undefined
                ? parseFloat(String(m.dose.count))
                : parseFloat(String(m.dosePerIntake || "1"));
          if (isNaN(val) || val <= 0) val = 1;

          let unit =
            typeof m.dose === "object" && m.dose !== null && m.dose.unit
              ? String(m.dose.unit)
              : m.unit || "";

          if (!unit && typeof m.dosePerIntake === "string") {
            const parts = m.dosePerIntake.trim().split(/\s+/);
            if (parts.length > 1) {
              unit = parts.slice(1).join(" ");
            }
          }
          if (!unit) {
            unit = medTypeUpper.toLowerCase();
          }
          doseObj = { value: val, unit };
        }

        const result: any = {
          client_med_id: m.client_med_id || m.id,
          id: m.id || m.client_med_id,
          name: m.name || m.medicationName || "Unknown",
          type: medTypeUpper,
          frequency: resolveCanonicalFrequency(m.frequency),
          dose: doseObj,
          dosePerIntake:
            medTypeUpper === "TABLET" || medTypeUpper === "CAPSULE"
              ? Number(doseObj.count)
              : Number(doseObj.value),
          foodFrequency: String(m.foodFrequency || m.foodContext || "AFTER_FOOD").toUpperCase(),
          resolution: resValue,
          startDate: m.startDate || new Date().toISOString().split("T")[0],
          endDate: m.endDate || undefined,
          duration: m.duration || undefined,
          notes: m.notes || m.instructions || "",
          prescribedBy: m.prescribedBy || m.prescribed_by || "",
          totalQuantity: m.total_quantity !== undefined ? m.total_quantity : m.totalQuantity || 10,
          refillAlert: m.refill_alert !== undefined ? m.refill_alert : m.refillAlert || false,
          medicationSchedule: m.medicationSchedule || m.schedule || m.times || [],
          duplicateInfo: m.duplicateInfo,
        };
        if ((resValue === "REPLACE" || resValue === "EDIT") && matchedMed?.id) {
          result.replaceMedicationId = matchedMed.id;
        }

        return result;
      });

    onConfirm(checkedMeds, formattedMedicines);
  };

  const isAnyCheckedMedMissingStartDate =
    !readOnly &&
    safeLocalMedicines
      .filter((m) => Boolean((m.client_med_id && checkedMeds.includes(m.client_med_id)) || (m.id && checkedMeds.includes(m.id))))
      .some((m) => !m.startDate || m.startDate === "None");

  const isAnyCheckedMedPastStartDate =
    !readOnly &&
    safeLocalMedicines
      .filter((m) => Boolean((m.client_med_id && checkedMeds.includes(m.client_med_id)) || (m.id && checkedMeds.includes(m.id))))
      .some((m) => m.startDate && m.startDate !== "None" && isPastDate(m.startDate));

  const getStartDateWarningText = () => {
    if (isAnyCheckedMedMissingStartDate) return t("missingStartDateWarning");
    if (isAnyCheckedMedPastStartDate) return t("pastStartDateWarning");
    return "";
  };

  const isConfirmDisabled =
    readOnly ||
    checkedMeds.length === 0 ||
    conflictingMeds.length > 0 ||
    isAnyCheckedMedMissingStartDate ||
    isAnyCheckedMedPastStartDate;

  const parsed = parseChosenJson(chosenVal);
  const localizedConfirmLabels = [
    I18N_ONBOARDING_UI.english?.confirmSelection,
    I18N_ONBOARDING_UI.gujarati?.confirmSelection,
    I18N_ONBOARDING_UI.hindi?.confirmSelection,
    I18N_ONBOARDING_UI.marathi?.confirmSelection,
    I18N_ONBOARDING_UI.tamil?.confirmSelection,
    t("confirmSelection"),
    "આગળ વધો",
    "आगे बढ़ें",
    "पुढे जा",
    "தொடரவும்",
    "Confirm Selection",
  ].filter(Boolean);

  const isConfirmChosen =
    readOnly &&
    (parsed?.selected !== undefined ||
      (chosenLabel &&
        (String(chosenLabel).toLowerCase().includes("confirm") ||
          localizedConfirmLabels.includes(chosenLabel))));
  const isAddNewChosen =
    readOnly &&
    (parsed?.addNew === true || (chosenLabel && String(chosenLabel).toLowerCase().includes("add")));
  const isSkipAllChosen =
    readOnly &&
    (parsed?.skipAll === true ||
      (chosenLabel && String(chosenLabel).toLowerCase().includes("skip")));

  const confirmOpacity = readOnly ? (isConfirmChosen ? 1 : 0.55) : (isConfirmDisabled ? 0.55 : 1);
  const addNewOpacity = readOnly ? (isAddNewChosen ? 1 : 0.55) : 1;
  const skipAllOpacity = readOnly ? (isSkipAllChosen ? 1 : 0.55) : 1;

  if (viewMode === "conflicts" && conflictingMeds.length > 0) {
    return (
      <View style={{ width: "100%" }}>
        {showDocumentSummary && (
          <DocumentProgressSummaryContainer
            documents={documents}
            preferredLang={preferredLang}
            isDark={isDark}
            theme={theme}
            onRetry={onRetryDocument}
            canRetry={canRetry !== undefined ? canRetry : !readOnly}
            readOnly={readOnly}
          />
        )}
        <MedicineConflictResolver
          conflictingMeds={conflictingMeds}
          currentConflictIdx={currentConflictIdx}
          setCurrentConflictIdx={setCurrentConflictIdx}
          onResolve={handleResolveConflict}
          onEdit={onEdit}
          onSwitchToList={() => setViewMode("list")}
          isDark={isDark}
          theme={theme}
          readOnly={readOnly}
        />
      </View>
    );
  }

  const displayedMedicines = deduplicateDrafts(
    readOnly
      ? safeLocalMedicines.filter((m) => Boolean((m.client_med_id && checkedMeds.includes(m.client_med_id)) || (m.id && checkedMeds.includes(m.id))))
      : safeLocalMedicines,
  );

  return (
    <View style={{ width: "100%" }}>
      {showDocumentSummary && (
        <DocumentProgressSummaryContainer
          documents={documents}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onRetry={onRetryDocument}
          canRetry={canRetry !== undefined ? canRetry : !readOnly}
          readOnly={readOnly}
        />
      )}

      <View
        style={[
          styles.medListCard,
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderColor: isDark ? "#334155" : "#e2e8f0",
          },
        ]}
      >
        <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
          {t("extractedMedicationsList")}
        </Text>
        <Text
          style={[
            styles.medCardSubtitleText,
            { color: theme.colors.textSecondary },
          ]}
        >
          {t("pleaseCheckWhichMedicines")}
        </Text>

        <View style={styles.medicationList}>
          {(isExpanded ? displayedMedicines : displayedMedicines.slice(0, 3)).map((rawMed) => (
            <MedicineReviewItem
              key={rawMed.client_med_id || rawMed.id}
              med={rawMed}
              isChecked={Boolean(
                (rawMed.client_med_id && checkedMeds.includes(rawMed.client_med_id)) ||
                (rawMed.id && checkedMeds.includes(rawMed.id))
              )}
              isExpanded={
                Boolean(
                  (expandedMedIds && (
                    (rawMed.client_med_id && expandedMedIds.includes(rawMed.client_med_id)) ||
                    (rawMed.id && expandedMedIds.includes(rawMed.id))
                  )) ||
                  expandedMedId === (rawMed.client_med_id || rawMed.id) ||
                  (rawMed.id && expandedMedId === rawMed.id) ||
                  (rawMed.client_med_id && expandedMedId === rawMed.client_med_id)
                )
              }
              readOnly={readOnly}
              isDark={isDark}
              theme={theme}
              preferredLang={preferredLang}
              resolutions={resolutions}
              onToggleCheck={toggleCheck}
              onToggleExpand={toggleExpandPill}
              onEdit={onEdit}
            />
          ))}

          {displayedMedicines.length > 3 && (
            <TouchableOpacity
              testID="show-all-medicines-btn"
              onPress={() => setIsExpanded(!isExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 12,
                marginTop: 10,
                borderRadius: 20,
                alignSelf: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "600",
                  fontSize: 13,
                  marginRight: 4,
                }}
              >
                {isExpanded ? t("hideAll") : `${t("showAll")} (${displayedMedicines.length})`}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        <MedicineActionFooter
          checkedCount={checkedMeds.length}
          isConfirmDisabled={isConfirmDisabled}
          areActionsDisabled={readOnly}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onAddNew={onAddNew}
          onSkipAll={onSkipAll}
          onCancel={onCancel}
          t={t}
          isConfirmChosen={Boolean(isConfirmChosen)}
          isAddNewChosen={Boolean(isAddNewChosen)}
          isSkipAllChosen={Boolean(isSkipAllChosen)}
          confirmOpacity={confirmOpacity}
          addNewOpacity={addNewOpacity}
          skipAllOpacity={skipAllOpacity}
          warningText={getStartDateWarningText()}
          hasUnresolvedConflicts={conflictingMeds.length > 0}
          readOnly={readOnly}
        />
      </View>
    </View>
  );
}
