import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MonthlyAdherenceResponse } from "../../types/adherence";
import { SegmentedProgressBar } from "./SegmentedProgressBar";
import { CircularAdherenceProgress } from "./CircularAdherenceProgress";
import { MonthYearPickerModal } from "./MonthYearPickerModal";
import { AdherenceSkeletonLoader } from "./AdherenceSkeletonLoader";
import {
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../../utils/adherenceChartHelpers";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicationMonthlyCardProps {
  data?: MonthlyAdherenceResponse;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedMonth: number;
  selectedYear: number;
  onChangeMonthYear: (month: number, year: number) => void;
}

export const MedicationMonthlyCard: React.FC<MedicationMonthlyCardProps> = ({
  data,
  isLoading,
  isError,
  onRetry,
  selectedMonth,
  selectedYear,
  onChangeMonthYear,
}) => {
  const { isDark, theme } = useAppTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  if (isLoading) {
    return <AdherenceSkeletonLoader type="monthly" />;
  }

  if (isError || !data) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "#334155" : "#E2E8F0",
          },
        ]}
      >
        <Text style={[styles.title, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          Monthly Summary
        </Text>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={palette.overdue} />
          <Text style={[styles.errorText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            Unable to load monthly adherence
          </Text>
          <TouchableOpacity
            onPress={onRetry}
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { metrics, percentages, segmentedRatios, monthLabel } = data;
  const hasData = percentages.hasData;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderColor: isDark ? "#334155" : "#E2E8F0",
        },
      ]}
    >
      {/* Header with Title and Month Selector Pill */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
            Monthly Summary
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            Your medication activity this month
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={[
            styles.selectorPill,
            {
              backgroundColor: isDark ? "#334155" : "#F1F5F9",
              borderColor: isDark ? "#475569" : "#E2E8F0",
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Change month, currently ${monthLabel}`}
        >
          <Text
            style={[
              styles.selectorText,
              { color: isDark ? "#F8FAFC" : "#0F172A" },
            ]}
          >
            {monthLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={isDark ? "#94A3B8" : "#64748B"}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>

      {/* Hero Visualizer Row: Circular Gauge on Left, Status Summary Cards on Right */}
      <View style={styles.heroRow}>
        <View style={styles.gaugeContainer}>
          <CircularAdherenceProgress
            percentage={percentages.overallAdherence}
            hasData={hasData}
            size={104}
            strokeWidth={10}
          />
        </View>

        <View style={styles.statusGrid}>
          {/* Completed Metric Card */}
          <View
            style={[
              styles.statusPillCard,
              {
                backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#EEF2FF",
                borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "#E0E7FF",
              },
            ]}
          >
            <View style={styles.statusPillHeader}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: palette.completedOnTime },
                ]}
              />
              <Text
                style={[
                  styles.statusPillLabel,
                  { color: isDark ? "#C7D2FE" : "#4338CA" },
                ]}
              >
                Completed
              </Text>
            </View>
            <Text
              style={[
                styles.statusPillValue,
                { color: isDark ? "#818CF8" : "#4F46E5" },
              ]}
            >
              {metrics.totalCompleted}{" "}
              <Text style={{ fontSize: 11, fontWeight: "600" }}>
                ({percentages.completedDistribution ?? 0}%)
              </Text>
            </Text>
          </View>

          {/* Overdue Metric Card */}
          <View
            style={[
              styles.statusPillCard,
              {
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
                borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FEE2E2",
              },
            ]}
          >
            <View style={styles.statusPillHeader}>
              <View
                style={[styles.statusDot, { backgroundColor: palette.overdue }]}
              />
              <Text
                style={[
                  styles.statusPillLabel,
                  { color: isDark ? "#FCA5A5" : "#B91C1C" },
                ]}
              >
                Overdue
              </Text>
            </View>
            <Text
              style={[
                styles.statusPillValue,
                { color: isDark ? "#F87171" : "#DC2626" },
              ]}
            >
              {metrics.totalOverdueAndMissed}{" "}
              <Text style={{ fontSize: 11, fontWeight: "600" }}>
                ({percentages.overdueDistribution ?? 0}%)
              </Text>
            </Text>
          </View>

          {/* Pending Metric Card */}
          <View
            style={[
              styles.statusPillCard,
              {
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
                borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#FEF3C7",
              },
            ]}
          >
            <View style={styles.statusPillHeader}>
              <View
                style={[styles.statusDot, { backgroundColor: palette.pending }]}
              />
              <Text
                style={[
                  styles.statusPillLabel,
                  { color: isDark ? "#FDE68A" : "#B45309" },
                ]}
              >
                Pending
              </Text>
            </View>
            <Text
              style={[
                styles.statusPillValue,
                { color: isDark ? "#FBBF24" : "#D97706" },
              ]}
            >
              {metrics.pending}{" "}
              <Text style={{ fontSize: 11, fontWeight: "600" }}>
                ({percentages.pendingDistribution ?? percentages.pending ?? 0}%)
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Segmented Adherence Bar Distribution */}
      <SegmentedProgressBar
        ratios={segmentedRatios}
        hasData={hasData}
        height={10}
      />

      {/* Granular Rates Footer */}
      {hasData && (
        <View style={styles.ratesFooter}>
          <Text
            style={[
              styles.rateText,
              { color: isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            {metrics.completedEarly > 0 && (
              <>
                Early:{" "}
                <Text style={{ fontWeight: "700", color: palette.completedEarly }}>
                  {percentages.earlyAdherence}%
                </Text>
                {"  •  "}
              </>
            )}
            On-Time:{" "}
            <Text style={{ fontWeight: "700", color: palette.completedOnTime }}>
              {percentages.onTimeAdherence}%
            </Text>
            {"  •  "}
            Late:{" "}
            <Text style={{ fontWeight: "700", color: palette.completedLate }}>
              {percentages.lateCompletion}%
            </Text>
            {metrics.completedUnknown > 0 && (
              <>
                {"  •  "}
                Historical Unknown:{" "}
                <Text
                  style={{
                    fontWeight: "700",
                    color: palette.completedUnknown,
                  }}
                >
                  {metrics.completedUnknown}
                </Text>
              </>
            )}
            {metrics.skipped > 0 && (
              <>
                {"  •  "}
                Skipped:{" "}
                <Text
                  style={{
                    fontWeight: "700",
                    color: palette.skipped,
                  }}
                >
                  {metrics.skipped}
                </Text>
              </>
            )}
          </Text>
        </View>
      )}

      {/* Month Year Modal Picker */}
      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onSelect={onChangeMonthYear}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  selectorPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
  },
  statusGrid: {
    flex: 1,
    gap: 6,
  },
  statusPillCard: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPillHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  ratesFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    alignItems: "center",
  },
  rateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
