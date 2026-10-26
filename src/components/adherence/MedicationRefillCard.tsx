import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RefillAlertMedication } from "../../types/adherence";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicationRefillCardProps {
  medication: RefillAlertMedication;
  onRefillPress?: (med: RefillAlertMedication) => void;
}

const getMedicationIcon = (
  type?: string,
): { name: keyof typeof MaterialCommunityIcons.glyphMap; family: "mci" } | {
  name: keyof typeof Ionicons.glyphMap;
  family: "ion";
} => {
  const norm = (type || "").toUpperCase();
  if (norm.includes("TABLET") || norm.includes("TAB")) {
    return { name: "pill", family: "mci" };
  }
  if (norm.includes("CAPSULE") || norm.includes("CAP")) {
    return { name: "pill", family: "mci" };
  }
  if (norm.includes("SYRUP") || norm.includes("LIQUID") || norm.includes("SOLUTION")) {
    return { name: "bottle-tonic-outline", family: "mci" };
  }
  if (norm.includes("INJECTION") || norm.includes("INJ")) {
    return { name: "needle", family: "mci" };
  }
  if (norm.includes("DROP")) {
    return { name: "water-outline", family: "ion" };
  }
  if (norm.includes("INHALER")) {
    return { name: "air-filter", family: "mci" };
  }
  return { name: "medical-bag", family: "mci" };
};

const formatRefillDate = (dateStr?: string | null) => {
  if (!dateStr) return "Soon";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
};

export const MedicationRefillCard: React.FC<MedicationRefillCardProps> = ({
  medication,
  onRefillPress,
}) => {
  const { isDark, theme } = useAppTheme();

  const getUrgencyConfig = () => {
    switch (medication.urgency) {
      case "OUT_OF_STOCK":
        return {
          label: "Out of Stock",
          badgeBg: isDark ? "rgba(239, 68, 68, 0.18)" : "#FEE2E2",
          badgeText: isDark ? "#F87171" : "#DC2626",
          badgeBorder: isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA",
          iconBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
          iconColor: isDark ? "#F87171" : "#EF4444",
          progressColor: "#EF4444",
          statusDot: "#EF4444",
        };
      case "LOW_STOCK":
        return {
          label: "Low Stock",
          badgeBg: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
          badgeText: isDark ? "#FBBF24" : "#D97706",
          badgeBorder: isDark ? "rgba(245, 158, 11, 0.4)" : "#FDE68A",
          iconBg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FFFBEB",
          iconColor: isDark ? "#FBBF24" : "#F59E0B",
          progressColor: "#F59E0B",
          statusDot: "#F59E0B",
        };
      case "DUE_SOON":
      default:
        return {
          label: "Refill Soon",
          badgeBg: isDark ? "rgba(99, 102, 241, 0.18)" : "#EEF2FF",
          badgeText: isDark ? "#818CF8" : "#4F46E5",
          badgeBorder: isDark ? "rgba(99, 102, 241, 0.4)" : "#E0E7FF",
          iconBg: isDark ? "rgba(99, 102, 241, 0.15)" : "#F5F3FF",
          iconColor: isDark ? "#818CF8" : "#6366F1",
          progressColor: "#6366F1",
          statusDot: "#6366F1",
        };
    }
  };

  const cfg = getUrgencyConfig();
  const medIcon = getMedicationIcon(medication.medicationType);
  const stockPct = Math.min(Math.max(medication.stockPercentage || 0, 0), 100);

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
      {/* Top row: Icon + Medicine name/formulation & Urgency badge */}
      <View style={styles.topRow}>
        <View style={styles.medHeaderLeft}>
          <View style={[styles.medIconBox, { backgroundColor: cfg.iconBg }]}>
            {medIcon.family === "mci" ? (
              <MaterialCommunityIcons
                name={medIcon.name}
                size={18}
                color={cfg.iconColor}
              />
            ) : (
              <Ionicons
                name={medIcon.name}
                size={18}
                color={cfg.iconColor}
              />
            )}
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={[styles.medName, { color: isDark ? "#F8FAFC" : "#0F172A" }]}
              numberOfLines={1}
            >
              {medication.medicationName}
            </Text>
            <Text
              style={[styles.medType, { color: isDark ? "#94A3B8" : "#64748B" }]}
              numberOfLines={1}
            >
              {medication.medicationType || "Medication"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.urgencyPill,
            {
              backgroundColor: cfg.badgeBg,
              borderColor: cfg.badgeBorder,
            },
          ]}
        >
          <View
            style={[styles.urgencyDot, { backgroundColor: cfg.statusDot }]}
          />
          <Text style={[styles.urgencyText, { color: cfg.badgeText }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* Stock remaining info */}
      <View style={styles.stockRow}>
        <Text style={[styles.stockValue, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          {medication.remainingQuantity}{" "}
          <Text style={[styles.stockUnit, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            {medication.unit || "doses"} left
          </Text>
        </Text>
        <View style={styles.daysContainer}>
          <Ionicons
            name="time-outline"
            size={12}
            color={cfg.badgeText}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.daysText, { color: cfg.badgeText }]}>
            {medication.daysRemaining === null || medication.daysRemaining === undefined
              ? "As needed"
              : medication.daysRemaining <= 0
              ? "Depleted"
              : medication.daysRemaining === 1
              ? "1 day left"
              : `${medication.daysRemaining} days left`}
          </Text>
        </View>
      </View>

      {/* Stock progress track */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              width: `${stockPct}%`,
              backgroundColor: cfg.progressColor,
            },
          ]}
        />
      </View>

      {/* Footer: Estimated refill date & Refill Action Button */}
      <View style={styles.footerRow}>
        <View style={styles.footerDateRow}>
          <Ionicons
            name="calendar-outline"
            size={13}
            color={isDark ? "#94A3B8" : "#64748B"}
          />
          <Text
            style={[styles.refillDateText, { color: isDark ? "#94A3B8" : "#64748B" }]}
          >
            Refill:{" "}
            <Text
              style={{
                fontWeight: "700",
                color: isDark ? "#E2E8F0" : "#334155",
              }}
            >
              {formatRefillDate(medication.estimatedRefillDate)}
            </Text>
          </Text>
        </View>

        {onRefillPress && (
          <TouchableOpacity
            style={[
              styles.refillBtn,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => onRefillPress(medication)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Restock or refill ${medication.medicationName}`}
          >
            <Ionicons name="refresh" size={13} color="#FFFFFF" />
            <Text style={styles.refillBtnText}>Refill</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 275,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  medHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  medIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  nameContainer: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: "700",
  },
  medType: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  urgencyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  stockValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  stockUnit: {
    fontSize: 12,
    fontWeight: "500",
  },
  daysContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  daysText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  refillDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  refillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  refillBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
