import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MedicineExtractionSummaryCardProps {
  documents: { id: string; fileName: string; medicinesCount: number }[];
  isDark: boolean;
  isLatest: boolean;
  onReview: () => void;
}

export const MedicineExtractionSummaryCard = React.memo(
  function MedicineExtractionSummaryCard({
    documents,
    isDark,
    isLatest,
    onReview,
  }: MedicineExtractionSummaryCardProps) {
    const totalCount = documents.reduce(
      (sum, doc) => sum + (doc.medicinesCount || 0),
      0,
    );

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
        <View style={styles.summaryPillHeader}>
          <Text
            style={[
              styles.summaryPillTitle,
              { color: isDark ? "#f8fafc" : "#1e293b" },
            ]}
          >
            💊 {totalCount} Medicine{totalCount === 1 ? "" : "s"} Extracted
          </Text>
        </View>
        <View style={{ marginVertical: 8 }}>
          {documents.map((doc, idx) => (
            <View key={doc.id || idx} style={styles.summaryDocRow}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  marginRight: 8,
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#5B4BFF"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.summaryDocName,
                    { color: isDark ? "#cbd5e1" : "#334155" },
                  ]}
                  numberOfLines={1}
                >
                  {doc.fileName}
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryDocCount,
                  { color: doc.medicinesCount > 0 ? "#10b981" : "#ef4444" },
                ]}
              >
                {doc.medicinesCount > 0
                  ? `${doc.medicinesCount} medicine${doc.medicinesCount === 1 ? "" : "s"}`
                  : "NO MEDICINES FOUND"}
              </Text>
            </View>
          ))}
        </View>
        {isLatest && (
          <TouchableOpacity onPress={onReview} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Review Medicines</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    width: "100%",
  },
  summaryPillHeader: {
    marginBottom: 8,
  },
  summaryPillTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  summaryDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  summaryDocName: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryDocCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#5B4BFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
