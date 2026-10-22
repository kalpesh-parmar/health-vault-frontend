import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RefillAlertsResponse, RefillAlertMedication } from "../../types/adherence";
import { MedicationRefillCard } from "./MedicationRefillCard";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicationRefillSectionProps {
  data?: RefillAlertsResponse;
  isLoading: boolean;
  onRefillPress?: (med: RefillAlertMedication) => void;
  onViewAll?: () => void;
}

export const MedicationRefillSection: React.FC<MedicationRefillSectionProps> = ({
  data,
  isLoading,
  onRefillPress,
  onViewAll,
}) => {
  const { isDark, theme } = useAppTheme();

  // Strict Visibility Guard: Omit entirely when loading, empty, or hasRefillAlerts is false
  if (isLoading || !data || !data.hasRefillAlerts || !data.medications || data.medications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(245, 158, 11, 0.15)" },
              ]}
            >
              <Ionicons name="medkit" size={14} color="#F59E0B" />
            </View>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? "#F8FAFC" : "#0F172A" },
              ]}
            >
              Refill Reminders
            </Text>
          </View>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            Don't run out of your medications
          </Text>
        </View>

        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            style={styles.viewAllButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View all medications refill status"
          >
            <Text
              style={[
                styles.viewAllText,
                { color: theme.colors.primary },
              ]}
            >
              View All →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
      >
        {data.medications.map((med) => (
          <MedicationRefillCard
            key={med.medicationId}
            medication={med}
            onRefillPress={onRefillPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  carouselContainer: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
});

