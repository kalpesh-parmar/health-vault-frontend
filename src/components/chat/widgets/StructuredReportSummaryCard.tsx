import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../../constants/theme";
import { formatDateOnly } from "../../../utils/dateFormatter";
import DocumentViewerModal from "../../shared/DocumentViewerModal";

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
  reportDocuments?: StructuredReportDocument[];
  suggestedQuestions?: string[];
  isDark: boolean;
  theme?: any;
  preferredLang?: string;
  onQuestionPress?: (question: string, document?: StructuredReportDocument) => void;
  onViewFullReport?: (document?: StructuredReportDocument) => void;
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
    reportSummary: "Report Summary",
    reports: "Reports",
    report: "Report",
    document: "Document",
    documents: "Documents",
    tapToViewDetails: "Tap a report to view details",
    basedOnUploads: "These reports are based on your uploaded documents and are shown for your reference.",
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
    reportSummary: "રિપોર્ટ સારાંશ",
    reports: "રિપોર્ટ",
    report: "રિપોર્ટ",
    document: "દસ્તાવેજ",
    documents: "દસ્તાવેજો",
    tapToViewDetails: "વિગતો જોવા માટે રિપોર્ટ પસંદ કરો",
    basedOnUploads: "આ રિપોર્ટ અપલોડ કરેલા દસ્તાવેજો પર આધારિત છે અને તમારી જાણ માટે બતાવવામાં આવે છે.",
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
    reportSummary: "रिपोर्ट सारांश",
    reports: "रिपोर्ट",
    report: "रिपोर्ट",
    document: "दस्तावेज़",
    documents: "दस्तावेज़",
    tapToViewDetails: "विवरण देखने के लिए रिपोर्ट चुनें",
    basedOnUploads: "ये रिपोर्ट आपके अपलोड किए गए दस्तावेज़ों पर आधारित हैं और संदर्भ के लिए दिखाई गई हैं।",
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
    reportSummary: "अहवाल सारांश",
    reports: "अहवाल",
    report: "अहवाल",
    document: "दस्तऐवज",
    documents: "दस्तऐवज",
    tapToViewDetails: "तपशील पाहण्यासाठी अहवाल निवडा",
    basedOnUploads: "हे अहवाल अपलोड केलेल्या दस्तऐवजांवर आधारित असून संदर्भासाठी दाखवले आहेत.",
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
    reportSummary: "அறிக்கை சுருக்கம்",
    reports: "அறிக்கைகள்",
    report: "அறிக்கை",
    document: "ஆவணம்",
    documents: "ஆவணங்கள்",
    tapToViewDetails: "விவரங்களைக் காண அறிக்கையைத் தட்டவும்",
    basedOnUploads: "இந்த அறிக்கைகள் நீங்கள் பதிவேற்றிய ஆவணங்களின் அடிப்படையில் உங்கள் குறிப்புக்காகக் காட்டப்படுகின்றன.",
  },
};

const getFileNameOnly = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "Medical Report";
  return value.trim().split(/[\\/]/).pop() || "Medical Report";
};

