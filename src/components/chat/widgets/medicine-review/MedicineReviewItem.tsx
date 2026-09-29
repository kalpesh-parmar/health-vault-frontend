import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MedicineTimingPills } from "./MedicineTimingPills";
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
  onToggleCheck,
  onToggleExpand,
  onEdit,
}: MedicineReviewItemProps) {
  const medKey = med.client_med_id || med.id;
  const dosageStr = getDosageString(med);
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
              {med.type || "Tablet"} • {dosageStr}
            </Text>
          </View>
        </View>

        {/* Action icons */}
        <View style={styles.rightActions}>
          {!readOnly && (
            <TouchableOpacity
              onPress={() => onEdit(med)}
              style={styles.actionIconTouch}
            >
              <Ionicons name="pencil" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
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
            {/* Frequency */}
            <View style={styles.gridCell}>
              <Ionicons name="alarm-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>Frequency</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {med.frequency || "None"}
                </Text>
              </View>
            </View>

            {/* Schedule */}
            <View style={styles.gridCell}>
              <Ionicons name="time-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
              <View style={styles.cellContent}>
                <Text style={styles.cellLabel}>Schedule</Text>
                <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                  {timeStr}
                </Text>
              </View>
            </View>

            {/* Prescribed By */}
            {Boolean(med.prescribedBy || med.prescribed_by) && (
              <View style={styles.gridCell}>
                <Ionicons name="person-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
                <View style={styles.cellContent}>
                  <Text style={styles.cellLabel}>Prescribed By</Text>
                  <Text style={[styles.cellValue, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
                    {med.prescribedBy || med.prescribed_by}
                  </Text>
                </View>
              </View>
            )}

            {/* Notes / Instructions */}
            {Boolean(med.notes && med.notes !== "None") && (
              <View style={[styles.gridCell, { width: "100%" }]}>
                <Ionicons name="document-text-outline" size={14} color="#8a94a6" style={styles.cellIcon} />
                <View style={styles.cellContent}>
                  <Text style={styles.cellLabel}>Instructions</Text>
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
