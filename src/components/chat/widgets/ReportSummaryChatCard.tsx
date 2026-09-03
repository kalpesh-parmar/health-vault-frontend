import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDateOnly } from "../../../utils/dateFormatter";
import { formatDocumentType } from "../../shared/EditDocumentBottomSheet";
import { I18N_REPORT_CARD_UI } from "../../../constants/chatConstants";
import { LIGHT_THEME, DARK_THEME } from "../../../constants/theme";

export interface LabFindingItem {
  name: string;
  value: string | number;
  unit?: string;
  status?: string;
  referenceRange?: string;
  normalRange?: string;
}

export interface MedicationFindingItem {
  name: string;
  dosage?: string;
  timeOfDay?: string;
  frequency?: string;
  duration?: string;
  quantity?: number | string;
  instructions?: string;
  type?: string;
  foodContext?: string;
}

export interface KeyFindingItem extends LabFindingItem {}

export interface ReportSummaryDocument {
  id?: string;
  fileName?: string;
  documentType?: string;
  reportDate?: string | Date;
  createdAt?: string | Date;
  hospitalName?: string;
  clinicName?: string;
  doctorName?: string;
  patientName?: string;
  summary?: string;
  summaryEnglish?: string;
  labFindings?: LabFindingItem[];
  medicationFindings?: MedicationFindingItem[];
  keyFindings?: any[];
  tests?: any[];
  parameters?: any[];
  medications?: any[];
  s3Key?: string;
  imageUri?: string;
  fileUrl?: string;
}

export interface ReportSummaryChatCardProps {
  document?: ReportSummaryDocument;
  suggestedQuestions?: string[];
  isDark: boolean;
  theme?: any;
  preferredLang?: string;
  onQuestionPress: (question: string) => void;
  onViewFullReport?: () => void;
  readOnly?: boolean;
}

