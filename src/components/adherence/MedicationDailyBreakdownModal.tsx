import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DailyDetailsResponse, DailyDoseDetail } from "../../types/adherence";
import {
  formatFullDateHeader,
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../../utils/adherenceChartHelpers";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicationDailyBreakdownModalProps {
  visible: boolean;
  dateStr?: string;
  data?: DailyDetailsResponse;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
}

export const MedicationDailyBreakdownModal: React.FC<MedicationDailyBreakdownModalProps> = ({
  visible,
  dateStr,
  data,
  isLoading,
  isError,
  onClose,
}) => {
  const { isDark, theme } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  const maxSheetHeight = windowHeight * 0.85;
  const minSheetHeight = windowHeight * 0.45;
  const measuredSheetHeight = headerHeight + listContentHeight + 12;
  const sheetHeight =
    measuredSheetHeight > 12
      ? Math.min(Math.max(measuredSheetHeight, minSheetHeight), maxSheetHeight)
      : minSheetHeight;

  const formattedDate = formatFullDateHeader(dateStr);

  const renderStatusBadge = (dose: DailyDoseDetail) => {
    if (dose.status === "COMPLETED") {
      if (dose.completionClassification === "EARLY") {
        return (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.15)"
                  : "#ECFEFF",
                borderColor: palette.completedEarly,
              },
            ]}
          >
            <Ionicons
              name="speedometer-outline"
              size={13}
              color={palette.completedEarly}
            />
            <Text style={[styles.badgeText, { color: palette.completedEarly }]}>
              {dose.delayFormatted || "Early"}
            </Text>
          </View>
        );
      }

      if (dose.completionClassification === "LATE") {
        return (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? "rgba(59, 130, 246, 0.15)"
                  : "#EFF6FF",
                borderColor: palette.completedLate,
              },
            ]}
          >
            <Ionicons name="time-outline" size={13} color={palette.completedLate} />
            <Text style={[styles.badgeText, { color: palette.completedLate }]}>
              {dose.delayFormatted || "Late"}
            </Text>
          </View>
        );
      }

      if (dose.completionClassification === "UNKNOWN") {
        return (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? "rgba(165, 180, 252, 0.15)"
                  : "#EEF2FF",
                borderColor: palette.completedUnknown,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={13}
              color={palette.completedUnknown}
            />
            <Text
              style={[styles.badgeText, { color: palette.completedUnknown }]}
            >
              Completed (Historical)
            </Text>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(99, 102, 241, 0.15)"
                : "#EEF2FF",
              borderColor: palette.completedOnTime,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={13}
            color={palette.completedOnTime}
          />
          <Text style={[styles.badgeText, { color: palette.completedOnTime }]}>
            {dose.delayFormatted || "On time"}
          </Text>
        </View>
      );
    }

    if (dose.status === "SKIPPED") {
      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(148, 163, 184, 0.15)"
                : "#F1F5F9",
              borderColor: palette.skipped,
            },
          ]}
        >
          <Ionicons
            name="close-circle-outline"
            size={13}
            color={palette.skipped}
          />
          <Text style={[styles.badgeText, { color: palette.skipped }]}>
            Skipped
          </Text>
        </View>
      );
    }

    if (dose.isOverdue) {
      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(239, 68, 68, 0.15)"
                : "#FEF2F2",
              borderColor: palette.overdue,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={palette.overdue}
          />
          <Text style={[styles.badgeText, { color: palette.overdue }]}>
            Overdue
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isDark
              ? "rgba(245, 158, 11, 0.15)"
              : "#FFFBEB",
            borderColor: palette.pending,
          },
        ]}
      >
        <Ionicons name="hourglass-outline" size={13} color={palette.pending} />
        <Text style={[styles.badgeText, { color: palette.pending }]}>
          Pending
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close daily breakdown modal"
        />
        <View
          style={[
            styles.sheetContainer,
            { height: sheetHeight },
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          >
              {/* Sheet Drag Indicator */}
              <View style={styles.dragIndicator} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitles}>
                  <Text
                    style={[
                      styles.sheetTitle,
                      { color: isDark ? "#F8FAFC" : "#0F172A" },
                    ]}
                  >
                    Daily Medication Details
                  </Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: isDark ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    {formattedDate}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close daily breakdown modal"
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </TouchableOpacity>
              </View>
          </View>

              {/* Content body */}
              {isLoading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.loadingText,
                      { color: isDark ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    Loading scheduled doses...
                  </Text>
                </View>
              ) : isError || !data ? (
                <View style={styles.centered}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={40}
                    color={palette.overdue}
                  />
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: isDark ? "#F8FAFC" : "#0F172A" },
                    ]}
                  >
                    Unable to load doses
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: isDark ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    Please check your connection and try again.
                  </Text>
                </View>
              ) : data.doses.length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons
                    name="medical-outline"
                    size={42}
                    color={palette.completedOnTime}
                  />
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: isDark ? "#F8FAFC" : "#0F172A" },
                    ]}
                  >
                    No Doses Scheduled
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: isDark ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    No medication reminders were scheduled for this day.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.doseList}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onContentSizeChange={(_, height) => setListContentHeight(height)}
                >
                  {data.doses.map((dose) => {
                    return (
                      <View
                        key={dose.occurrenceId}
                        style={[
                          styles.doseCard,
                          {
                            backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
                          },
                        ]}
                      >
                        {/* Top row: Medicine Name & Dose */}
                        <View style={styles.doseTopRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              style={[
                                styles.medName,
                                { color: isDark ? "#F8FAFC" : "#0F172A" },
                              ]}
                              numberOfLines={1}
                            >
                              {dose.medicationName}
                            </Text>
                            <Text
                              style={[
                                styles.medDosage,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                              ]}
                            >
                              {dose.dosePerIntake} {dose.unit} •{" "}
                              {dose.medicationType}
                            </Text>
                          </View>
                          {renderStatusBadge(dose)}
                        </View>

                        {/* Timing row */}
                        <View style={styles.timingRow}>
                          <View style={styles.timingItem}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={isDark ? "#94A3B8" : "#64748B"}
                            />
                            <Text
                              style={[
                                styles.timingText,
                                { color: isDark ? "#CBD5E1" : "#475569" },
                              ]}
                            >
                              Scheduled:{" "}
                              <Text style={{ fontWeight: "600" }}>
                                {dose.scheduledTimeFormatted || "—"}
                              </Text>
                            </Text>
                          </View>

                          {dose.completedAtFormatted && (
                            <View style={styles.timingItem}>
                              <Ionicons
                                name="checkmark-done"
                                size={14}
                                color={palette.completedOnTime}
                              />
                              <Text
                                style={[
                                  styles.timingText,
                                  { color: isDark ? "#CBD5E1" : "#475569" },
                                ]}
                              >
                                Taken:{" "}
                                <Text style={{ fontWeight: "600" }}>
                                  {dose.completedAtFormatted}
                                </Text>
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Retrospective Calculation Note */}
                        {dose.retrospectivelyDerived && (
                          <View style={styles.retrospectiveRow}>
                            <Ionicons
                              name="information-circle-outline"
                              size={13}
                              color={isDark ? "#94A3B8" : "#64748B"}
                            />
                            <Text
                              style={[
                                styles.retrospectiveText,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                              ]}
                            >
                              Classification retrospectively calculated
                            </Text>
                          </View>
                        )}

                        {/* Read-Only Status Indicator */}
                        {dose.status === "PENDING" && !dose.isOverdue && (
                          <View style={styles.historicalNoteRow}>
                            <Text
                              style={[
                                styles.historicalNoteText,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                              ]}
                            >
                              Scheduled dose (Read-only)
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    alignSelf: "center",
    marginBottom: 12,
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTitles: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  doseList: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  doseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  doseTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  medName: {
    fontSize: 15,
    fontWeight: "700",
  },
  medDosage: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  timingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timingText: {
    fontSize: 12,
  },
  retrospectiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  retrospectiveText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  takeNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  takeNowText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  historicalNoteRow: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  historicalNoteText: {
    fontSize: 11,
    fontStyle: "italic",
  },
});
