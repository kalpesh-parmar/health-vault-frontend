import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MedicineTimingPills } from "./MedicineTimingPills";
import { I18N_ONBOARDING_UI, resolveDoseUnitDisplay } from "../OnboardingI18n";
import {
  getDosageString,
  getTimeString,
  formatFoodContext,
  formatStartDate,
  isPastDate,
} from "./useMedicineReviewState";

interface MedicineReviewItemProps {
  med: any;
  isChecked: boolean;
  isExpanded: boolean;
  readOnly?: boolean;
  isDark: boolean;
  theme: any;
  resolutions: Record<string, string>;
  preferredLang?: string;
  onToggleCheck: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onEdit: (med: any) => void;
}

export const MedicineReviewItem = React.memo(function MedicineReviewItem({
  med,
  isChecked,
  isExpanded,
  readOnly,
  isDark,
  theme,
  resolutions,
  preferredLang,
  onToggleCheck,
  onToggleExpand,
  onEdit,
}: MedicineReviewItemProps) {
  const medKey = med.client_med_id || med.id;

  const normalizeLang = (l?: string) => {
    if (!l) return "english";
    const lower = l.toLowerCase();
    if (lower.startsWith("gu")) return "gujarati";
    if (lower.startsWith("hi")) return "hindi";
    if (lower.startsWith("mr")) return "marathi";
    if (lower.startsWith("ta")) return "tamil";
    return "english";
  };

  const t = (key: string) => {
    const lang = normalizeLang(preferredLang);
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const formatDisplayDose = () => {
    if (typeof med.dosage === "string" && med.dosage.trim().length > 0) {
      return med.dosage;
    }
    const rawDose = med.dose || med.dosage || med.dosePerIntake;
    if (rawDose && typeof rawDose === "object") {
      if (rawDose.count !== undefined) {
        const unit = resolveDoseUnitDisplay(med.type || "TABLET", preferredLang);
        return `${rawDose.count} ${unit}`.trim();
      }
      if (rawDose.value !== undefined) {
        const unit = resolveDoseUnitDisplay(rawDose.unit || med.type || "", preferredLang);
        return `${rawDose.value} ${unit}`.trim();
      }
    }
    return getDosageString(med);
  };

  const formatFrequencyDisplay = () => {
    const freqUpper = String(med.frequency || "").toUpperCase().replace(/\s+/g, "_");
    if (freqUpper === "ONCE" || freqUpper === "ONCE_DAILY" || freqUpper === "1X_DAILY" || freqUpper === "1_TIME_A_DAY") {
      return t("frequency.ONCE") || "Once Daily";
    }
    if (freqUpper === "TWICE" || freqUpper === "TWICE_DAILY" || freqUpper === "2X_DAILY" || freqUpper === "2_TIMES_A_DAY") {
      return t("frequency.TWICE") || "Twice Daily";
    }
    if (freqUpper === "THRICE" || freqUpper === "THREE_TIMES_DAILY" || freqUpper === "3X_DAILY" || freqUpper === "3_TIMES_A_DAY") {
      return t("frequency.THRICE") || "Three Times Daily";
    }
    if (freqUpper === "AS_NEEDED") {
      return t("frequency.AS_NEEDED") || "As Needed";
    }
    return med.frequency || t("none");
  };

  const medTypeUpper = String(med.type || med.medicationType || "TABLET").toUpperCase();
  const localizedMedType = t(`medicineType.${medTypeUpper}`) || med.type || "Tablet";
  const dosageStr = formatDisplayDose();
  const timeStr = getTimeString(med);
  const foodStr = formatFoodContext(med.foodFrequency || med.foodContext);
  const startDateStr = formatStartDate(med.startDate);
  const pastStartDate = isPastDate(med.startDate);

  const hasDuplicate = Boolean(med.duplicateInfo?.hasDuplicate);
  const isSolved = readOnly || resolutions[med.id] !== undefined || med.resolution !== undefined;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1e293b" : "#f8fafc",
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
      ]}
    >
      {/* Header Row */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onToggleExpand(medKey)}
        style={styles.headerRow}
      >
        <View style={styles.leftInfo}>
          {/* Checkbox */}
          <TouchableOpacity
            disabled={readOnly}
            onPress={() => onToggleCheck(medKey)}
            style={styles.checkboxTouch}
          >
            <Ionicons
              name={isChecked ? "checkbox" : "square-outline"}
              size={22}
              color={isChecked ? theme.colors.primary : isDark ? "#64748b" : "#94a3b8"}
            />
          </TouchableOpacity>

          {/* Name & Type */}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.medName,
                  {
                    color: isDark ? "#f1f5f9" : "#1e293b",
                    textDecorationLine: isChecked ? "none" : "line-through",
                  },
                ]}
              >
                {med.name || med.medicationName || "Unknown"}
              </Text>
              {hasDuplicate && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isSolved ? (isDark ? "#064e3b" : "#d1fae5") : (isDark ? "#7c2d12" : "#ffedd5"),
                      borderColor: isSolved ? "#10b981" : "#f97316",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isSolved ? (isDark ? "#34d399" : "#047857") : (isDark ? "#fb923c" : "#ea580c") },
                    ]}
                  >
                    {isSolved ? "Solved" : "Conflict"}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.medType, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              {localizedMedType} • {dosageStr}
            </Text>
          </View>
        </View>

        {/* Action icons */}
        <View style={styles.rightActions}>
          {!readOnly && (
            <TouchableOpacity
              testID={`edit-med-${medKey}`}
              onPress={() => onEdit(med)}
              style={styles.actionIconTouch}
            >
              <Ionicons name="pencil" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID={`expand-med-${medKey}`}
            onPress={() => onToggleExpand(medKey)}
            style={styles.actionIconTouch}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <MedicineTimingPills
        foodContext={foodStr}
        startDate={startDateStr}
        isDark={isDark}
        isPast={pastStartDate}
      />

      {/* Expanded Accordion Grid */}
      {isExpanded && (
        <View
          style={[
            styles.expandedGrid,
            { borderTopColor: isDark ? "#334155" : "#e2e8f0" },
          ]}
        >
          <View style={styles.gridRow}>
            {/* Medicine Name */}
            <View style={styles.gridCell}>
              <Ionicons name="medkit-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("medicineName")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.name || med.medicationName || t("none")}
                </Text>
              </View>
            </View>

            {/* Medicine Type */}
            <View style={styles.gridCell}>
              <Ionicons name="pricetag-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("medicineType")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {localizedMedType}
                </Text>
              </View>
            </View>

            {/* Dose */}
            <View style={styles.gridCell}>
              <Ionicons name="fitness-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("dose")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {dosageStr}
                </Text>
              </View>
            </View>

            {/* Frequency */}
            <View style={styles.gridCell}>
              <Ionicons name="alarm-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("frequency")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {formatFrequencyDisplay()}
                </Text>
              </View>
            </View>

            {/* Schedule / Times */}
            <View style={styles.gridCell}>
              <Ionicons name="time-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("times")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {timeStr}
                </Text>
              </View>
            </View>

            {/* Total Quantity */}
            <View style={styles.gridCell}>
              <Ionicons name="cube-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("totalQuantity")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.total_quantity !== undefined
                    ? String(med.total_quantity)
                    : med.totalQuantity !== undefined
                      ? String(med.totalQuantity)
                      : t("none")}
                </Text>
              </View>
            </View>

            {/* Refill Alert */}
            <View style={styles.gridCell}>
              <Ionicons name="notifications-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("refillAlert")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.refill_alert || med.refillAlert ? t("enabled") : t("disabled")}
                </Text>
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.gridCell}>
              <Ionicons name="calendar-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("startDate")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.startDate && med.startDate !== "None" ? med.startDate : t("none")}
                </Text>
              </View>
            </View>

            {/* Prescribed By */}
            <View style={styles.gridCell}>
              <Ionicons name="person-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>{t("prescribedBy")}</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.prescribedBy || med.prescribed_by || t("none")}
                </Text>
              </View>
            </View>

            {/* Notes / Instructions */}
            {Boolean(med.notes && med.notes !== "None") && (
              <View style={[styles.gridCell, { width: "100%" }]}>
                <Ionicons name="document-text-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
                <View style={styles.cellContent}>
                  <Text style={styles.cellLabel}>{t("notes")}</Text>
                  <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                    {med.notes}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  checkboxTouch: {
    padding: 4,
    marginRight: 8,
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  medName: {
    fontSize: 14,
    fontWeight: "bold",
    flexShrink: 1,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  medType: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconTouch: {
    padding: 6,
  },
  expandedGrid: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  gridCell: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
  },
  cellIcon: {
    marginRight: 6,
  },
  cellContent: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  cellValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
});
