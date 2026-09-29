import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  NormalizedReportItem,
  ReportListPagination,
} from "../../../utils/reportListNormalizer";
import { formatUTCDateTime } from "../../../utils/dateFormatter";

export const formatReportTypeLabel = (type: string | undefined | null): string => {
  if (!type) return "Document";
  const normalized = type.toLowerCase().replace(/_/g, " ").trim();
  const map: Record<string, string> = {
    "discharge summary": "Discharge Summary",
    "lab report": "Lab Report",
    "prescription": "Prescription",
    "imaging report": "Imaging Report",
    "consultation report": "Consultation Report",
    "surgery report": "Surgery Report",
    "surgery procedure report": "Surgery Report",
    "vaccination record": "Vaccination Record",
    "vaccination report": "Vaccination Report",
    "medical certificate": "Medical Certificate",
    "invoice": "Invoice",
    "bill": "Bill",
    "insurance": "Insurance",
    "medical document": "Medical Document",
    "other": "Other",
  };
  if (map[normalized]) return map[normalized];
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export interface StructuredReportListCardProps {
  reports: NormalizedReportItem[];
  pagination?: ReportListPagination;
  isDark: boolean;
  theme: any;
  preferredLang?: string;
  onViewAllReports?: () => void;
  onViewReport?: (report: NormalizedReportItem) => void;
  onUploadReport?: () => void;
  readOnly?: boolean;
}

export const I18N_REPORT_LIST_CARD: Record<string, Record<string, string>> = {
  english: {
    cardTitle: "Your Medical Documents",
    emptyTitle: "No Documents Found",
    emptySubtitle: "There are currently no medical documents uploaded in your health vault.",
    uploadDocument: "Upload Document",
    viewAllInVault: "Manage in Health Vault",
    viewAllCount: "View All ({count}) Documents",
    date: "Date",
    type: "Type",
    status: "Status",
    viewReport: "View Report",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
    documentsCount: "Documents",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
  },
  hindi: {
    cardTitle: "आपके मेडिकल दस्तावेज़",
    emptyTitle: "कोई दस्तावेज़ नहीं मिला",
    emptySubtitle: "वर्तमान में आपके स्वास्थ्य वॉल्ट में कोई मेडिकल दस्तावेज़ अपलोड नहीं है।",
    uploadDocument: "दस्तावेज़ अपलोड करें",
    viewAllInVault: "हेल्थ वॉल्ट में प्रबंधित करें",
    viewAllCount: "सभी ({count}) दस्तावेज़ देखें",
    date: "तारीख",
    type: "प्रकार",
    status: "स्थिति",
    viewReport: "दस्तावेज़ देखें",
    completed: "पूर्ण",
    processing: "प्रक्रिया जारी",
    failed: "विफल",
    documentsCount: "दस्तावेज़",
    page: "पेज",
    of: "का",
    previous: "पिछला",
    next: "अगला",
  },
  gujarati: {
    cardTitle: "તમારા મેડિકલ દસ્તાવેજો",
    emptyTitle: "કોઈ દસ્તાવેજ મળ્યા નથી",
    emptySubtitle: "હાલમાં તમારા હેલ્થ વૉલ્ટમાં કોઈ મેડિકલ દસ્તાવેજ અપલોડ કરેલ નથી.",
    uploadDocument: "દસ્તાવેજ અપલોડ કરો",
    viewAllInVault: "હેલ્થ વૉલ્ટમાં સંચાલન કરો",
    viewAllCount: "બધા ({count}) દસ્તાવેજો જુઓ",
    date: "તારીખ",
    type: "પ્રકાર",
    status: "સ્થિતિ",
    viewReport: "દસ્તાવેજ જુઓ",
    completed: "પૂર્ણ",
    processing: "પ્રક્રિયા ચાલુ",
    failed: "નિષ્ફળ",
    documentsCount: "દસ્તાવેજો",
    page: "પેજ",
    of: "માંથી",
    previous: "પાછલું",
    next: "આગલું",
  },
  marathi: {
    cardTitle: "तुमची वैद्यकीय कागदपत्रे",
    emptyTitle: "कागदपत्रे आढळली नाहीत",
    emptySubtitle: "सध्या तुमच्या हेल्थ वॉल्टमध्ये कोणतीही वैद्यकीय कागदपत्रे अपलोड केलेली नाहीत.",
    uploadDocument: "कागदपत्र अपलोड करा",
    viewAllInVault: "हेल्थ वॉल्टमध्ये व्यवस्थापित करा",
    viewAllCount: "सर्व ({count}) कागदपत्रे पहा",
    date: "दिनांक",
    type: "प्रकार",
    status: "स्थिती",
    viewReport: "कागदपत्र पहा",
    completed: "पूर्ण",
    processing: "प्रक्रिया सुरू",
    failed: "अयशस्वी",
    documentsCount: "कागदपत्रे",
    page: "पान",
    of: "पैकी",
    previous: "मागे",
    next: "पुढे",
  },
  tamil: {
    cardTitle: "உங்கள் மருத்துவ ஆவணங்கள்",
    emptyTitle: "ஆவணங்கள் எதுவும் காணப்படவில்லை",
    emptySubtitle: "தற்போது உங்கள் ஹெல்த் வால்ட்டில் மருத்துவ ஆவணங்கள் எதுவும் பதிவேற்றப்படவில்லை.",
    uploadDocument: "ஆவணத்தைப் பதிவேற்றவும்",
    viewAllInVault: "ஹெல்த் வால்ட்டில் நிர்வகிக்கவும்",
    viewAllCount: "அனைத்து ({count}) ஆவணங்களையும் பார்க்கவும்",
    date: "தேதி",
    type: "வகை",
    status: "நிலை",
    viewReport: "ஆவணத்தைப் பார்க்கவும்",
    completed: "முடிந்தது",
    processing: "செயலாக்கத்தில் உள்ளது",
    failed: "தோல்வியடைந்தது",
    documentsCount: "ஆவணங்கள்",
    page: "பக்கம்",
    of: "/",
    previous: "முந்தைய",
    next: "அடுத்த",
  },
};

const getDocTypeColor = (type: string, isDark: boolean) => {
  const norm = (type || "").toUpperCase();
  if (norm.includes("DISCHARGE")) {
    return {
      bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
      text: isDark ? "#34d399" : "#059669",
      border: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
      icon: "file-certificate-outline",
    };
  }
  if (norm.includes("LAB") || norm.includes("TEST")) {
    return {
      bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
      text: isDark ? "#60a5fa" : "#2563eb",
      border: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
      icon: "flask-outline",
    };
  }
  if (norm.includes("PRESCRIPTION")) {
    return {
      bg: isDark ? "rgba(168, 85, 247, 0.15)" : "#faf5ff",
      text: isDark ? "#c084fc" : "#9333ea",
      border: isDark ? "rgba(168, 85, 247, 0.3)" : "#e9d5ff",
      icon: "pill",
    };
  }
  if (norm.includes("INVOICE") || norm.includes("BILL")) {
    return {
      bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
      text: isDark ? "#fbbf24" : "#d97706",
      border: isDark ? "rgba(245, 158, 11, 0.3)" : "#fde68a",
      icon: "receipt-outline",
    };
  }
  return {
    bg: isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff",
    text: isDark ? "#818cf8" : "#4f46e5",
    border: isDark ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe",
    icon: "document-text-outline",
  };
};

const getFileIcon = (fileName?: string, fileType?: string) => {
  const normExt = (fileName || "").split(".").pop()?.toLowerCase() || "";
  const normMime = (fileType || "").toLowerCase();

  if (normExt === "pdf" || normMime.includes("pdf")) {
    return {
      name: "file-pdf-box" as const,
      color: "#ef4444",
      type: "material-community" as const,
    };
  }
  if (
    ["jpg", "jpeg", "png", "webp"].includes(normExt) ||
    normMime.includes("image")
  ) {
    return {
      name: "image" as const,
      color: "#0284c7",
      type: "ionicons" as const,
    };
  }
  return {
    name: "document-text" as const,
    color: "#6366f1",
    type: "ionicons" as const,
  };
};

const PAGE_SIZE = 5;

export const StructuredReportListCard: React.FC<StructuredReportListCardProps> = ({
  reports = [],
  pagination,
  isDark,
  theme,
  preferredLang = "english",
  onViewAllReports,
  onViewReport,
  onUploadReport,
  readOnly = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const langKey =
    preferredLang === "hi" || preferredLang === "hindi"
      ? "hindi"
      : preferredLang === "gu" || preferredLang === "gujarati"
      ? "gujarati"
      : preferredLang === "mr" || preferredLang === "marathi"
      ? "marathi"
      : preferredLang === "ta" || preferredLang === "tamil"
      ? "tamil"
      : "english";

  const t = I18N_REPORT_LIST_CARD[langKey] || I18N_REPORT_LIST_CARD.english;

  const totalCount =
    pagination?.totalRecords !== undefined
      ? pagination.totalRecords
      : reports.length;

  const totalPages = Math.ceil(reports.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, reports.length);
  const displayList = reports.slice(startIndex, endIndex);

  const containerBg = isDark ? "#1e293b" : "#ffffff";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const titleColor = isDark ? "#f8fafc" : "#0f172a";
  const subtextColor = isDark ? "#94a3b8" : "#64748b";
  const itemBg = isDark ? "#0f172a" : "#f8fafc";
  const itemBorder = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <View style={[styles.card, { backgroundColor: containerBg, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View
            style={[
              styles.headerIconWrapper,
              { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#e0e7ff" },
            ]}
          >
            <Ionicons
              name="folder-open-outline"
              size={18}
              color={isDark ? "#818cf8" : "#4f46e5"}
            />
          </View>
          <Text style={[styles.headerTitle, { color: titleColor }]}>
            {t.cardTitle}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(99, 102, 241, 0.2)"
                : "rgba(99, 102, 241, 0.1)",
              borderColor: isDark ? "#4f46e5" : "#c7d2fe",
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: isDark ? "#a5b4fc" : "#4f46e5" }]}>
            {totalCount} {t.documentsCount}
          </Text>
        </View>
      </View>

      {/* Empty State */}
      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color={subtextColor}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.emptyTitle, { color: titleColor }]}>
            {t.emptyTitle}
          </Text>
          <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
            {t.emptySubtitle}
          </Text>
        </View>
      ) : (
        /* Document Cards List */
        <View style={styles.listContainer}>
          {displayList.map((doc, idx) => {
            const fileIconInfo = getFileIcon(doc.fileName, doc.fileType);
            const docTypeInfo = getDocTypeColor(doc.documentType, isDark);
            const formattedDate = doc.reportDate
              ? formatUTCDateTime(doc.reportDate, "dd-MMM-yyyy", true)
              : null;

            const isCompleted =
              (doc.ocrStatus || "").toLowerCase() === "completed";

            return (
              <TouchableOpacity
                key={doc.id || `doc-${startIndex + idx}`}
                style={[
                  styles.itemCard,
                  { backgroundColor: itemBg, borderColor: itemBorder },
                ]}
                activeOpacity={0.75}
                onPress={() => onViewReport?.(doc)}
                disabled={readOnly}
              >
                {/* File Icon Column */}
                <View
                  style={[
                    styles.fileIconBox,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.05)"
                        : "#f1f5f9",
                    },
                  ]}
                >
                  {fileIconInfo.type === "material-community" ? (
                    <MaterialCommunityIcons
                      name={fileIconInfo.name as any}
                      size={24}
                      color={fileIconInfo.color}
                    />
                  ) : (
                    <Ionicons
                      name={fileIconInfo.name as any}
                      size={24}
                      color={fileIconInfo.color}
                    />
                  )}
                </View>

                {/* Document Details Column */}
                <View style={styles.itemContent}>
                  {/* File Name & View Arrow */}
                  <View style={styles.itemHeaderRow}>
                    <Text
                      style={[styles.fileNameText, { color: titleColor }]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {doc.fileName || `Document ${startIndex + idx + 1}`}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={subtextColor}
                    />
                  </View>

                  {/* Document Type Chip & Status */}
                  <View style={styles.tagsRow}>
                    <View
                      style={[
                        styles.docTypeChip,
                        {
                          backgroundColor: docTypeInfo.bg,
                          borderColor: docTypeInfo.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.docTypeChipText,
                          { color: docTypeInfo.text },
                        ]}
                      >
                        {formatReportTypeLabel(doc.documentType)}
                      </Text>
                    </View>

                    {isCompleted && (
                      <View style={styles.statusChip}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#10b981"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.statusText}>{t.completed}</Text>
                      </View>
                    )}
                  </View>

                  {/* Date Metadata */}
                  {formattedDate && (
                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={subtextColor}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.dateText, { color: subtextColor }]}>
                        {formattedDate}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={[styles.paginationContainer, { borderTopColor: itemBorder }]}>
              <TouchableOpacity
                style={[
                  styles.pageNavBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#f1f5f9",
                    borderColor: isDark ? "#475569" : "#e2e8f0",
                    opacity: safeCurrentPage === 1 ? 0.4 : 1,
                  },
                ]}
                disabled={safeCurrentPage === 1}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                activeOpacity={0.7}
                accessibilityLabel="Previous documents"
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={isDark ? "#f8fafc" : "#1e293b"}
                />
                <Text style={[styles.pageNavBtnText, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
                  {t.previous}
                </Text>
              </TouchableOpacity>

              <View style={styles.pageInfoWrapper}>
                <Text style={[styles.paginationInfoText, { color: titleColor }]}>
                  {safeCurrentPage} / {totalPages}
                </Text>
                <Text style={[styles.paginationSubText, { color: subtextColor }]}>
                  {startIndex + 1}–{endIndex} {t.of} {reports.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.pageNavBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#f1f5f9",
                    borderColor: isDark ? "#475569" : "#e2e8f0",
                    opacity: safeCurrentPage === totalPages ? 0.4 : 1,
                  },
                ]}
                disabled={safeCurrentPage === totalPages}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                activeOpacity={0.7}
                accessibilityLabel="Next documents"
              >
                <Text style={[styles.pageNavBtnText, { color: isDark ? "#f8fafc" : "#1e293b" }]}>
                  {t.next}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isDark ? "#f8fafc" : "#1e293b"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Action Footer - Only One Button "Manage in Health Vault" */}
      {!readOnly && onViewAllReports && (
        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme?.colors?.primary || "#4f46e5" },
            ]}
            onPress={onViewAllReports}
            activeOpacity={0.8}
          >
            <Ionicons
              name="folder-outline"
              size={16}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.primaryBtnText}>{t.viewAllInVault}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 6,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  listContainer: {
    gap: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 6,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 6,
  },
  docTypeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  docTypeChipText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#10b981",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
  },
  pageNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pageInfoWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  paginationInfoText: {
    fontSize: 12,
    fontWeight: "700",
  },
  paginationSubText: {
    fontSize: 10,
    marginTop: 1,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});
