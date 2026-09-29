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

  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const handleConfirmFormatted = () => {
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
          frequency: String(m.frequency || "ONCE").toUpperCase(),
          dose: doseObj,
          dosePerIntake:
            medTypeUpper === "TABLET" || medTypeUpper === "CAPSULE"
              ? String(doseObj.count)
              : `${doseObj.value} ${doseObj.unit}`.trim(),
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

        if (resValue === "REPLACE" && matchedMed?.id) {
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
  const isConfirmChosen =
    readOnly &&
    (parsed?.selected !== undefined || (chosenLabel && String(chosenLabel).toLowerCase().includes("confirm")));
  const isAddNewChosen =
    readOnly &&
    (parsed?.addNew === true || (chosenLabel && String(chosenLabel).toLowerCase().includes("add")));
  const isSkipAllChosen =
    readOnly &&
    (parsed?.skipAll === true || (chosenLabel && String(chosenLabel).toLowerCase().includes("skip")));

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
        {conflictingMeds.length > 0 && (
          <TouchableOpacity
            onPress={() => setViewMode("conflicts")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#ffedd5",
              borderColor: "#f97316",
              borderWidth: 1,
              borderRadius: 12,
              padding: 10,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
              <Ionicons name="warning" size={18} color="#ea580c" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: "#c2410c", fontWeight: "600", flex: 1 }}>
                {conflictingMeds.length} duplicate conflicts detected. Tap to resolve them one by one.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ea580c" />
          </TouchableOpacity>
        )}

        <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
          {t("extractedMedicationsList")}
        </Text>
        <Text style={[styles.medCardSubtitleText, { color: theme.colors.textSecondary }]}>
          {t("pleaseCheckWhichMedicines")}
        </Text>

        <View style={{ marginVertical: 12 }}>
          {(isExpanded ? displayedMedicines : displayedMedicines.slice(0, 3)).map((rawMed) => (
            <MedicineReviewItem
              key={rawMed.client_med_id || rawMed.id}
              med={rawMed}
              isChecked={Boolean(
                (rawMed.client_med_id && checkedMeds.includes(rawMed.client_med_id)) ||
                (rawMed.id && checkedMeds.includes(rawMed.id))
              )}
              isExpanded={
                expandedMedId === (rawMed.client_med_id || rawMed.id) ||
                (rawMed.id && expandedMedId === rawMed.id) ||
                (rawMed.client_med_id && expandedMedId === rawMed.client_med_id)
              }
              readOnly={readOnly}
              isDark={isDark}
              theme={theme}
              resolutions={resolutions}
              onToggleCheck={toggleCheck}
              onToggleExpand={toggleExpandPill}
              onEdit={onEdit}
            />
          ))}

          {displayedMedicines.length > 3 && (
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "bold",
                  marginRight: 6,
                  fontSize: 13,
                }}
              >
                {isExpanded ? t("hideAll") || "Hide All" : t("showAll") || "Show All"}
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
          onConfirm={handleConfirmFormatted}
          onAddNew={onAddNew}
          onSkipAll={onSkipAll}
          onCancel={onCancel}
          t={t}
          isConfirmChosen={Boolean(isConfirmChosen)}
          isAddNewChosen={Boolean(isAddNewChosen)}
          isSkipAllChosen={Boolean(isSkipAllChosen)}
          warningText={getStartDateWarningText()}
          hasUnresolvedConflicts={conflictingMeds.length > 0}
          readOnly={readOnly}
        />
      </View>
    </View>
  );
}

export { formatFoodContext, formatStartDate, isPastDate };