export const StructuredReportSummaryCard: React.FC<StructuredReportSummaryCardProps> = ({
  document = {},
  reportDocuments,
  suggestedQuestions = [],
  isDark,
  theme,
  preferredLang = "english",
  onQuestionPress,
  onViewFullReport,
  readOnly = false,
}) => {
  const [normalExpanded, setNormalExpanded] = useState(false);
  const [localViewerOpen, setLocalViewerOpen] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<StructuredReportDocument | null>(null);

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

  const patient: PatientDetails = {
    name:
      document.patientDetails?.name ||
      document.patientName ||
      (document as any).patient_name ||
      null,
    reportDate:
      document.patientDetails?.reportDate ||
      document.reportDate ||
      (document as any).report_date ||
      null,
    doctorName:
      document.patientDetails?.doctorName ||
      document.doctorName ||
      (document as any).doctor_name ||
      null,
    hospitalName:
      document.patientDetails?.hospitalName ||
      document.hospitalName ||
      (document as any).hospital_name ||
      null,
    age:
      document.patientDetails?.age ||
      (document as any).patientAge ||
      (document as any).age ||
      null,
    gender:
      document.patientDetails?.gender ||
      (document as any).patientGender ||
      (document as any).gender ||
      null,
    uhid:
      document.patientDetails?.uhid ||
      (document as any).uhid ||
      (document as any).patientUhid ||
      null,
  };

  const abnormalResults: StructuredLabResult[] = useMemo(() => {
    if (Array.isArray(document.abnormalResults) && document.abnormalResults.length > 0) {
      return document.abnormalResults;
    }
    if (Array.isArray((document as any).abnormal_values) && (document as any).abnormal_values.length > 0) {
      return (document as any).abnormal_values;
    }
    if (Array.isArray((document as any).abnormalValues) && (document as any).abnormalValues.length > 0) {
      return (document as any).abnormalValues;
    }
    const allLabs = document.labFindings || [];
    return allLabs.filter((item) => item.isAbnormal);
  }, [document.abnormalResults, (document as any).abnormal_values, (document as any).abnormalValues, document.labFindings]);

  const normalResults: StructuredLabResult[] = useMemo(() => {
    if (Array.isArray(document.normalResults) && document.normalResults.length > 0) {
      return document.normalResults;
    }
    if (Array.isArray((document as any).normal_values) && (document as any).normal_values.length > 0) {
      return (document as any).normal_values;
    }
    if (Array.isArray((document as any).normalValues) && (document as any).normalValues.length > 0) {
      return (document as any).normalValues;
    }
    const allLabs = document.labFindings || [];
    return allLabs.filter((item) => !item.isAbnormal);
  }, [document.normalResults, (document as any).normal_values, (document as any).normalValues, document.labFindings]);

  const keyFindingsText = useMemo(() => {
    if (typeof document.keyFindings === "string" && document.keyFindings.trim()) {
      return document.keyFindings.trim();
    }
    if (typeof (document as any).key_findings === "string" && (document as any).key_findings.trim()) {
      return (document as any).key_findings.trim();
    }
    if (document.summary && document.summary.trim()) {
      return document.summary.trim();
    }
    if (abnormalResults.length > 0) {
      return `${abnormalResults.length} abnormal parameter(s) requiring attention detected.`;
    }
    return t.noAbnormalFound;
  }, [document.keyFindings, (document as any).key_findings, document.summary, abnormalResults, t.noAbnormalFound]);

  const patientAge = patient.age ? `${patient.age} yrs` : null;
  const patientGender = patient.gender ? String(patient.gender).toUpperCase() : null;

  const displayFileName = getFileNameOnly(
    document.fileName ||
      (document as any).report_name ||
      (document as any).reportName ||
      (document as any).name,
  );

  const displayDocType =
    document.documentType ||
    (document as any).document_type ||
    (document as any).reportType ||
    "LAB_REPORT";

  const displayReportDate =
    patient.reportDate ||
    document.reportDate ||
    (document as any).report_date;

  const hasPatientDetails = Boolean(
    patient.name ||
      patientAge ||
      patientGender ||
      patient.uhid ||
      patient.doctorName ||
      patient.hospitalName,
  );

  const handleViewFullReport = () => {
    if (onViewFullReport) {
      onViewFullReport(document);
      return;
    }
    setLocalViewerOpen(true);
  };

  if (reportDocuments && reportDocuments.length > 0) {
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
          <View style={styles.reportListHeader}>
            <View style={styles.reportListHeaderIcon}>
              <MaterialCommunityIcons
                name="file-document-multiple-outline"
                size={21}
                color={colors.primary}
              />
            </View>
            <View style={styles.reportListHeaderText}>
              <Text style={[styles.reportListTitle, { color: colors.textPrimary }]}>
                {t.reportSummary}
              </Text>
              <Text style={[styles.reportListSubtitle, { color: colors.textSecondary }]}>
                {reportDocuments.length}{" "}
                {reportDocuments.length === 1 ? t.report : t.reports}
                {"  ·  "}
                {reportDocuments.length}{" "}
                {reportDocuments.length === 1 ? t.document : t.documents}
              </Text>
            </View>
          </View>

          <Text style={[styles.reportListSectionTitle, { color: colors.textPrimary }]}>
            {t.reports}
          </Text>
          <Text style={[styles.reportListHint, { color: colors.textSecondary }]}>
            {t.tapToViewDetails}
          </Text>

          {reportDocuments.map((report, index) => {
            const reportType =
              report.documentType ||
              (report as any).reportType ||
              (report as any).report_type ||
              "Medical Report";
            const reportName = getFileNameOnly(
              report.fileName ||
                (report as any).report_name ||
                (report as any).reportName,
            );
            const reportDate =
              report.reportDate || (report as any).report_date || null;
            const accent = ["#5b4bff", "#10b981", "#f97316", "#64748b"][
              index % 4
            ];

            return (
              <TouchableOpacity
                key={report.id || `${reportName}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${reportName}, ${reportType}`}
                style={[
                  styles.reportListItem,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "#f8fafc",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : `${accent}45`,
                  },
                ]}
                onPress={() => setSelectedReport(report)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.reportListItemIcon,
                    { backgroundColor: `${accent}1a` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={21}
                    color={accent}
                  />
                </View>
                <View style={styles.reportListItemContent}>
                  <Text
                    style={[styles.reportListItemName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {reportType.replace(/_/g, " ")}
                  </Text>
                  <Text
                    style={[styles.reportListItemType, { color: accent }]}
                    numberOfLines={1}
                  >
                    {reportName}
                  </Text>
                  {reportDate ? (
                    <View style={styles.reportListDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text
                        style={[styles.reportListItemDate, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {formatDateOnly(reportDate, "dd MMM yyyy")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={19} color={accent} />
              </TouchableOpacity>
            );
          })}

        </View>

        <Modal
          visible={Boolean(selectedReport)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedReport(null)}
        >
          <View style={styles.reportModalBackdrop}>
            <View
              style={[
                styles.reportModalSheet,
                { backgroundColor: isDark ? "#111827" : "#ffffff" },
              ]}
            >
              <View style={styles.reportModalTopRow}>
                <View style={styles.reportModalHandle} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close report details"
                  onPress={() => setSelectedReport(null)}
                  style={styles.reportModalClose}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedReport ? (
                <ScrollView
                  style={styles.reportModalScroll}
                  contentContainerStyle={styles.reportModalContent}
                  showsVerticalScrollIndicator={false}
                >
                  <StructuredReportSummaryCard
                    document={selectedReport}
                    suggestedQuestions={suggestedQuestions}
                    isDark={isDark}
                    theme={theme}
                    preferredLang={preferredLang}
                    onQuestionPress={(question, report) =>
                      onQuestionPress?.(question, report || selectedReport || undefined)
                    }
                    onViewFullReport={
                      onViewFullReport
                        ? (report) => {
                            setSelectedReport(null);
                            onViewFullReport(report || selectedReport);
                          }
                        : undefined
                    }
                    readOnly={readOnly}
                  />
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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
                numberOfLines={2}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.1}
              >
                {displayFileName}
              </Text>
              <Text
                style={[styles.docTypeBadge, { color: colors.primary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.1}
              >
                {displayDocType}
                {displayReportDate ? ` • ${displayReportDate}` : ""}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.viewFullReport}
            style={[
              styles.viewReportBtn,
              {
                backgroundColor: isDark ? "rgba(91, 75, 255, 0.15)" : "#f0f4ff",
                borderColor: colors.primary,
              },
            ]}
            onPress={handleViewFullReport}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={[styles.viewReportBtnText, { color: colors.primary }]}>
              {t.viewFullReport}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Patient Details Card */}
        {hasPatientDetails && <View
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
            {patient.name && <View style={styles.patientGridItemFull}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{t.name}</Text>
              <Text
                style={[styles.gridValue, { color: colors.textPrimary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {patient.name}
              </Text>
            </View>}

            {patientAge && (
              <View style={styles.patientGridItem}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Age</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
                  {patientAge}
                </Text>
              </View>
            )}

            {patientGender && (
              <View style={styles.patientGridItem}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Gender</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
                  {patientGender}
                </Text>
              </View>
            )}

            {patient.uhid && (
              <View style={styles.patientGridItemFull}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{t.uhid}</Text>
                <Text
                  style={[styles.gridValue, { color: colors.textPrimary }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {patient.uhid}
                </Text>
              </View>
            )}

            {(patient.doctorName || patient.hospitalName) && (
              <View style={styles.patientGridItemFull}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Doctor / Clinic</Text>
                <Text
                  style={[styles.gridValue, { color: colors.textPrimary }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {[patient.doctorName, patient.hospitalName].filter(Boolean).join(" • ")}
                </Text>
              </View>
            )}
          </View>
        </View>}

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

        {/* Interactive Quick Question Chips */}
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
                  onPress={() => onQuestionPress && onQuestionPress(question, document)}
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
      <DocumentViewerModal
        visible={localViewerOpen}
        document={document}
        title={displayFileName}
        onClose={() => setLocalViewerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 6,
  },
  reportListHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(91, 75, 255, 0.08)",
    marginBottom: 16,
  },
  reportListHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91, 75, 255, 0.12)",
    marginRight: 10,
  },
  reportListHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  reportListTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  reportListSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  reportListSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
    marginHorizontal: 2,
  },
  reportListHint: {
    fontSize: 11,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  reportListItem: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 9,
  },
  reportListItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reportListItemContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  reportListItemName: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  reportListItemType: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  reportListItemDate: {
    fontSize: 10,
    marginLeft: 5,
    flexShrink: 1,
  },
  reportListDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  reportListFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 3,
  },
  reportListFooterText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 7,
  },
  reportModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  reportModalSheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
  },
  reportModalTopRow: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  reportModalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  reportModalClose: {
    position: "absolute",
    right: 14,
    top: 1,
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  reportModalScroll: {
    flexShrink: 1,
  },
  reportModalContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
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
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 0,
    minWidth: 0,
    marginBottom: 10,
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
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  docTypeBadge: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  viewReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
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
  patientGridItemFull: {
    width: "100%",
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
    flexShrink: 1,
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
    flex: 1,
    minWidth: 0,
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
    alignItems: "flex-start",
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
    flexShrink: 0,
    marginTop: 1,
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
