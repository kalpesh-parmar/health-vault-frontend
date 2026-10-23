import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface MonthYearPickerModalProps {
  visible: boolean;
  selectedMonth: number; // 1 - 12
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({
  visible,
  selectedMonth,
  selectedYear,
  onSelect,
  onClose,
}) => {
  const { isDark, theme } = useAppTheme();
  const [viewYear, setViewYear] = useState<number>(selectedYear || new Date().getFullYear());

  const handlePrevYear = () => setViewYear((y) => y - 1);
  const handleNextYear = () => setViewYear((y) => y + 1);

  const handleMonthPress = (mIndex: number) => {
    onSelect(mIndex + 1, viewYear);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              {/* Header with Year Selector */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={handlePrevYear}
                  style={styles.arrowButton}
                  accessibilityRole="button"
                  accessibilityLabel="Previous year"
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={isDark ? "#E2E8F0" : "#1E293B"}
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.yearTitle,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  {viewYear}
                </Text>

                <TouchableOpacity
                  onPress={handleNextYear}
                  style={styles.arrowButton}
                  accessibilityRole="button"
                  accessibilityLabel="Next year"
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={isDark ? "#E2E8F0" : "#1E293B"}
                  />
                </TouchableOpacity>
              </View>

              {/* Month Grid */}
              <View style={styles.monthsGrid}>
                {MONTH_NAMES.map((name, idx) => {
                  const mNum = idx + 1;
                  const isCurrentSelection =
                    mNum === selectedMonth && viewYear === selectedYear;

                  return (
                    <TouchableOpacity
                      key={name}
                      onPress={() => handleMonthPress(idx)}
                      style={[
                        styles.monthCell,
                        isCurrentSelection && {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${name} ${viewYear}`}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          { color: isDark ? "#CBD5E1" : "#475569" },
                          isCurrentSelection && {
                            color: "#FFFFFF",
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dismiss button */}
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.cancelButton,
                  { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                ]}
              >
                <Text
                  style={[
                    styles.cancelText,
                    { color: isDark ? "#CBD5E1" : "#475569" },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  monthCell: {
    width: "30%",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
