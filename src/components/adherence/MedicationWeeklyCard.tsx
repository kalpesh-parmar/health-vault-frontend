import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WeeklyAdherenceResponse } from "../../types/adherence";
import { WeeklyStackedBarChart } from "./WeeklyStackedBarChart";
import { AdherenceSkeletonLoader } from "./AdherenceSkeletonLoader";
import {
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
  formatDateRange,
} from "../../utils/adherenceChartHelpers";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicationWeeklyCardProps {
  data?: WeeklyAdherenceResponse;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectDay: (date: string) => void;
  onViewDetails?: () => void;
  selectedDate?: string;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  onTodayPeriod?: () => void;
  isCurrentPeriod?: boolean;
}

export const MedicationWeeklyCard: React.FC<MedicationWeeklyCardProps> = ({
  data,
  isLoading,
  isError,
  onRetry,
  onSelectDay,
  onViewDetails,
  selectedDate,
  onPrevPeriod,
  onNextPeriod,
  onTodayPeriod,
  isCurrentPeriod = true,
}) => {
  const { isDark, theme } = useAppTheme();
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  if (isLoading) {
    return <AdherenceSkeletonLoader type="weekly" />;
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
          Medication Adherence
        </Text>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={palette.overdue} />
          <Text style={[styles.errorText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            Unable to load adherence data
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

  const { kpiSummary, dailyBreakdown, dateRange } = data;
  const rangeDisplay = formatDateRange(dateRange?.startDate, dateRange?.endDate);

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
      {/* Top Header Row with Navigation & View Details */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.title, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
              {isCurrentPeriod ? "Last 7 Days" : "7-Day Period"}
            </Text>
            {isCurrentPeriod ? (
              <View
                style={[
                  styles.periodBadge,
                  { backgroundColor: isDark ? "#312E81" : "#EEF2FF" },
                ]}
              >
                <Text style={[styles.periodBadgeText, { color: theme.colors.primary }]}>
                  Current
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.periodBadge,
                  { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                ]}
              >
                <Text
                  style={[
                    styles.periodBadgeText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Past
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            {rangeDisplay ? `${rangeDisplay} • ` : ""}Adherence at a glance
          </Text>
        </View>

        {onViewDetails && (
          <TouchableOpacity
            onPress={onViewDetails}
            style={styles.detailsLink}
            accessibilityRole="button"
            accessibilityLabel="View full medication history details"
          >
            <Text style={[styles.detailsLinkText, { color: theme.colors.primary }]}>
              View Details →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Week Period Stepper Navigation Bar */}
      {(onPrevPeriod || onNextPeriod) && (
        <View
          style={[
            styles.stepperContainer,
            {
              backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#F8FAFC",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          {/* Previous 7 Days Arrow */}
          <TouchableOpacity
            onPress={onPrevPeriod}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel="Previous 7 days"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={isDark ? "#F8FAFC" : "#0F172A"}
            />
          </TouchableOpacity>

          {/* Period Range Text */}
          <Text
            style={[
              styles.stepperRangeText,
              { color: isDark ? "#E2E8F0" : "#1E293B" },
            ]}
          >
            {rangeDisplay || "7-Day Window"}
          </Text>

          <View style={styles.rightNavWrapper}>
            {/* Today Shortcut Button when viewing past period */}
            {!isCurrentPeriod && onTodayPeriod && (
              <TouchableOpacity
                onPress={onTodayPeriod}
                style={[
                  styles.todayShortcutButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Jump to current week"
              >
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.todayShortcutText}>Today</Text>
              </TouchableOpacity>
            )}

            {/* Next 7 Days Arrow (Disabled on Current Period) */}
            <TouchableOpacity
              onPress={onNextPeriod}
              disabled={isCurrentPeriod}
              style={[
                styles.navButton,
                isCurrentPeriod && { opacity: 0.25 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next 7 days"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  isCurrentPeriod
                    ? isDark
                      ? "#64748B"
                      : "#94A3B8"
                    : isDark
                    ? "#F8FAFC"
                    : "#0F172A"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* KPI Summary Row */}
      <View style={styles.kpiRow}>
        {/* Overdue */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
              borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FEE2E2",
            },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: palette.overdue }]}
            />
            <Text
              style={[
                styles.kpiLabel,
                { color: isDark ? "#FCA5A5" : "#B91C1C" },
              ]}
            >
              Overdue
            </Text>
          </View>
          <Text
            style={[
              styles.kpiValue,
              { color: isDark ? "#F87171" : "#DC2626" },
            ]}
          >
            {(kpiSummary.overdue || 0) + (kpiSummary.missed || 0)}
          </Text>
        </View>

        {/* Complete */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#EEF2FF",
              borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "#E0E7FF",
            },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: palette.completedOnTime },
              ]}
            />
            <Text
              style={[
                styles.kpiLabel,
                { color: isDark ? "#C7D2FE" : "#4338CA" },
              ]}
            >
              Complete
            </Text>
          </View>
          <Text
            style={[
              styles.kpiValue,
              { color: isDark ? "#818CF8" : "#4F46E5" },
            ]}
          >
            {kpiSummary.totalCompleted}
          </Text>
        </View>

        {/* Pending */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
              borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#FEF3C7",
            },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: palette.pending }]}
            />
            <Text
              style={[
                styles.kpiLabel,
                { color: isDark ? "#FDE68A" : "#B45309" },
              ]}
            >
              Pending
            </Text>
          </View>
          <Text
            style={[
              styles.kpiValue,
              { color: isDark ? "#FBBF24" : "#D97706" },
            ]}
          >
            {kpiSummary.pending}
          </Text>
        </View>
      </View>

      {/* Stacked SVG Bar Chart */}
      <WeeklyStackedBarChart
        dailyBreakdown={dailyBreakdown}
        onSelectDay={onSelectDay}
        selectedDate={selectedDate}
        height={120}
      />

      {/* Mutual Exclusive Accessible Chart Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: palette.overdueAndMissed },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: isDark ? "#CBD5E1" : "#475569" },
            ]}
          >
            Overdue
          </Text>
        </View>

        {(kpiSummary.completedEarly || 0) > 0 && (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: palette.completedEarly },
              ]}
            />
            <Text
              style={[
                styles.legendText,
                { color: isDark ? "#CBD5E1" : "#475569" },
              ]}
            >
              Early
            </Text>
          </View>
        )}

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: palette.completedOnTime },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: isDark ? "#CBD5E1" : "#475569" },
            ]}
          >
            On Time
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: palette.completedLate },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: isDark ? "#CBD5E1" : "#475569" },
            ]}
          >
            Late
          </Text>
        </View>

        {kpiSummary.completedUnknown > 0 && (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: palette.completedUnknown },
              ]}
            />
            <Text
              style={[
                styles.legendText,
                { color: isDark ? "#CBD5E1" : "#475569" },
              ]}
            >
              Unknown
            </Text>
          </View>
        )}

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: palette.pending },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: isDark ? "#CBD5E1" : "#475569" },
            ]}
          >
            Pending
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColorBox,
              { backgroundColor: palette.skipped },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: isDark ? "#CBD5E1" : "#475569" },
            ]}
          >
            Skipped
          </Text>
        </View>
      </View>
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
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  detailsLinkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperRangeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rightNavWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  todayShortcutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  todayShortcutText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColorBox: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
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
