import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDocumentUpload } from "../../../context/DocumentUploadContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DocumentSummaryItem {
  id: string;
  fileKey?: string;
  jobId?: string;
  name?: string;
  fileName?: string;
  originalName?: string;
  displayName?: string;
  status?: string;
  stage?: string;
  reason?: string | null;
  error?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  medicineCount?: number;
  medicinesCount?: number;
  progress?: number;
  percentage?: number;
  batchId?: string;
}

export interface DocumentProgressSummaryContainerProps {
  documents?: DocumentSummaryItem[];
  preferredLang?: string;
  isDark?: boolean;
  theme?: any;
  onRetry?: (fileKey: string, batchId?: string) => Promise<void> | void;
  style?: any;
}

const I18N_SUMMARY: Record<string, Record<string, string>> = {
  english: {
    heading: "Document Upload Summary",
    completed: "Completed",
    rejected: "Rejected",
    failed: "Failed",
    processing: "Processing...",
    retry: "Retry",
    rejectionReason: "Rejection Reason",
    defaultRejection: "The uploaded file is not a medical document.",
    medicinesFound: "{count} medicine(s) extracted",
    noMedicines: "No medicines detected",
    files: "{count} file(s)",
  },
  gujarati: {
    heading: "દસ્તાવેજ અપલોડ સારાંશ",
    completed: "પૂર્ણ થયું",
    rejected: "અસ્વીકાર્યું",
    failed: "નિષ્ફળ",
    processing: "પ્રક્રિયા ચાલુ છે...",
    retry: "ફરી પ્રયાસ કરો",
    rejectionReason: "અસ્વીકારનું કારણ",
    defaultRejection: "અપલોડ કરેલી ફાઇલ તબીબી દસ્તાવેજ નથી.",
    medicinesFound: "{count} દવાઓ મળી",
    noMedicines: "કોઈ દવા મળી નથી",
    files: "{count} ફાઇલ(ઓ)",
  },
  hindi: {
    heading: "दस्तावेज़ अपलोड सारांश",
    completed: "पूर्ण",
    rejected: "अस्वीकृत",
    failed: "विफल",
    processing: "प्रक्रिया जारी है...",
    retry: "पुनः प्रयास करें",
    rejectionReason: "अस्वीकृति का कारण",
    defaultRejection: "अपलोड की गई फ़ाइल कोई मेडिकल दस्तावेज़ नहीं है।",
    medicinesFound: "{count} दवाएं प्राप्त हुईं",
    noMedicines: "कोई दवा नहीं मिली",
    files: "{count} फ़ाइलें",
  },
  marathi: {
    heading: "दस्तऐवज अपलोड सारांश",
    completed: "पूर्ण झाले",
    rejected: "नाकारले",
    failed: "अयशस्वी",
    processing: "प्रक्रिया सुरू आहे...",
    retry: "पुन्हा प्रयत्न करा",
    rejectionReason: "नाकारण्याचे कारण",
    defaultRejection: "अपलोड केलेली फाइल वैद्यकीय दस्तऐवज नाही.",
    medicinesFound: "{count} औषधे आढळली",
    noMedicines: "कोणतीही औषधे आढळली नाहीत",
    files: "{count} फाइल्स",
  },
  tamil: {
    heading: "ஆவணப் பதிவேற்ற சுருக்கம்",
    completed: "முடிந்தது",
    rejected: "நிராகரிக்கப்பட்டது",
    failed: "தோல்வியடைந்தது",
    processing: "செயலாக்கத்தில் உள்ளது...",
    retry: "மீண்டும் முயற்சிக்கவும்",
    rejectionReason: "நிராகரிப்பு காரணம்",
    defaultRejection: "பதிவேற்றப்பட்ட கோப்பு மருத்துவ ஆவணம் அல்ல.",
    medicinesFound: "{count} மருந்துகள் கண்டறியப்பட்டன",
    noMedicines: "மருந்துகள் எதுவும் கிடைக்கவில்லை",
    files: "{count} கோப்புகள்",
  },
};

