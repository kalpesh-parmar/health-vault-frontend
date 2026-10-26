import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../constants/theme";
import { MedicalDocument } from "../../types";

export interface DocumentMentionDropdownProps {
  visible: boolean;
  query: string;
  documents: MedicalDocument[];
  isLoading?: boolean;
  isDark: boolean;
  theme?: any;
  onSelectDocument: (doc: MedicalDocument) => void;
  onClose?: () => void;
}

export const DocumentMentionDropdown: React.FC<DocumentMentionDropdownProps> = ({
  visible,
  query = "",
  documents = [],
  isLoading = false,
  isDark,
  theme,
  onSelectDocument,
  onClose,
}) => {
  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  // Filter documents based on the active query following "@"
  const filteredDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    const cleanQuery = (query || "").trim().toLowerCase();
    if (!cleanQuery) return documents;

    return documents.filter((doc) => {
      const fileName = (doc.fileName || doc.report_name || doc.name || "").toLowerCase();
      const docType = (doc.documentType || "").toLowerCase();
      const hospital = (doc.hospitalName || "").toLowerCase();
      const doctor = (doc.doctorName || "").toLowerCase();
      return (
        fileName.includes(cleanQuery) ||
        docType.includes(cleanQuery) ||
        hospital.includes(cleanQuery) ||
        doctor.includes(cleanQuery)
      );
    });
  }, [documents, query]);

  if (!visible) return null;

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const getDocTypeIcon = (type?: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("PRESCRIPTION")) return "medkit-outline";
    if (t.includes("DISCHARGE")) return "bed-outline";
    if (t.includes("INVOICE") || t.includes("BILL")) return "receipt-outline";
    return "document-text-outline";
  };

  const renderItem = ({ item }: { item: MedicalDocument }) => {
    const title = item.fileName || item.report_name || item.name || "Medical Report";
    const dateStr = formatDate(item.reportDate || item.createdAt);
    const docType = (item.documentType || "LAB_REPORT").replace(/_/g, " ");

    return (
      <TouchableOpacity
        style={[
          styles.itemRow,
          {
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(100, 116, 139, 0.08)",
          },
        ]}
        activeOpacity={0.7}
        onPress={() => onSelectDocument(item)}
        accessibilityRole="button"
        accessibilityLabel={`Mention ${title}`}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark
                ? "rgba(99, 102, 241, 0.18)"
                : "rgba(99, 102, 241, 0.1)",
            },
          ]}
        >
          <Ionicons
            name={getDocTypeIcon(item.documentType)}
            size={18}
            color={colors.primary || "#6366f1"}
          />
        </View>

        <View style={styles.itemTextContainer}>
          <Text
            style={[styles.itemTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {title}
          </Text>
          <View style={styles.itemMetaRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(100, 116, 139, 0.1)",
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isDark ? "#cbd5e1" : "#475569" },
                ]}
              >
                {docType}
              </Text>
            </View>

            {dateStr ? (
              <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                {dateStr}
              </Text>
            ) : null}

            {item.hospitalName ? (
              <Text
                style={[styles.itemHospital, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                • {item.hospitalName}
              </Text>
            ) : null}
          </View>
        </View>

        <Ionicons
          name="add-circle-outline"
          size={18}
          color={colors.primary || "#6366f1"}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.dropdownContainer,
        {
          backgroundColor: isDark ? "#1e1b4b" : "#ffffff",
          borderColor: isDark
            ? "rgba(99, 102, 241, 0.3)"
            : "rgba(99, 102, 241, 0.2)",
        },
      ]}
      testID="document-mention-dropdown"
    >
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(100, 116, 139, 0.1)",
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="at-circle"
            size={16}
            color={colors.primary || "#6366f1"}
          />
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? "#e2e8f0" : "#334155" },
            ]}
          >
            Mention Medical Report
          </Text>
          {query.trim().length > 0 ? (
            <Text
              style={[styles.queryTag, { color: colors.primary || "#6366f1" }]}
            >
              "{query.trim()}"
            </Text>
          ) : null}
        </View>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close"
              size={18}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.primary || "#6366f1"} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading reports...
          </Text>
        </View>
      ) : filteredDocuments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="document-outline"
            size={24}
            color={isDark ? "#64748b" : "#94a3b8"}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {query.trim()
              ? `No reports matching "${query.trim()}"`
              : "No uploaded reports found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          keyExtractor={(item, index) => item.id || `doc-${index}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={true}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    maxHeight: 220,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  queryTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  itemDate: {
    fontSize: 11,
  },
  itemHospital: {
    fontSize: 11,
    flexShrink: 1,
  },
  centerContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 12,
  },
});
