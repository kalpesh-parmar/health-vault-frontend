import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../../constants/theme";
import { StructuredReportDocument } from "./StructuredReportSummaryCard";

export interface ReportReferenceHeaderProps {
  document?: StructuredReportDocument;
  documents?: StructuredReportDocument[];
  isDark: boolean;
  theme?: any;
  preferredLang?: string;
  onPress?: () => void;
  onDismiss?: () => void;
  onRemoveDocument?: (docId: string) => void;
  onAddReport?: () => void;
}

export const ReportReferenceHeader: React.FC<ReportReferenceHeaderProps> = ({
  document,
  documents,
  isDark,
  theme,
  preferredLang: _preferredLang = "english",
  onPress,
  onDismiss,
  onRemoveDocument,
  onAddReport,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  const docList = documents && documents.length > 0 ? documents : document ? [document] : [];
  if (docList.length === 0) return null;

  const isMulti = docList.length > 1;
  const primaryDoc = docList[0];
  const fileName = primaryDoc.fileName || "Medical Report";
  const reportDate = primaryDoc.reportDate || primaryDoc.patientDetails?.reportDate || "";
  const abnormalCount =
    primaryDoc.abnormalResults?.length ??
    primaryDoc.labFindings?.filter((l) => l.isAbnormal).length ??
    0;

  if (collapsed) {
    return (
      <View style={styles.miniBannerContainer} testID="report-reference-header-mini">
        <TouchableOpacity
          style={[
            styles.miniBanner,
            {
              backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#cbd5e1",
            },
          ]}
          onPress={() => setCollapsed(false)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={14}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.miniBannerText, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {isMulti ? `${docList.length} Reports Selected` : fileName}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Multi-document chip banner
  if (isMulti) {
    return (
      <View style={styles.container} testID="report-reference-header-multi">
        <View
          style={[
            styles.multiCard,
            {
              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              borderColor: isDark ? "rgba(91, 75, 255, 0.3)" : "#c7d2fe",
            },
          ]}
        >
          <View style={styles.multiHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="file-multiple-outline"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.multiTitle, { color: colors.textPrimary }]}>
                {docList.length} Reports Active (Comparison Mode)
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {onAddReport && (
                <TouchableOpacity
                  onPress={onAddReport}
                  style={[styles.addBtn, { borderColor: colors.primary }]}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
                </TouchableOpacity>
              )}
              {onDismiss && (
                <TouchableOpacity onPress={onDismiss} style={{ marginLeft: 8 }}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {docList.map((d) => (
              <View
                key={d.id}
                style={[
                  styles.docChip,
                  {
                    backgroundColor: isDark ? "#334155" : "#e0e7ff",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#c7d2fe",
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {d.fileName || "Report"}
                </Text>
                {onRemoveDocument && (
                  <TouchableOpacity
                    onPress={() => d.id && onRemoveDocument(d.id)}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Single document banner
  return (
    <View style={styles.container} testID="report-reference-header">
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1e293b" : "#f8fafc",
            borderColor: isDark ? "rgba(91, 75, 255, 0.3)" : "#c7d2fe",
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.leftGroup}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? "rgba(91, 75, 255, 0.2)" : "#eff6ff",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.infoGroup}>
            <Text
              style={[styles.fileNameText, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {fileName}
            </Text>
            <View style={styles.metaRow}>
              {reportDate ? (
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {reportDate}
                </Text>
              ) : null}
              {abnormalCount > 0 ? (
                <View style={styles.abnormalBadge}>
                  <Text style={styles.abnormalBadgeText}>
                    {abnormalCount} Abnormal
                  </Text>
                </View>
              ) : (
                <View style={styles.normalBadge}>
                  <Text style={styles.normalBadgeText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionGroup}>
          {onAddReport && (
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: colors.primary, marginRight: 8 }]}
              onPress={onAddReport}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Compare</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setCollapsed(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {onDismiss && (
            <TouchableOpacity
              style={[styles.toggleBtn, { marginLeft: 8 }]}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  multiCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  multiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  multiTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipsScroll: {
    flexDirection: "row",
    gap: 8,
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoGroup: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    marginRight: 8,
  },
  abnormalBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  abnormalBadgeText: {
    color: "#dc2626",
    fontSize: 10,
    fontWeight: "700",
  },
  normalBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  normalBadgeText: {
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "600",
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleBtn: {
    padding: 4,
  },
  miniBannerContainer: {
    alignItems: "center",
    paddingVertical: 4,
    zIndex: 10,
  },
  miniBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  miniBannerText: {
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 160,
  },
});