export const ReportSummaryChatCard: React.FC<ReportSummaryChatCardProps> = ({
  document = {},
  suggestedQuestions = [],
  isDark,
  theme,
  preferredLang = "english",
  onQuestionPress,
  onViewFullReport,
  readOnly = false,
}) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  // Active theme fallback
  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  // i18n dictionary lookup with normalization
  const normalizedLang = (preferredLang || "english").toLowerCase();
  const langKey =
    normalizedLang === "gu" || normalizedLang === "gujarati"
      ? "gujarati"
      : normalizedLang === "hi" || normalizedLang === "hindi"
      ? "hindi"
      : normalizedLang === "mr" || normalizedLang === "marathi"
      ? "marathi"
      : normalizedLang === "ta" || normalizedLang === "tamil"
      ? "tamil"
      : "english";

  const t =
    I18N_REPORT_CARD_UI[langKey] ||
    I18N_REPORT_CARD_UI[preferredLang] ||
    I18N_REPORT_CARD_UI.english;

  const isPrescription =
    document.documentType === "PRESCRIPTION" ||
    document.documentType === "PRESCERIPTION";

  const docTypeLabel = isPrescription
    ? t.prescription
    : formatDocumentType(document.documentType || "LAB_REPORT");

  const rawDate = document.reportDate || document.createdAt;
  const formattedDate = rawDate
    ? formatDateOnly(rawDate, "dd MMM yyyy")
    : "";

  const doctorOrHospital =
    document.doctorName ||
    document.hospitalName ||
    document.clinicName ||
    document.patientName ||
    null;

  const fileName =
    document.fileName ||
    (isPrescription ? t.prescription : t.medicalReport);

  const doctorName = document.doctorName || null;
  const hospitalName = document.hospitalName || document.clinicName || null;

  // AI Summary - prioritize preferred language when non-English
  const isNonEnglish = langKey !== "english";
  const aiSummaryText =
    (isNonEnglish && (document as any).summaryInPreferredLanguage) ||
    document.summary ||
    document.summaryEnglish ||
    (document as any).summaryInPreferredLanguage ||
    null;

  // Task C: Separate honestly-typed lab and medication lists
  const labFindings: LabFindingItem[] =
    document.labFindings && document.labFindings.length > 0
      ? document.labFindings
      : Array.isArray(document.tests) && document.tests.length > 0
      ? document.tests.map((t: any) => ({
          name: t.name || t.testName || t.parameter || "Test",
          value: t.value || t.result || "",
          unit: t.unit || "",
          status: t.status || (t.isAbnormal ? "Abnormal" : "Normal"),
          referenceRange: t.normalRange || t.referenceRange || t.range || "",
        }))
      : (!isPrescription && Array.isArray(document.keyFindings) && document.keyFindings.length > 0)
      ? document.keyFindings.map((f: any) => ({
          name: f.name || "Test",
          value: f.value || "",
          unit: f.unit || "",
          status: f.status || "Normal",
          referenceRange: f.referenceRange || f.normalRange || "",
        }))
      : [];

  const medicationFindings: MedicationFindingItem[] =
    document.medicationFindings && document.medicationFindings.length > 0
      ? document.medicationFindings
      : Array.isArray(document.medications) && document.medications.length > 0
      ? document.medications.map((m: any) => ({
          name: m.name || m.medicationName || "Medicine",
          dosage: m.dosage || m.dose || "",
          timeOfDay: m.timeOfDay || m.timing || "",
          frequency: m.frequency || "",
          duration: m.duration || "",
          quantity: m.quantity || m.qty || "",
          instructions: m.instructions || m.notes || "",
          type: m.type || m.medicationType || "Tablet",
          foodContext: m.foodContext || m.food_context || "",
        }))
      : (isPrescription && Array.isArray(document.keyFindings) && document.keyFindings.length > 0)
      ? document.keyFindings.map((f: any) => ({
          name: f.name || "Medicine",
          dosage: f.value || f.dosage || "",
          duration: f.unit || f.duration || "",
          instructions: f.referenceRange || f.instructions || "",
          type: f.type || "Tablet",
          timeOfDay: f.timeOfDay || "",
          quantity: f.quantity || "",
          frequency: f.frequency || "",
          foodContext: f.foodContext || "",
        }))
      : [];

  const hasMedications = isPrescription && medicationFindings.length > 0;
  const hasLabFindings = !isPrescription && labFindings.length > 0;
  const hasAnyFindings = hasMedications || hasLabFindings;

  // Format helper for Indian 3-slot dosing (1-0-1, 1-0-0)
  const renderTimingBadges = (timeOfDay?: string, frequency?: string) => {
    if (!timeOfDay && !frequency) return null;
    const rawTime = (timeOfDay || frequency || "").trim();
    const isSlots = /^[0-1]-[0-1]-[0-1](-[0-1])?$/.test(rawTime);

    if (isSlots) {
      const parts = rawTime.split("-");
      const slots = [
        { label: t.morning || "Morning", active: parts[0] === "1" },
        { label: t.afternoon || "Afternoon", active: parts[1] === "1" },
        { label: t.night || "Night", active: parts[2] === "1" },
      ];
      if (parts[3] !== undefined) {
        slots.push({ label: t.bedtime || "Bedtime", active: parts[3] === "1" });
      }

      return (
        <View style={styles.timingChipsContainer}>
          {slots.map((s, i) => (
            <View
              key={`slot-${i}`}
              style={[
                styles.slotChip,
                {
                  backgroundColor: s.active
                    ? isDark ? "rgba(91, 75, 255, 0.2)" : "#eff6ff"
                    : isDark ? "rgba(255, 255, 255, 0.04)" : "#f1f5f9",
                  borderColor: s.active
                    ? colors.primary
                    : isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                },
              ]}
            >
              <Text
                style={[
                  styles.slotChipText,
                  {
                    color: s.active
                      ? colors.primary
                      : isDark ? "#64748b" : "#94a3b8",
                    fontWeight: s.active ? "700" : "500",
                  },
                ]}
              >
                {s.label} ({s.active ? "1" : "0"})
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.singleTimingChip,
          {
            backgroundColor: isDark ? "rgba(91, 75, 255, 0.15)" : "#eff6ff",
            borderColor: colors.primary,
          },
        ]}
      >
        <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
        <Text style={[styles.singleTimingText, { color: colors.primary }]}>
          {rawTime}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Header: Icon, Synthesized Title, Date, Status Pill */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? "rgba(91, 75, 255, 0.18)"
                  : colors.iconBox,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isPrescription ? "pill" : "file-document-outline"}
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.titleColumn}>
            <Text
              style={[
                styles.fileName,
                { color: colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {fileName}
            </Text>
            {formattedDate ? (
              <Text
                style={[
                  styles.subtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {docTypeLabel} • {formattedDate}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDark ? "rgba(34, 197, 94, 0.16)" : colors.iconBoxSuccess,
                borderColor: colors.success,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={colors.success}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusText, { color: colors.success }]}>
              {t.completed}
            </Text>
          </View>
        </View>

        {/* Doctor & Hospital Meta Row (when metadata is available) */}
        {(doctorName || hospitalName) ? (
          <View
            style={[
              styles.metaRow,
              { borderTopColor: colors.border },
            ]}
          >
            {doctorName ? (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {doctorName.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {doctorName && hospitalName ? (
              <Text style={[styles.metaDivider, { color: colors.border }]}>|</Text>
            ) : null}

            {hospitalName ? (
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {hospitalName}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Collapsible AI Summary Box */}
        {aiSummaryText ? (
          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: isDark
                  ? "rgba(91, 75, 255, 0.08)"
                  : "rgba(91, 75, 255, 0.04)",
                borderColor: isDark
                  ? "rgba(91, 75, 255, 0.22)"
                  : "rgba(91, 75, 255, 0.14)",
              },
            ]}
          >
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="sparkles" size={15} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.primary }]}>
                  {t.aiSummary}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isSummaryExpanded ? t.showLess : t.showMore}
                onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
                style={styles.expandToggle}
                activeOpacity={0.7}
              >
                <Text style={[styles.expandToggleText, { color: colors.primary }]}>
                  {isSummaryExpanded ? t.showLess : t.showMore}
                </Text>
                <Ionicons
                  name={isSummaryExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.primary}
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
            </View>

            {isSummaryExpanded && (
              <Text
                style={[
                  styles.summaryBody,
                  { color: colors.textPrimary },
                ]}
              >
                {aiSummaryText}
              </Text>
            )}
          </View>
        ) : null}

        {/* Findings Section: Medication Cards OR Lab Table OR Clean Empty State */}
        <View style={styles.findingsSection}>
          <View style={styles.findingsHeader}>
            <Ionicons
              name={isPrescription ? "medical-outline" : "flask-outline"}
              size={15}
              color={colors.primary}
            />
            <Text style={[styles.findingsTitle, { color: colors.textPrimary }]}>
              {isPrescription ? t.prescribedMedications : t.keyFindings}
            </Text>
          </View>

          {/* PRESCRIPTION: Medication Cards (ReviewMedicinesListCard Pattern) */}
          {hasMedications ? (
            <View style={styles.medicationsList}>
              {medicationFindings.map((med, index) => (
                <View
                  key={`med-${index}`}
                  style={[
                    styles.medCard,
                    {
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Medicine Title & Type Header */}
                  <View style={styles.medCardHeader}>
                    <View style={styles.medCardTitleRow}>
                      <MaterialCommunityIcons
                        name="pill"
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.medName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {med.name}
                      </Text>
                    </View>
                    {med.type ? (
                      <View
                        style={[
                          styles.medTypeBadge,
                          {
                            backgroundColor: isDark ? "rgba(91, 75, 255, 0.18)" : "#eff6ff",
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text style={[styles.medTypeText, { color: colors.primary }]}>
                          {med.type}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Timing / Schedule Chips */}
                  {renderTimingBadges(med.timeOfDay, med.frequency)}

                  {/* Metadata Row: Dosage, Duration, Qty, Food Context */}
                  <View style={styles.medMetaRow}>
                    {med.dosage ? (
                      <View style={styles.medMetaItem}>
                        <Text style={[styles.medMetaLabel, { color: colors.textSecondary }]}>
                          {t.dose}:
                        </Text>
                        <Text style={[styles.medMetaValue, { color: colors.textPrimary }]}>
                          {med.dosage}
                        </Text>
                      </View>
                    ) : null}

                    {med.duration ? (
                      <View style={styles.medMetaItem}>
                        <Text style={[styles.medMetaLabel, { color: colors.textSecondary }]}>
                          {t.duration}:
                        </Text>
                        <Text style={[styles.medMetaValue, { color: colors.textPrimary }]}>
                          {med.duration}
                        </Text>
                      </View>
                    ) : null}

                    {med.quantity ? (
                      <View style={styles.medMetaItem}>
                        <Text style={[styles.medMetaLabel, { color: colors.textSecondary }]}>
                          {t.qty}:
                        </Text>
                        <Text style={[styles.medMetaValue, { color: colors.textPrimary }]}>
                          {med.quantity}
                        </Text>
                      </View>
                    ) : null}

                    {med.foodContext ? (
                      <View
                        style={[
                          styles.foodBadge,
                          {
                            backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                            borderColor: colors.warning,
                          },
                        ]}
                      >
                        <Ionicons name="restaurant-outline" size={11} color={colors.warning} style={{ marginRight: 3 }} />
                        <Text style={[styles.foodBadgeText, { color: colors.warning }]}>
                          {med.foodContext === "BEFORE_FOOD"
                            ? t.beforeFood || "Before Food"
                            : med.foodContext === "AFTER_FOOD"
                            ? t.afterFood || "After Food"
                            : med.foodContext === "WITH_FOOD"
                            ? t.withFood || "With Food"
                            : med.foodContext.replace(/_/g, " ")}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Instructions (Full text, no truncation clamp) */}
                  {med.instructions ? (
                    <View style={styles.instructionsBox}>
                      <Text style={[styles.instructionsLabel, { color: colors.textSecondary }]}>
                        {t.instructions}:
                      </Text>
                      <Text style={[styles.instructionsText, { color: colors.textPrimary }]}>
                        {med.instructions}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : hasLabFindings ? (
            /* LAB REPORT: Proportional Flex Table Layout */
            <View style={styles.labTable}>
              {labFindings.map((item, index) => {
                const statusLower = (item.status || "").toLowerCase();
                const isAbnormal =
                  statusLower.includes("high") ||
                  statusLower.includes("abnormal") ||
                  statusLower.includes("low");

                return (
                  <View
                    key={`finding-${index}`}
                    style={[
                      styles.findingRow,
                      {
                        borderBottomColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "#f1f5f9",
                      },
                    ]}
                  >
                    {/* Test Name: Proportional width, up to 2 lines */}
                    <View style={styles.findingNameCol}>
                      <Ionicons
                        name={isAbnormal ? "alert-circle" : "checkmark-circle"}
                        size={14}
                        color={isAbnormal ? colors.error : colors.success}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.findingName,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </View>

                    {/* Result Value + Unit */}
                    <View style={styles.findingValueCol}>
                      <Text
                        style={[
                          styles.findingValue,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {`${item.value} ${item.unit || ""}`.trim()}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={styles.findingStatusCol}>
                      <Text
                        style={[
                          styles.findingStatus,
                          { color: isAbnormal ? colors.error : colors.success },
                        ]}
                      >
                        {(!item.status || item.status.toLowerCase() === "normal")
                          ? (t.normal || "Normal")
                          : (item.status || t.normal)}
                      </Text>
                    </View>

                    {/* Reference Range (wrapped, no hard truncate) */}
                    <View style={styles.findingRangeCol}>
                      <Text
                        style={[
                          styles.findingRange,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {item.referenceRange || ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* Clean Empty State (Zero Fake Data) */
            <View
              style={[
                styles.emptyStateBox,
                {
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.emptyStateText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.noFindingsYet}
              </Text>
            </View>
          )}

          {/* Medical Disclaimer: Permanent Non-Dismissible Caption */}
          <View style={styles.disclaimerRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.disclaimerText,
                { color: colors.textSecondary },
              ]}
            >
              {t.medicalDisclaimer}
            </Text>
          </View>
        </View>

        {/* View Full Report Button CTA */}
        {onViewFullReport ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.viewFullReport}
            style={[
              styles.viewFullButton,
              {
                backgroundColor: isDark
                  ? "rgba(91, 75, 255, 0.12)"
                  : colors.iconBox,
                borderTopColor: colors.border,
              },
            ]}
            onPress={onViewFullReport}
            activeOpacity={0.7}
          >
            <Ionicons
              name="expand-outline"
              size={16}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewFullText, { color: colors.primary }]}>
              {t.viewFullReport}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Suggested Questions Section */}
      {suggestedQuestions && suggestedQuestions.length > 0 ? (
        <View style={styles.suggestedQuestionsSection}>
          <View style={styles.suggestedHeader}>
            <Ionicons name="globe-outline" size={15} color={colors.primary} />
            <Text style={[styles.suggestedHeaderTitle, { color: colors.textSecondary }]}>
              {t.askAiAboutReport}
            </Text>
          </View>

          <View style={styles.questionsList}>
            {suggestedQuestions.map((q, idx) => (
              <TouchableOpacity
                key={`sq-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={q}
                style={[
                  styles.questionPill,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: readOnly ? 0.6 : 1,
                  },
                ]}
                onPress={() => onQuestionPress(q)}
                disabled={readOnly}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.questionText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 6,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  metaDivider: {
    marginHorizontal: 8,
    fontSize: 11,
  },
  summaryBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  expandToggle: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  findingsSection: {
    marginTop: 16,
  },
  findingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  findingsTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  medicationsList: {
    gap: 10,
  },
  medCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  medCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  medCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  medTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  medTypeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timingChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6,
  },
  slotChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  slotChipText: {
    fontSize: 11,
  },
  singleTimingChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    marginVertical: 6,
  },
  singleTimingText: {
    fontSize: 11,
    fontWeight: "600",
  },
  medMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  medMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  medMetaLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  medMetaValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  foodBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  foodBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  instructionsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(100, 116, 139, 0.15)",
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 12,
    lineHeight: 17,
  },
  labTable: {
    width: "100%",
  },
  findingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  findingNameCol: {
    flex: 2.2,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
  },
  findingName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  findingValueCol: {
    flex: 1.3,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  findingValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  findingStatusCol: {
    flex: 1.1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  findingStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  findingRangeCol: {
    flex: 1.4,
    alignItems: "flex-end",
    paddingLeft: 4,
  },
  findingRange: {
    fontSize: 11,
    textAlign: "right",
  },
  emptyStateBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginVertical: 6,
  },
  emptyStateText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
    fontStyle: "italic",
  },
  viewFullButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  viewFullText: {
    fontSize: 13,
    fontWeight: "700",
  },
  suggestedQuestionsSection: {
    marginTop: 14,
  },
  suggestedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  suggestedHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  questionsList: {
    gap: 8,
  },
  questionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
