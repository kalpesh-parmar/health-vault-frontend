import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../../constants/theme";

export interface PatientDetails {
  name?: string | null;
  age?: number | string | null;
  gender?: string | null;
  uhid?: string | null;
  reportDate?: string | null;
  doctorName?: string | null;
  hospitalName?: string | null;
}

export interface StructuredLabResult {
  name: string;
  value: string;
  unit?: string;
  status?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
}

export interface StructuredReportDocument {
  id?: string;
  fileName?: string;
  documentType?: string;
  reportDate?: string;
  doctorName?: string | null;
  hospitalName?: string | null;
  patientName?: string | null;
  summary?: string;
  patientDetails?: PatientDetails;
  abnormalResults?: StructuredLabResult[];
  normalResults?: StructuredLabResult[];
  keyFindings?: string | StructuredLabResult[] | any[];
  whatThisMayMean?: string;
  labFindings?: StructuredLabResult[];
  medicationFindings?: any[];
  s3Key?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
  isLabReport?: boolean;
  isPrescription?: boolean;
}

export interface StructuredReportSummaryCardProps {
  document?: StructuredReportDocument;
  suggestedQuestions?: string[];
  isDark: boolean;
  theme?: any;
  preferredLang?: string;
  onQuestionPress?: (question: string) => void;
  onViewFullReport?: () => void;
  readOnly?: boolean;
}

export const I18N_STRUCTURED_CARD: Record<string, Record<string, string>> = {
  english: {
    patientDetails: "Patient Details",
    keyFindings: "Key Findings",
    abnormalResults: "Abnormal Results",
    normalResults: "Normal Results",
    whatThisMeans: "What This May Mean",
    viewFullReport: "View Full Report",
    name: "Name",
    ageGender: "Age / Gender",
    uhid: "UHID / ID",
    date: "Report Date",
    normalRange: "Normal Range",
    status: "Status",
    disclaimer: "This summary is for informational purposes only. Please consult your physician for personalized medical advice.",
    expand: "Expand",
    collapse: "Collapse",
    noAbnormalFound: "No abnormal parameters detected.",
    noNormalFound: "No additional parameters listed.",
  },
  gujarati: {
    patientDetails: "દર્દીની વિગતો",
    keyFindings: "મુખ્ય તારણો",
    abnormalResults: "અસામાન્ય પરિણામો",
    normalResults: "સામાન્ય પરિણામો",
    whatThisMeans: "આનો અર્થ શું હોઈ શકે",
    viewFullReport: "સંપૂર્ણ રિપોર્ટ જુઓ",
    name: "નામ",
    ageGender: "ઉંમર / લિંગ",
    uhid: "UHID / ID",
    date: "રિપોર્ટ તારીખ",
    normalRange: "સામાન્ય શ્રેણી",
    status: "સ્થિતિ",
    disclaimer: "આ સારાંશ ફક્ત માહિતી માટે છે. કૃપા કરીને યોગ્ય તબીબી સલાહ માટે તમારા ડૉક્ટરનો સંપર્ક કરો.",
    expand: "વિગતો જુઓ",
    collapse: "છુપાવો",
    noAbnormalFound: "કોઈ અસામાન્ય પરિણામ મળ્યા નથી.",
    noNormalFound: "કોઈ વધારાના પરિણામો નથી.",
  },
  hindi: {
    patientDetails: "मरीज़ का विवरण",
    keyFindings: "मुख्य निष्कर्ष",
    abnormalResults: "असामान्य परिणाम",
    normalResults: "सामान्य परिणाम",
    whatThisMeans: "इसका क्या अर्थ हो सकता है",
    viewFullReport: "पूरी रिपोर्ट देखें",
    name: "नाम",
    ageGender: "उम्र / लिंग",
    uhid: "UHID / ID",
    date: "रिपोर्ट तिथि",
    normalRange: "सामान्य सीमा",
    status: "स्थिति",
    disclaimer: "यह सारांश केवल जानकारी के लिए है। कृपया चिकित्सकीय सलाह के लिए अपने डॉक्टर से संपर्क करें।",
    expand: "विस्तार करें",
    collapse: "संक्षिप्त करें",
    noAbnormalFound: "कोई असामान्य पैरामीटर नहीं मिला।",
    noNormalFound: "कोई अन्य पैरामीटर सूचीबद्ध नहीं है।",
  },
  marathi: {
    patientDetails: "रुग्णाचा तपशील",
    keyFindings: "मुख्य निष्कर्ष",
    abnormalResults: "असामान्य निकाल",
    normalResults: "सामान्य निकाल",
    whatThisMeans: "याचा काय अर्थ असू शकतो",
    viewFullReport: "पूर्ण अहवाल पहा",
    name: "नाव",
    ageGender: "वय / लिंग",
    uhid: "UHID / ID",
    date: "अहवाल तारीख",
    normalRange: "सामान्य श्रेणी",
    status: "स्थिती",
    disclaimer: "हा सारांश केवळ माहितीसाठी आहे. कृपया वैद्यकीय सल्ल्यासाठी डॉक्टरांशी संपर्क साधा.",
    expand: "पहा",
    collapse: "लपवा",
    noAbnormalFound: "कोणतेही असामान्य मूल्य आढळले नाही.",
    noNormalFound: "इतर मूल्ये उपलब्ध नाहीत.",
  },
  tamil: {
    patientDetails: "நோயாளி விவரங்கள்",
    keyFindings: "முக்கிய கண்டுபிடிப்புகள்",
    abnormalResults: "அசாதாரண முடிவுகள்",
    normalResults: "இயல்பான முடிவுகள்",
    whatThisMeans: "இதன் பொருள் என்னவாக இருக்கலாம்",
    viewFullReport: "முழு அறிக்கையைப் பார்க்கவும்",
    name: "பெயர்",
    ageGender: "வயது / பாலினம்",
    uhid: "UHID / ID",
    date: "அறிக்கை தேதி",
    normalRange: "சாதாரண வரம்பு",
    status: "நிலை",
    disclaimer: "இந்த சுருக்கம் தகவல் நோக்கங்களுக்காக மட்டுமே. மருத்துவ ஆலோசனைக்கு மருத்துவரை அணுகவும்.",
    expand: "விரிவாக்கு",
    collapse: "சுருக்கு",
    noAbnormalFound: "அசாதாரண அளவுகள் எதுவும் இல்லை.",
    noNormalFound: "கூடுதல் அளவுகள் எதுவும் இல்லை.",
  },
};

