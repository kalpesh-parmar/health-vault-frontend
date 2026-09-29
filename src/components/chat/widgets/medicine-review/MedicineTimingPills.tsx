import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MedicineTimingPillsProps {
  foodContext?: string;
  startDate?: string;
  isDark: boolean;
  isPast?: boolean;
}

export const MedicineTimingPills = React.memo(function MedicineTimingPills({
  foodContext,
  startDate,
  isDark,
  isPast,
}: MedicineTimingPillsProps) {
  return (
    <View style={styles.container}>
      {Boolean(foodContext && foodContext !== "None") && (
        <View
          style={[
            styles.pill,
            {
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              borderColor: isDark ? "#475569" : "#cbd5e1",
            },
          ]}
        >
          <Ionicons
            name="restaurant-outline"
            size={12}
            color={isDark ? "#94a3b8" : "#64748b"}
            style={styles.icon}
          />
          <Text
            style={[
              styles.pillText,
              { color: isDark ? "#cbd5e1" : "#334155" },
            ]}
          >
            {foodContext}
          </Text>
        </View>
      )}

      {Boolean(startDate && startDate !== "None") && (
        <View
          style={[
            styles.pill,
            {
              backgroundColor: isPast ? (isDark ? "#450a0a" : "#fef2f2") : isDark ? "#334155" : "#f1f5f9",
              borderColor: isPast ? "#ef4444" : isDark ? "#475569" : "#cbd5e1",
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={12}
            color={isPast ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"}
            style={styles.icon}
          />
          <Text
            style={[
              styles.pillText,
              { color: isPast ? "#ef4444" : isDark ? "#cbd5e1" : "#334155" },
            ]}
          >
            {startDate}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  icon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