export const DocumentProgressSummaryContainer: React.FC<DocumentProgressSummaryContainerProps> = ({
  documents,
  preferredLang = "english",
  isDark = false,
  theme,
  onRetry,
  style,
}) => {
  const docUpload = useDocumentUpload();
  const [expandedRejectionIds, setExpandedRejectionIds] = useState<Set<string>>(new Set());
  const [retryingDocKeys, setRetryingDocKeys] = useState<Set<string>>(new Set());

  const lang = preferredLang?.toLowerCase() || "english";
  const dict = I18N_SUMMARY[lang] || I18N_SUMMARY.english;

  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>) => {
      let str = dict[key] || I18N_SUMMARY.english[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [dict],
  );

  // Combine passed documents prop with DocumentUploadContext fallbacks
  const allDocs = useMemo<DocumentSummaryItem[]>(() => {
    if (documents !== undefined) {
      return documents;
    }
    if (docUpload?.uploadingDocs && docUpload.uploadingDocs.length > 0) {
      return docUpload.uploadingDocs;
    }
    if (docUpload?.completedBatch?.documents && docUpload.completedBatch.documents.length > 0) {
      return docUpload.completedBatch.documents;
    }
    if (docUpload?.chatWizardState?.filesInfo && docUpload.chatWizardState.filesInfo.length > 0) {
      return docUpload.chatWizardState.filesInfo.map((f, idx) => ({
        id: f.jobId || f.fileKey || `file-${idx}`,
        name: f.fileName,
        fileName: f.fileName,
        fileKey: f.fileKey,
        jobId: f.jobId,
        status: "COMPLETED",
      }));
    }
    return [];
  }, [documents, docUpload?.uploadingDocs, docUpload?.completedBatch?.documents, docUpload?.chatWizardState?.filesInfo]);

  if (allDocs.length === 0) {
    return null;
  }

  const toggleRejectionInfo = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRejectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRetryDocument = async (doc: DocumentSummaryItem) => {
    const key = doc.fileKey || doc.id || doc.jobId;
    if (!key) return;

    setRetryingDocKeys((prev) => new Set(prev).add(key));
    try {
      if (onRetry) {
        await onRetry(key, doc.batchId);
      } else if (docUpload?.retryDocument) {
        await docUpload.retryDocument(key, doc.batchId);
      }
    } catch (err) {
      console.error("[DocumentProgressSummaryContainer] Retry failed:", err);
    } finally {
      setRetryingDocKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
        },
        style,
      ]}
    >
      {/* Header Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.headerIconWrapper,
              { backgroundColor: isDark ? "rgba(15, 118, 110, 0.25)" : "#ccfbf1" },
            ]}
          >
            <Ionicons name="document-text" size={16} color="#0f766e" />
          </View>
          <Text style={[styles.headerTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
            {t("heading")}
          </Text>
        </View>
        <View style={styles.subHeaderRow}>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
            ]}
          >
            <Text style={[styles.countBadgeText, { color: isDark ? "#cbd5e1" : "#475569" }]}>
              {t("files", { count: allDocs.length })}
            </Text>
          </View>
        </View>
      </View>

      {/* Document Items List */}
      <View style={styles.docsList}>
        {allDocs.map((doc, index) => {
          const docId = doc.id || doc.fileKey || doc.jobId || `doc-${index}`;
          const rawStatus = (doc.status || doc.stage || "").toUpperCase();
          const isDone =
            rawStatus === "COMPLETED" ||
            rawStatus === "SUCCESS" ||
            rawStatus === "DONE" ||
            doc.progress === 100 ||
            doc.percentage === 100;
          const isRejected =
            rawStatus === "REJECTED" ||
            doc.errorCode === "NON_MEDICAL_DOCUMENT" ||
            (typeof doc.reason === "string" && doc.reason.toLowerCase().includes("reject"));
          const isFailed =
            (rawStatus === "FAILED" || rawStatus === "ERROR") && !isRejected;
          const isProcessing =
            !isDone && !isRejected && !isFailed;

          const fileName =
            doc.displayName ||
            doc.fileName ||
            doc.name ||
            doc.originalName ||
            `Document ${index + 1}`;

          const isPdf =
            fileName.toLowerCase().endsWith(".pdf") ||
            (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf"));

          const isRetrying = retryingDocKeys.has(doc.fileKey || docId);
          const isRejectionExpanded = expandedRejectionIds.has(docId);
          const isRetryable = doc.retryable !== false;
          const medCount = doc.medicineCount ?? doc.medicinesCount;

          return (
            <View
              key={docId}
              style={[
                styles.docItemCard,
                {
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#e2e8f0",
                  zIndex: isRejectionExpanded ? 1000 : 1,
                },
              ]}
            >
              <View style={styles.docRow}>
                {/* File Icon */}
                <View
                  style={[
                    styles.docIconBox,
                    {
                      backgroundColor: isRejected
                        ? isDark ? "#450a0a" : "#fee2e2"
                        : isFailed
                        ? isDark ? "#450a0a" : "#fef2f2"
                        : isDone
                        ? isDark ? "#064e3b" : "#ecfdf5"
                        : isDark ? "#1e293b" : "#eff6ff",
                    },
                  ]}
                >
                  <Ionicons
                    name={isPdf ? "document-text" : "image"}
                    size={18}
                    color={
                      isRejected || isFailed
                        ? "#ef4444"
                        : isDone
                        ? "#10b981"
                        : "#0f766e"
                    }
                  />
                </View>

                {/* File Details */}
                <View style={styles.docInfoCol}>
                  <Text
                    style={[
                      styles.docNameText,
                      { color: isDark ? "#f1f5f9" : "#1e293b" },
                    ]}
                    numberOfLines={1}
                  >
                    {fileName}
                  </Text>
                  <Text
                    style={[
                      styles.docSubText,
                      {
                        color: isRejected
                          ? "#ef4444"
                          : isFailed
                          ? "#ef4444"
                          : isDone
                          ? (isDark ? "#94a3b8" : "#64748b")
                          : "#0f766e",
                      },
                    ]}
                  >
                    {isRejected
                      ? t("rejected")
                      : isFailed
                      ? t("failed")
                      : isDone
                      ? typeof medCount === "number"
                        ? medCount > 0
                          ? t("medicinesFound", { count: medCount })
                          : t("noMedicines")
                        : t("completed")
                      : t("processing")}
                  </Text>
                </View>

                {/* Right Status / Action */}
                <View style={styles.docActionCol}>
                  {isDone && (
                    <View style={styles.statusBadgeCompleted}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>
                  )}

                  {isRejected && (
                    <View style={styles.rejectedActionRow}>
                      <View style={styles.statusBadgeRejected}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleRejectionInfo(docId)}
                        style={[
                          styles.infoButton,
                          {
                            backgroundColor: isDark
                              ? "rgba(56, 189, 248, 0.15)"
                              : "#e0f2fe",
                          },
                        ]}
                        activeOpacity={0.7}
                        accessibilityLabel="Toggle rejection details"
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="information-circle"
                          size={22}
                          color={isDark ? "#38bdf8" : "#0284c7"}
                        />
                      </TouchableOpacity>

                      {/* Tooltip Popover */}
                      {isRejectionExpanded && (
                        <View style={styles.tooltipContainer} pointerEvents="box-none">
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => toggleRejectionInfo(docId)}
                            style={[
                              styles.tooltipBubble,
                              { backgroundColor: isDark ? "#1e293b" : "#334155" },
                            ]}
                          >
                            <Text style={styles.tooltipText}>
                              {doc.reason || doc.error || t("defaultRejection")}
                            </Text>
                          </TouchableOpacity>
                          <View
                            style={[
                              styles.tooltipArrow,
                              { borderTopColor: isDark ? "#1e293b" : "#334155" },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {isFailed && (
                    <View style={styles.failedActionRow}>
                      {isRetryable ? (
                        <TouchableOpacity
                          disabled={isRetrying}
                          onPress={() => handleRetryDocument(doc)}
                          style={[
                            styles.retryBtn,
                            {
                              backgroundColor: isRetrying
                                ? "#94a3b8"
                                : (theme?.colors?.primary || "#0f766e"),
                            },
                          ]}
                          accessibilityLabel="Retry document processing"
                          accessibilityRole="button"
                        >
                          {isRetrying ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons
                                name="refresh"
                                size={12}
                                color="#ffffff"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.retryBtnText}>{t("retry")}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.statusBadgeRejected}>
                          <Ionicons name="alert-circle" size={18} color="#ef4444" />
                        </View>
                      )}
                    </View>
                  )}

                  {isProcessing && (
                    <View style={styles.processingIndicator}>
                      <ActivityIndicator
                        size="small"
                        color={theme?.colors?.primary || "#0f766e"}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    width: "100%",
  },
  headerContainer: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  docsList: {
    gap: 8,
  },
  docItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  docInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  docNameText: {
    fontSize: 13,
    fontWeight: "600",
  },
  docSubText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  docActionCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeCompleted: {
    padding: 2,
  },
  rejectedActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  statusBadgeRejected: {
    padding: 2,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipContainer: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 6,
    alignItems: "flex-end",
    zIndex: 9999,
    elevation: 20,
    maxWidth: 240,
    minWidth: 160,
  },
  tooltipBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  tooltipText: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginRight: 10,
  },
  failedActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  processingIndicator: {
    padding: 4,
  },
});
export default DocumentProgressSummaryContainer;
