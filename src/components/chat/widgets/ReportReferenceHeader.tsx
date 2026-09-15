import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../../constants/theme";
import { StructuredReportDocument } from "./StructuredReportSummaryCard";

export interface ReportReferenceHeaderProps {
  document: StructuredReportDocument;
  isDark: boolean;
  theme?: any;
  preferredLang?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

export const ReportReferenceHeader: React.FC<ReportReferenceHeaderProps> = ({
  document,
  isDark,
  theme,
  preferredLang: _preferredLang = "english",
  onPress,
  onDismiss,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  const fileName = document.fileName || "Medical Report";
  const reportDate = document.reportDate || document.patientDetails?.reportDate || "";
  const abnormalCount =
    document.abnormalResults?.length ??
    document.labFindings?.filter((l) => l.isAbnormal).length ??
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
            {fileName}
          </Text>
          {abnormalCount > 0 && (
            <View style={styles.badgeMini}>
              <Text style={styles.badgeMiniText}>{abnormalCount}</Text>
            </View>
          )}
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
  badgeMini: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  badgeMiniText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
});
