import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MedicineConflictResolverProps {
  conflictingMeds: any[];
  currentConflictIdx: number;
  setCurrentConflictIdx: React.Dispatch<React.SetStateAction<number>>;
  onResolve: (medId: string, action: string) => void;
  onEdit: (med: any) => void;
  onSwitchToList: () => void;
  isDark: boolean;
  theme: any;
  readOnly?: boolean;
}

export const MedicineConflictResolver = React.memo(function MedicineConflictResolver({
  conflictingMeds,
  currentConflictIdx,
  setCurrentConflictIdx,
  onResolve,
  onEdit,
  onSwitchToList,
  isDark,
  readOnly,
}: MedicineConflictResolverProps) {
  if (!conflictingMeds.length) return null;

  const med = conflictingMeds[currentConflictIdx] || conflictingMeds[0];
  const exist = med?.duplicateInfo?.matchedMedication || med?.duplicateInfo?.matchedMedications?.[0];

  const getExistingDosage = (existMed: any) => {
    if (!existMed) return "None";
    const value = existMed.dosePerIntake ?? existMed.dosage ?? 1;
    const dosage = typeof value === "object"
      ? value.count ?? value.value ?? 1
      : value;
    const unit = typeof value === "object"
      ? value.unit || existMed.medicationType || "tablet"
      : existMed.medicationType || "tablet";
    return `${dosage} ${String(unit).toLowerCase()}(s)`;
  };

  const getExtractedDosage = (newMed: any) => {
    const value = newMed.dosage ?? newMed.dose ?? newMed.dosePerIntake ?? 1;
    if (typeof value === "object") {
      const dosage = value.count ?? value.value ?? 1;
      const unit = value.unit || newMed.dosageUnit || newMed.unit || newMed.medicineType || "tablet";
      return `${dosage} ${String(unit).toLowerCase()}(s)`;
    }
    return `${value} ${newMed.dosageUnit || newMed.unit || newMed.medicineType || "tablet"}`;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
          Resolve Conflicts
        </Text>
        <TouchableOpacity onPress={onSwitchToList}>
          <Text style={styles.showListText}>Show List</Text>
        </TouchableOpacity>
      </View>

      {/* Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.conflictCountText}>
          Conflict {currentConflictIdx + 1} of {conflictingMeds.length}
        </Text>
        <Text
          style={[
            styles.medNameText,
            { color: isDark ? "#cbd5e1" : "#1e293b" },
          ]}
        >
          {med.name || med.medicationName}
        </Text>
      </View>

      {/* Comparison Grid */}
      <View style={styles.comparisonGrid}>
        {/* Existing in profile */}
        <View
          style={[
            styles.compareBox,
            { backgroundColor: isDark ? "#0f172a" : "#f8fafc", marginRight: 8 },
          ]}
        >
          <Text style={styles.compareLabel}>Existing in profile</Text>
          <Text
            numberOfLines={2}
            style={[
              styles.compareMedName,
              { color: isDark ? "#e2e8f0" : "#334155" },
            ]}
          >
            {exist?.medicationName || "Existing Item"}
          </Text>
          <Text style={styles.compareMeta}>{getExistingDosage(exist)}</Text>
          <Text style={styles.compareMeta}>{exist?.frequency || "Once Daily"}</Text>
        </View>

        {/* Newly Extracted */}
        <View
          style={[
            styles.compareBox,
            { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
          ]}
        >
          <Text style={styles.compareLabel}>Newly extracted</Text>
          <Text
            numberOfLines={2}
            style={[
              styles.compareMedName,
              { color: isDark ? "#e2e8f0" : "#334155" },
            ]}
          >
            {med.name || med.medicationName}
          </Text>
          <Text style={styles.compareMeta}>{getExtractedDosage(med)}</Text>
          <Text style={styles.compareMeta}>{med.frequency || "Once Daily"}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            disabled={readOnly}
            onPress={() => onResolve(med.id, "REMOVE_NEW")}
            style={[styles.actionBtn, { borderColor: "#cbd5e1" }]}
          >
            <Text style={styles.actionBtnText}>Keep Existing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={readOnly}
            onPress={() => onResolve(med.id, "REPLACE")}
            style={[styles.actionBtn, { borderColor: "#cbd5e1" }]}
          >
            <Text style={styles.actionBtnText}>Replace Existing</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            disabled={readOnly}
            onPress={() => onResolve(med.id, "KEEP_BOTH")}
            style={[styles.actionBtn, { borderColor: "#cbd5e1" }]}
          >
            <Text style={styles.actionBtnText}>Keep Both</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={readOnly}
            onPress={() => onEdit(med)}
            style={[styles.actionBtn, { borderColor: "#cbd5e1" }]}
          >
            <Text style={styles.actionBtnText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pager */}
      <View style={styles.pagerRow}>
        <TouchableOpacity
          disabled={currentConflictIdx === 0}
          onPress={() => setCurrentConflictIdx((prev) => Math.max(0, prev - 1))}
          style={{ opacity: currentConflictIdx === 0 ? 0.3 : 1, padding: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>
        <Text style={[styles.pagerText, { color: isDark ? "#cbd5e1" : "#475569" }]}>
          {currentConflictIdx + 1} / {conflictingMeds.length}
        </Text>
        <TouchableOpacity
          disabled={currentConflictIdx === conflictingMeds.length - 1}
          onPress={() => setCurrentConflictIdx((prev) => Math.min(conflictingMeds.length - 1, prev + 1))}
          style={{ opacity: currentConflictIdx === conflictingMeds.length - 1 ? 0.3 : 1, padding: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  showListText: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 13,
  },
  counterRow: {
    marginBottom: 12,
  },
  conflictCountText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#b91c1c",
  },
  medNameText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  comparisonGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  compareBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  compareLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: "600",
  },
  compareMedName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  compareMeta: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  buttonGroup: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  pagerText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
