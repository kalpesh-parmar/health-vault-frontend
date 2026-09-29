import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  NormalizedMedicationItem,
  MedicationListPagination,
} from "../../../utils/medicationListNormalizer";

export interface StructuredMedicationListCardProps {
  medicines: NormalizedMedicationItem[];
  pagination?: MedicationListPagination;
  isDark: boolean;
  theme: any;
  preferredLang?: string;
  onViewAllMedications?: () => void;
  onAddMedication?: () => void;
  onUploadPrescription?: () => void;
  readOnly?: boolean;
}

export const I18N_MED_LIST_CARD: Record<string, Record<string, string>> = {
  english: {
    cardTitle: "Your Medications",
    emptyTitle: "No Medications Found",
    emptySubtitle: "There are currently no active medications registered in your health vault.",
    addMedication: "Add Medication",
    uploadPrescription: "Upload Prescription",
    viewAllInVault: "Manage in Health Vault",
    viewAllCount: "View All ({count}) Medications",
    dose: "Dose",
    frequency: "Frequency",
    schedule: "Schedule",
    timing: "Timing",
    afterFood: "After Food",
    beforeFood: "Before Food",
    withFood: "With Food",
    prescribedBy: "Prescribed By",
    notes: "Notes",
    activePills: "Medications",
    showMore: "Show More",
    showLess: "Show Less",
  },
  hindi: {
    cardTitle: "आपकी दवाइयाँ",
    emptyTitle: "कोई दवाई नहीं मिली",
    emptySubtitle: "वर्तमान में आपके स्वास्थ्य वॉल्ट में कोई सक्रिय दवाई पंजीकृत नहीं है।",
    addMedication: "दवाई जोड़ें",
    uploadPrescription: "पर्चा अपलोड करें",
    viewAllInVault: "हेल्थ वॉल्ट में प्रबंधित करें",
    viewAllCount: "सभी ({count}) दवाइयाँ देखें",
    dose: "खुराक",
    frequency: "आवृत्ति",
    schedule: "समय",
    timing: "समय निर्धारण",
    afterFood: "भोजन के बाद",
    beforeFood: "भोजन से पहले",
    withFood: "भोजन के साथ",
    prescribedBy: "डॉक्टर द्वारा निर्धारित",
    notes: "टिप्पणी",
    activePills: "दवाइयाँ",
    showMore: "अधिक देखें",
    showLess: "कम देखें",
  },
  gujarati: {
    cardTitle: "તમારી દવાઓ",
    emptyTitle: "કોઈ દવા મળી નથી",
    emptySubtitle: "હાલમાં તમારા હેલ્થ વૉલ્ટમાં કોઈ સક્રિય દવા નોંધાયેલ નથી.",
    addMedication: "દવા ઉમેરો",
    uploadPrescription: "પ્રિસ્ક્રિપ્શન અપલોડ કરો",
    viewAllInVault: "હેલ્થ વૉલ્ટમાં સંચાલન કરો",
    viewAllCount: "બધી ({count}) દવાઓ જુઓ",
    dose: "ડોઝ",
    frequency: "આવૃત્તિ",
    schedule: "સમયપત્રક",
    timing: "સમય",
    afterFood: "જમ્યા પછી",
    beforeFood: "જમ્યા પહેલાં",
    withFood: "જમવાની સાથે",
    prescribedBy: "ડૉક્ટર દ્વારા ભલામણ કરેલ",
    notes: "નોંધ",
    activePills: "દવાઓ",
    showMore: "વધુ જુઓ",
    showLess: "ઓછું જુઓ",
  },
  marathi: {
    cardTitle: "तुमची औषधे",
    emptyTitle: "कोणतीही औषधे आढळली नाहीत",
    emptySubtitle: "सध्या तुमच्या हेल्थ वॉल्टमध्ये कोणतीही सक्रिय औषधे नोंदणीकृत नाहीत.",
    addMedication: "औषध जोडा",
    uploadPrescription: "प्रिस्क्रिप्शन अपलोड करा",
    viewAllInVault: "हेल्थ वॉल्टमध्ये व्यवस्थापित करा",
    viewAllCount: "सर्व ({count}) औषधे पहा",
    dose: "डोस",
    frequency: "वारंवारता",
    schedule: "वेळापत्रक",
    timing: "वेळ",
    afterFood: "जेवणानंतर",
    beforeFood: "जेवणापूर्वी",
    withFood: "जेवणासोबत",
    prescribedBy: "डॉक्टरांनी दिलेले",
    notes: "नोंद",
    activePills: "औषधे",
    showMore: "अधिक पहा",
    showLess: "कमी पहा",
  },
  tamil: {
    cardTitle: "உங்கள் மருந்துகள்",
    emptyTitle: "மருந்துகள் எதுவும் காணப்படவில்லை",
    emptySubtitle: "தற்போது உங்கள் ஹெல்த் வால்ட்டில் செயலில் உள்ள மருந்துகள் எதுவும் பதிவு செய்யப்படவில்லை.",
    addMedication: "மருந்தைச் சேர்க்கவும்",
    uploadPrescription: "மருந்துச்சீட்டைப் பதிவேற்றவும்",
    viewAllInVault: "ஹெல்த் வால்ட்டில் நிர்வகிக்கவும்",
    viewAllCount: "அனைத்து ({count}) மருந்துகளையும் பார்க்கவும்",
    dose: "அளவு",
    frequency: "அதிர்வெண்",
    schedule: "அட்டவணை",
    timing: "நேரம்",
    afterFood: "உணவுக்குப் பின்",
    beforeFood: "உணவுக்கு முன்",
    withFood: "உணவுடன்",
    prescribedBy: "பரிந்துரைத்த மருத்துவர்",
    notes: "குறிப்புகள்",
    activePills: "மருந்துகள்",
    showMore: "மேலும் பார்க்க",
    showLess: "குறைவாக பார்க்க",
  },
};