export const StructuredReportSummaryCard: React.FC<StructuredReportSummaryCardProps> = ({
  document = {},
  suggestedQuestions = [],
  isDark,
  theme,
  preferredLang = "english",
  onQuestionPress,
  onViewFullReport,
  readOnly = false,
}) => {
  const [normalExpanded, setNormalExpanded] = useState(false);

  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  const normalizedLang = (preferredLang || "english").toLowerCase();
  const langKey =
    normalizedLang === "gu" || normalizedLang === "gujarati"
      ? "gujarati"
      : normalizedLang === "hi" || normalizedLang === "hindi"
      ? "hindi"
      : normalizedLang === "mr" || normalizedLang === "marathi"
      ? "marathi"
      : normalizedLang === "ta" || normalizedLang === "tamil"
      ? "tamil"
      : "english";

  const t = I18N_STRUCTURED_CARD[langKey] || I18N_STRUCTURED_CARD.english;

  const patient = document.patientDetails || {
    name: document.patientName || null,
    reportDate: document.reportDate || null,
    doctorName: document.doctorName || null,
    hospitalName: document.hospitalName || null,
  };

  const abnormalResults: StructuredLabResult[] = useMemo(() => {
    if (Array.isArray(document.abnormalResults) && document.abnormalResults.length > 0) {
      return document.abnormalResults;
    }
    const allLabs = document.labFindings || [];
    return allLabs.filter((item) => item.isAbnormal);
  }, [document.abnormalResults, document.labFindings]);

  const normalResults: StructuredLabResult[] = useMemo(() => {
    if (Array.isArray(document.normalResults) && document.normalResults.length > 0) {
      return document.normalResults;
    }
    const allLabs = document.labFindings || [];
    return allLabs.filter((item) => !item.isAbnormal);
  }, [document.normalResults, document.labFindings]);

  const keyFindingsText = useMemo(() => {
    if (typeof document.keyFindings === "string" && document.keyFindings.trim()) {
      return document.keyFindings.trim();
    }
    if (document.summary && document.summary.trim()) {
      return document.summary.trim();
    }
    if (abnormalResults.length > 0) {
      return `${abnormalResults.length} abnormal parameter(s) requiring attention detected.`;
    }
    return t.noAbnormalFound;
  }, [document.keyFindings, document.summary, abnormalResults, t.noAbnormalFound]);

  const whatThisMayMeanText = useMemo(() => {
    if (document.whatThisMayMean && document.whatThisMayMean.trim()) {
      return document.whatThisMayMean.trim();
    }
    if (document.summary && document.summary.trim()) {
      return document.summary.trim();
    }
    return "";
  }, [document.whatThisMayMean, document.summary]);

  const ageGenderStr = useMemo(() => {
    const parts: string[] = [];
    if (patient.age) parts.push(`${patient.age} yrs`);
    if (patient.gender) parts.push(String(patient.gender).toUpperCase());
    return parts.length > 0 ? parts.join(" • ") : null;
  }, [patient.age, patient.gender]);

  return (
    <View style={styles.container} testID="structured-report-summary-card">
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1a2234" : "#ffffff",
            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
          },
        ]}
      >
        {/* Section 1: Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                {
                  backgroundColor: isDark ? "rgba(91, 75, 255, 0.2)" : "#eff6ff",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="clipboard-pulse-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerTextGroup}>
              <Text
                style={[styles.fileName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {document.fileName || "Medical Report"}
              </Text>
              <Text style={[styles.docTypeBadge, { color: colors.primary }]}>
                {document.documentType || "LAB_REPORT"}
                {patient.reportDate ? ` • ${patient.reportDate}` : ""}
              </Text>
            </View>
          </View>

          {onViewFullReport && (
            <TouchableOpacity
              style={[
                styles.viewReportBtn,
                {
                  backgroundColor: isDark ? "rgba(91, 75, 255, 0.15)" : "#f0f4ff",
                  borderColor: colors.primary,
                },
              ]}
              onPress={onViewFullReport}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              <Text style={[styles.viewReportBtnText, { color: colors.primary }]}>
                {t.viewFullReport}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section 2: Patient Details Card */}
        <View
          style={[
            styles.patientCard,
            {
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
            },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
              {t.patientDetails}
            </Text>
          </View>

          <View style={styles.patientGrid}>
            <View style={styles.patientGridItem}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{t.name}</Text>
              <Text
                style={[styles.gridValue, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {patient.name || "Patient"}
              </Text>
            </View>

            {ageGenderStr && (
              <View style={styles.patientGridItem}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{t.ageGender}</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
                  {ageGenderStr}
                </Text>
              </View>
            )}

            {patient.uhid && (
              <View style={styles.patientGridItem}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{t.uhid}</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
                  {patient.uhid}
                </Text>
              </View>
            )}

            {(patient.doctorName || patient.hospitalName) && (
              <View style={styles.patientGridItem}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Doctor / Clinic</Text>
                <Text
                  style={[styles.gridValue, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {patient.doctorName || patient.hospitalName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 3: Key Findings Banner */}
        <View
          style={[
            styles.keyFindingsBanner,
            {
              backgroundColor: isDark ? "rgba(91, 75, 255, 0.12)" : "#f0fdf4",
              borderColor: isDark ? "rgba(91, 75, 255, 0.3)" : "#bbf7d0",
            },
          ]}
        >
          <View style={styles.bannerHeader}>
            <MaterialCommunityIcons
              name="stethoscope"
              size={18}
              color={isDark ? "#818cf8" : "#16a34a"}
            />
            <Text
              style={[
                styles.bannerTitle,
                { color: isDark ? "#c7d2fe" : "#15803d" },
              ]}
            >
              {t.keyFindings}
            </Text>
          </View>
          <Text
            style={[
              styles.bannerText,
              { color: isDark ? "#e2e8f0" : "#166534" },
            ]}
          >
            {keyFindingsText}
          </Text>
        </View>

        {/* Section 4: Abnormal Results Section (High Visibility) */}
        {abnormalResults.length > 0 && (
          <View style={styles.resultsBlock}>
            <View style={styles.resultsHeaderRow}>
              <View style={styles.resultsHeaderLeft}>
                <Ionicons name="warning" size={16} color="#ef4444" />
                <Text style={[styles.resultsSectionTitle, { color: "#ef4444" }]}>
                  {t.abnormalResults} ({abnormalResults.length})
                </Text>
              </View>
            </View>

            {abnormalResults.map((test, index) => (
              <View
                key={`abnormal-${index}`}
                style={[
                  styles.testRowCard,
                  styles.abnormalRowCard,
                  {
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
                    borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "#fecaca",
                  },
                ]}
              >
                <View style={styles.testMainInfo}>
                  <Text style={[styles.testName, { color: colors.textPrimary }]}>
                    {test.name}
                  </Text>
                  <View style={styles.testMetaRow}>
                    <Text style={[styles.testValueHighlight, { color: "#dc2626" }]}>
                      {test.value} {test.unit || ""}
                    </Text>
                    {test.referenceRange ? (
                      <Text style={[styles.testRange, { color: colors.textSecondary }]}>
                        ({t.normalRange}: {test.referenceRange})
                      </Text>
                    ) : null}
                  </View>
                </View>

                {test.status ? (
                  <View style={[styles.statusTag, styles.abnormalTag]}>
                    <Text style={styles.abnormalTagText} numberOfLines={1}>
                      {test.status}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Section 5: Normal Results Section (Collapsible Accordion) */}
        {normalResults.length > 0 && (
          <View style={styles.resultsBlock}>
            <TouchableOpacity
              testID="normal-results-accordion-toggle"
              style={[
                styles.normalAccordionHeader,
                {
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                },
              ]}
              onPress={() => setNormalExpanded(!normalExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.resultsHeaderLeft}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={[styles.resultsSectionTitle, { color: colors.textPrimary }]}>
                  {t.normalResults} ({normalResults.length})
                </Text>
              </View>
              <View style={styles.accordionToggleGroup}>
                <Text style={[styles.accordionToggleText, { color: colors.primary }]}>
                  {normalExpanded ? t.collapse : t.expand}
                </Text>
                <Ionicons
                  name={normalExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>

            {normalExpanded && (
              <View style={styles.normalListContainer}>
                {normalResults.map((test, index) => (
                  <View
                    key={`normal-${index}`}
                    style={[
                      styles.testRowCard,
                      {
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                      },
                    ]}
                  >
                    <View style={styles.testMainInfo}>
                      <Text style={[styles.testName, { color: colors.textPrimary }]}>
                        {test.name}
                      </Text>
                      <View style={styles.testMetaRow}>
                        <Text style={[styles.testValueNormal, { color: colors.textPrimary }]}>
                          {test.value} {test.unit || ""}
                        </Text>
                        {test.referenceRange ? (
                          <Text style={[styles.testRange, { color: colors.textSecondary }]}>
                            ({t.normalRange}: {test.referenceRange})
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.statusTag, styles.normalTag]}>
                      <Ionicons name="checkmark" size={11} color="#15803d" />
                      <Text style={styles.normalTagText}>Normal</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section 6: What This May Mean */}
        {whatThisMayMeanText ? (
          <View
            style={[
              styles.meaningCard,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#fdf8f6",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#fed7aa",
              },
            ]}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bulb-outline" size={16} color="#ea580c" />
              <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                {t.whatThisMeans}
              </Text>
            </View>
            <Text
              style={[
                styles.meaningText,
                { color: colors.textPrimary },
              ]}
            >
              {whatThisMayMeanText}
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              {t.disclaimer}
            </Text>
          </View>
        ) : null}

        {/* Section 7: Interactive Quick Question Chips */}
        {suggestedQuestions && suggestedQuestions.length > 0 && !readOnly && (
          <View style={styles.chipsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {suggestedQuestions.map((question, idx) => (
                <TouchableOpacity
                  key={`q-chip-${idx}`}
                  style={[
                    styles.promptChip,
                    {
                      backgroundColor: isDark ? "rgba(91, 75, 255, 0.16)" : "#eff6ff",
                      borderColor: isDark ? "rgba(91, 75, 255, 0.35)" : "#bfdbfe",
                    },
                  ]}
                  onPress={() => onQuestionPress && onQuestionPress(question)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.promptChipText, { color: colors.primary }]}>
                    {question}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTextGroup: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  docTypeBadge: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  viewReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewReportBtnText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  patientCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  patientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  patientGridItem: {
    width: "50%",
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  keyFindingsBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  resultsBlock: {
    marginBottom: 14,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resultsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  testRowCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  abnormalRowCard: {},
  testMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  testName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  testMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  testValueHighlight: {
    fontSize: 14,
    fontWeight: "800",
    marginRight: 6,
  },
  testValueNormal: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 6,
  },
  testRange: {
    fontSize: 11,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  abnormalTag: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  abnormalTagText: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "700",
  },
  normalTag: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  normalTagText: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  normalAccordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  accordionToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionToggleText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  normalListContainer: {
    marginTop: 8,
  },
  meaningCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  meaningText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
  chipsSection: {
    marginTop: 4,
  },
  chipsScroll: {
    paddingVertical: 2,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
