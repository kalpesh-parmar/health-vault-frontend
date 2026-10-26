import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LIGHT_THEME, DARK_THEME } from "../../constants/theme";
import { MedicalDocument } from "../../types";

export interface DocumentSelectionModalProps {
  visible: boolean;
  documents: MedicalDocument[];
  selectedDocumentIds: string[];
  isDark: boolean;
  theme?: any;
  onClose: () => void;
  onConfirm: (selectedDocs: MedicalDocument[]) => void;
}

export const DocumentSelectionModal: React.FC<DocumentSelectionModalProps> = ({
  visible,
  documents,
  selectedDocumentIds,
  isDark,
  theme,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedDocumentIds || []);

  const activeTheme = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const colors = activeTheme.colors;

  const toggleSelect = (docId: string) => {
    setSelectedIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  const handleConfirm = () => {
    const selected = documents.filter((d) => selectedIds.includes(d.id));
    onConfirm(selected);
    onClose();
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);
    const dateStr = item.reportDate
      ? new Date(item.reportDate).toLocaleDateString()
      : item.createdAt
        ? new Date(item.createdAt).toLocaleDateString()
        : "";

    return (
      <TouchableOpacity
        style={[
          styles.docRow,
          {
            backgroundColor: isDark ? "#1e293b" : "#f8fafc",
            borderColor: isSelected
              ? colors.primary
              : isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "#e2e8f0",
          },
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="file-document-outline"
          size={24}
          color={isSelected ? colors.primary : colors.textSecondary}
          style={{ marginRight: 12 }}
        />
        <View style={styles.docInfo}>
          <Text
            style={[styles.docName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.fileName || "Medical Report"}
          </Text>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {item.hospitalName ? `${item.hospitalName} • ` : ""}
            {item.documentType ? `${item.documentType} • ` : ""}
            {dateStr}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={22}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Select Medical Reports
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose reports for AI question answering
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.textSecondary }}>No reports available</Text>
              </View>
            }
          />

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: isDark ? "#334155" : "#cbd5e1" }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>
                Confirm ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "80%",
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  listContent: {
    paddingVertical: 8,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  docInfo: {
    flex: 1,
    marginRight: 8,
  },
  docName: {
    fontSize: 14,
    fontWeight: "600",
  },
  docMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