const getMedTypeIcon = (type: string) => {
  const t = type.toUpperCase();
  if (t.includes("SYRUP")) return "bottle-tonic-outline";
  if (t.includes("INJECTION")) return "needle";
  if (t.includes("CAPSULE")) return "pill";
  if (t.includes("DROP")) return "water-outline";
  return "pill";
};

export const StructuredMedicationListCard: React.FC<StructuredMedicationListCardProps> = ({
  medicines = [],
  pagination,
  isDark,
  theme,
  preferredLang = "english",
  onViewAllMedications,
  onAddMedication,
  onUploadPrescription,
  readOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const langKey = preferredLang?.toLowerCase() || "english";
  const t = I18N_MED_LIST_CARD[langKey] || I18N_MED_LIST_CARD.english;

  const totalCount = pagination?.totalRecords ?? medicines.length;
  const displayedMeds = isExpanded ? medicines : medicines.slice(0, 4);
  const hasMoreThanLimit = medicines.length > 4;

  const formatFoodTiming = (foodFreq: string) => {
    if (foodFreq === "BEFORE_FOOD") return t.beforeFood;
    if (foodFreq === "WITH_FOOD") return t.withFood;
    return t.afterFood;
  };

  const primaryColor = theme?.colors?.primary || "#5B4BFF";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const itemBg = isDark ? "#0f172a" : "#f8fafc";
  const textColor = isDark ? "#f8fafc" : "#1e293b";
  const subTextColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBubble, { backgroundColor: `${primaryColor}1A` }]}>
            <MaterialCommunityIcons name="pill" size={20} color={primaryColor} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              {t.cardTitle}
            </Text>
            <Text style={[styles.cardSubtitle, { color: subTextColor }]}>
              {totalCount} {t.activePills}
            </Text>
          </View>
        </View>

        {totalCount > 0 && (
          <View style={[styles.countBadge, { backgroundColor: `${primaryColor}15` }]}>
            <Text style={[styles.countBadgeText, { color: primaryColor }]}>
              {totalCount}
            </Text>
          </View>
        )}
      </View>

      {/* Empty State */}
      {medicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#334155" : "#f1f5f9" }]}>
            <MaterialCommunityIcons name="pill-off" size={32} color={subTextColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            {t.emptyTitle}
          </Text>
          <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
            {t.emptySubtitle}
          </Text>

          <View style={styles.emptyActionsRow}>
            {onAddMedication && (
              <TouchableOpacity
                onPress={onAddMedication}
                style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.primaryActionBtnText}>{t.addMedication}</Text>
              </TouchableOpacity>
            )}

            {onUploadPrescription && (
              <TouchableOpacity
                onPress={onUploadPrescription}
                style={[styles.secondaryActionBtn, { borderColor, backgroundColor: itemBg }]}
              >
                <Ionicons name="document-text-outline" size={16} color={textColor} style={{ marginRight: 4 }} />
                <Text style={[styles.secondaryActionBtnText, { color: textColor }]}>
                  {t.uploadPrescription}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* Medications List */
        <View style={styles.listContainer}>
          {displayedMeds.map((med, index) => {
            const medIcon = getMedTypeIcon(med.medicationType);

            return (
              <View
                key={med.id || `med-item-${index}`}
                style={[styles.medItemCard, { backgroundColor: itemBg, borderColor }]}
              >
                {/* Item Top Row */}
                <View style={styles.itemTopRow}>
                  <View style={styles.itemNameContainer}>
                    <Text style={[styles.medName, { color: textColor }]} numberOfLines={1}>
                      {med.name}
                    </Text>
                    <View style={[styles.typePill, { backgroundColor: `${primaryColor}15` }]}>
                      <MaterialCommunityIcons
                        name={medIcon as any}
                        size={12}
                        color={primaryColor}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.typePillText, { color: primaryColor }]}>
                        {med.medicationType}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.dosageText, { color: subTextColor }]}>
                    {med.dosage}
                  </Text>
                </View>

                {/* Details Badges */}
                <View style={styles.detailsRow}>
                  {/* Frequency Tag */}
                  <View style={[styles.detailBadge, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor }]}>
                    <Ionicons name="repeat-outline" size={13} color={subTextColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.detailBadgeText, { color: textColor }]}>
                      {med.frequency}
                    </Text>
                  </View>

                  {/* Food Timing Tag */}
                  <View style={[styles.detailBadge, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor }]}>
                    <MaterialCommunityIcons
                      name={med.foodFrequency === "BEFORE_FOOD" ? "silverware-clean" : "silverware-fork-knife"}
                      size={13}
                      color={subTextColor}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.detailBadgeText, { color: textColor }]}>
                      {formatFoodTiming(med.foodFrequency)}
                    </Text>
                  </View>

                  {/* Schedule Times */}
                  {med.scheduleTimes && med.scheduleTimes.length > 0 && (
                    <View style={[styles.detailBadge, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor }]}>
                      <Ionicons name="time-outline" size={13} color={subTextColor} style={{ marginRight: 4 }} />
                      <Text style={[styles.detailBadgeText, { color: textColor }]}>
                        {med.scheduleTimes.slice(0, 3).join(", ")}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Prescribed By / Doctor Info */}
                {med.prescribedBy && (
                  <View style={styles.prescribedRow}>
                    <Ionicons name="person-outline" size={12} color={subTextColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.prescribedText, { color: subTextColor }]}>
                      {t.prescribedBy}: <Text style={{ color: textColor, fontWeight: "600" }}>{med.prescribedBy}</Text>
                    </Text>
                  </View>
                )}

                {/* Notes */}
                {med.notes && (
                  <Text style={[styles.notesText, { color: subTextColor }]} numberOfLines={2}>
                    💡 {med.notes}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Show More / Show Less Toggle */}
          {hasMoreThanLimit && (
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.expandBtn}
            >
              <Text style={[styles.expandBtnText, { color: primaryColor }]}>
                {isExpanded ? t.showLess : t.showMore}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={primaryColor}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          )}

          {/* Footer Action: Manage in Vault */}
          {onViewAllMedications && (
            <TouchableOpacity
              onPress={onViewAllMedications}
              style={[styles.vaultActionBtn, { borderColor, backgroundColor: isDark ? "#0f172a" : "#f1f5f9" }]}
            >
              <MaterialCommunityIcons name="pill" size={16} color={primaryColor} style={{ marginRight: 6 }} />
              <Text style={[styles.vaultActionBtnText, { color: primaryColor }]}>
                {pagination?.hasNextPage
                  ? t.viewAllCount.replace("{count}", String(totalCount))
                  : t.viewAllInVault}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={primaryColor} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContainer: {
    gap: 10,
  },
  medItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
    flexShrink: 1,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dosageText: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  prescribedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  prescribedText: {
    fontSize: 11,
  },
  notesText: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 15,
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  vaultActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  vaultActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
