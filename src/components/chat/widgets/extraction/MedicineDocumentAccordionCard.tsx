import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedMedicine } from "../../../../types/medicationReview";

const isPastDate = (dateVal: any): boolean => {
  if (!dateVal || dateVal === "None") return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
};

export interface MedicineDocumentAccordionCardProps {
  documents: { id: string; fileName: string; medicinesCount: number }[];
  medicines: ExtractedMedicine[];
  isDark: boolean;
  isLatest: boolean;
  onEdit: (med: ExtractedMedicine) => void;
  onContinue: () => void;
  isLoading: boolean;
  preferredLang?: string;
}

export const MedicineDocumentAccordionCard = React.memo(
  function MedicineDocumentAccordionCard({
    documents,
    medicines,
    isDark,
    isLatest,
    onEdit,
    onContinue,
    isLoading,
    preferredLang = "english",
  }: MedicineDocumentAccordionCardProps) {
    const [expandedDocId, setExpandedDocId] = useState<string | null>(
      documents.find((d) => d.medicinesCount > 0)?.id || null,
    );
    const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

    const toggleDoc = (id: string) => {
      setExpandedDocId((prev) => (prev === id ? null : id));
      setExpandedMedId(null);
    };

    const toggleMed = (id: string) => {
      setExpandedMedId((prev) => (prev === id ? null : id));
    };

    const getFrequencyLabel = (freq?: string) => {
      if (!freq) return "Once Daily";
      if (freq === "ONCE") return "Once Daily";
      if (freq === "TWICE") return "Twice Daily";
      if (freq === "THRICE") return "3x Daily";
      return freq;
    };

    const isAnyCheckedMedMissingStartDate =
      isLatest && medicines.some((m) => !m.startDate || m.startDate === "None");

    const isAnyCheckedMedPastStartDate =
      isLatest &&
      medicines.some(
        (m) => m.startDate && m.startDate !== "None" && isPastDate(m.startDate),
      );

    const areActionsDisabled =
      isLoading ||
      isAnyCheckedMedMissingStartDate ||
      isAnyCheckedMedPastStartDate;

    const getStartDateWarningText = () => {
      const lang = preferredLang || "english";
      if (isAnyCheckedMedMissingStartDate) {
        const dict: Record<string, string> = {
          english:
            "One or more medicines are missing a Start Date. Please edit them to add a Start Date.",
          gujarati:
            "એક અથવા વધુ દવાઓમાં શરૂઆતની તારીખ ખૂટે છે. શરૂઆતની તારીખ ઉમેરવા માટે કૃપા કરીને તેને સંપાદિત કરો.",
          hindi:
            "एक या अधिक दवाओं में आरंभ तिथि गायब है। कृपया आरंभ तिथि जोड़ने के लिए उन्हें संपादित करें।",
          marathi:
            "निवडलेल्या औषधांपैकी एक किंवा अधिक औषधांना सुरू होण्याची तारीख नाही. सुरू होण्याची तारीख जोडण्यासाठी कृपया त्यांना संपादित करा.",
          tamil:
            "தேர்ந்தெடுக்கப்பட்ட ஒன்று அல்லது அதற்கு மேற்பட்ட மருந்துகளுக்கு தொடக்க தேதி இல்லை. தொடக்க தேதியை சேர்க்க அவற்றை திருத்தவும்.",
        };
        return dict[lang] || dict.english;
      }
      if (isAnyCheckedMedPastStartDate) {
        const dict: Record<string, string> = {
          english:
            "One or more medicines have a past Start Date. Please edit them to set a current or future Start Date.",
          gujarati:
            "એક અથવા વધુ દવાઓમાં શરૂઆતની તારીખ ભૂતકાળની છે. કૃપા કરીને ચાલુ અથવા ભવિષ્યની શરૂઆતની તારીખ સેટ કરવા માટે તેને સંપાદિત કરો.",
          hindi:
            "एक या अधिक दवाओं की आरंभ तिथि बीत चुकी है। कृपया वर्तमान या भविष्य की आरंभ तिथि सेट करने के लिए उन्हें संपादित करें।",
          marathi:
            "निवडलेल्या औषधांपैकी एक किंवा अधिक औषधांना भूतकाळातील सुरू होण्याची तारीख आहे. कृपया चालू किंवा भविष्यातील सुरू होण्याची तारीख सेट करण्यासाठी त्यांना संपादित करा.",
          tamil:
            "தேர்ந்தெடுக்கப்பட்ட ஒன்று அல்லது அதற்கு மேற்பட்ட மருந்துகளுக்கு கடந்த கால தொடக்க தேதி உள்ளது. தற்போதைய அல்லது எதிர்கால தொடக்க தேதியை அமைக்க அவற்றை திருத்தவும்.",
        };
        return dict[lang] || dict.english;
      }
      return "";
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
        {documents.map((doc) => {
          const isDocExpanded = expandedDocId === doc.id;
          const docMeds = medicines.filter((m) => m.documentId === doc.id);

          return (
            <View
              key={doc.id}
              style={[
                styles.accordionSection,
                {
                  borderBottomColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#f1f5f9",
                },
              ]}
            >
              {/* Document Header */}
              <TouchableOpacity
                onPress={() => toggleDoc(doc.id)}
                style={styles.accordionHeader}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#5B4BFF"
                    style={{ marginRight: 8 }}
                  />
                  <View>
                    <Text
                      style={[
                        styles.accordionDocName,
                        { color: isDark ? "#f8fafc" : "#1e293b" },
                      ]}
                      numberOfLines={1}
                    >
                      {doc.fileName}
                    </Text>
                    <Text style={styles.accordionDocSub}>
                      {doc.medicinesCount} medicine
                      {doc.medicinesCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isDocExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isDark ? "#cbd5e1" : "#475569"}
                />
              </TouchableOpacity>

              {/* Document Content - Medicine list */}
              {isDocExpanded && (
                <View style={styles.accordionContent}>
                  {docMeds.length === 0 ? (
                    <Text style={styles.noMedsText}>
                      No medicines found in this document.
                    </Text>
                  ) : (
                    docMeds.map((med) => {
                      const isMedExpanded = expandedMedId === med.id;
                      return (
                        <View
                          key={med.id}
                          style={[
                            styles.medAccordionCard,
                            {
                              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                              borderColor: isDark
                                ? "rgba(255,255,255,0.05)"
                                : "#e2e8f0",
                            },
                          ]}
                        >
                          {/* Collapsed Header */}
                          <TouchableOpacity
                            onPress={() => toggleMed(med.id)}
                            style={styles.medAccordionHeader}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                style={[
                                  styles.medAccordionName,
                                  { color: isDark ? "#f8fafc" : "#0f172a" },
                                ]}
                              >
                                {med.name}
                              </Text>
                              {!isMedExpanded && (
                                <Text style={styles.medAccordionDesc}>
                                  {med.dosage || "1"} {med.dosageUnit || "tablet"}{" "}
                                  • {getFrequencyLabel(med.frequency)} •{" "}
                                  {med.timing || "After Food"}
                                </Text>
                              )}
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              {isLatest && (
                                <TouchableOpacity
                                  onPress={() => onEdit(med)}
                                  style={styles.medEditIcon}
                                >
                                  <Ionicons
                                    name="pencil-outline"
                                    size={16}
                                    color="#5B4BFF"
                                  />
                                </TouchableOpacity>
                              )}
                              <Ionicons
                                name={
                                  isMedExpanded ? "chevron-up" : "chevron-down"
                                }
                                size={16}
                                color={isDark ? "#94a3b8" : "#64748b"}
                                style={{ marginLeft: 8 }}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* Expanded details */}
                          {isMedExpanded && (
                            <View style={styles.medAccordionDetail}>
                              <View style={styles.grid}>
                                <View style={styles.gridItem}>
                                  <Text style={styles.gridLabel}>Strength</Text>
                                  <Text
                                    style={[
                                      styles.gridValue,
                                      {
                                        color: isDark ? "#cbd5e1" : "#334155",
                                      },
                                    ]}
                                  >
                                    {med.dosage || "Not specified"}
                                  </Text>
                                </View>
                                <View style={styles.gridItem}>
                                  <Text style={styles.gridLabel}>Dose</Text>
                                  <Text
                                    style={[
                                      styles.gridValue,
                                      {
                                        color: isDark ? "#cbd5e1" : "#334155",
                                      },
                                    ]}
                                  >
                                    {med.dosage || "1"}{" "}
                                    {med.dosageUnit || "tablet"}
                                  </Text>
                                </View>
                                <View style={styles.gridItem}>
                                  <Text style={styles.gridLabel}>
                                    Frequency
                                  </Text>
                                  <Text
                                    style={[
                                      styles.gridValue,
                                      {
                                        color: isDark ? "#cbd5e1" : "#334155",
                                      },
                                    ]}
                                  >
                                    {getFrequencyLabel(med.frequency)}
                                  </Text>
                                </View>
                                <View style={styles.gridItem}>
                                  <Text style={styles.gridLabel}>Duration</Text>
                                  <Text
                                    style={[
                                      styles.gridValue,
                                      {
                                        color: isDark ? "#cbd5e1" : "#334155",
                                      },
                                    ]}
                                  >
                                    {"30 Days"}
                                  </Text>
                                </View>
                              </View>
                              {med.notes ? (
                                <View
                                  style={[
                                    styles.notesWrapper,
                                    {
                                      backgroundColor: isDark
                                        ? "rgba(255,255,255,0.02)"
                                        : "#f1f5f9",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.notesText,
                                      {
                                        color: isDark ? "#94a3b8" : "#475569",
                                      },
                                    ]}
                                  >
                                    <Text style={{ fontWeight: "bold" }}>
                                      Notes:{" "}
                                    </Text>
                                    {med.notes}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}

        {isLatest &&
          (isAnyCheckedMedMissingStartDate ||
            isAnyCheckedMedPastStartDate) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark
                  ? "rgba(220, 38, 38, 0.2)"
                  : "#fef2f2",
                borderColor: isDark ? "rgba(220, 38, 38, 0.4)" : "#fca5a5",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
                marginTop: 4,
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={isDark ? "#fca5a5" : "#ef4444"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 12.5,
                  color: isDark ? "#fca5a5" : "#b91c1c",
                  fontWeight: "600",
                  flex: 1,
                  lineHeight: 17,
                }}
              >
                {getStartDateWarningText()}
              </Text>
            </View>
          )}

        {isLatest && (
          <TouchableOpacity
            onPress={onContinue}
            disabled={areActionsDisabled}
            style={[
              styles.primaryButton,
              {
                backgroundColor: areActionsDisabled ? "#cbd5e1" : "#5B4BFF",
                opacity: areActionsDisabled ? 0.55 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
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
  accordionSection: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  accordionDocName: {
    fontSize: 14,
    fontWeight: "700",
  },
  accordionDocSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  accordionContent: {
    marginTop: 8,
    paddingLeft: 4,
  },
  noMedsText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    paddingVertical: 6,
  },
  medAccordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  medAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medAccordionName: {
    fontSize: 14,
    fontWeight: "700",
  },
  medAccordionDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  medEditIcon: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(91, 75, 255, 0.08)",
  },
  medAccordionDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  gridItem: {
    width: "50%",
  },
  gridLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  gridValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  notesWrapper: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#5B4BFF",
  },
  notesText: {
    fontSize: 11,
  },
  primaryButton: {
    backgroundColor: "#5B4BFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
