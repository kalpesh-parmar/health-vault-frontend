import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { I18N_CHAT_UI } from "../ChatDateUtils";

export interface MedicalDocumentItem {
  id: string | number;
  fileName?: string;
  name?: string;
  documentType?: string;
  category?: string;
  uploadedAt?: string | Date;
  createdAt?: string | Date;
  fileKey?: string;
  s3Key?: string;
}

interface ChatDocumentPickerModalProps {
  visible: boolean;
  documents: MedicalDocumentItem[];
  selectedDocumentId?: string | number | null;
  onSelectDocument: (doc: MedicalDocumentItem | null) => void;
  onClose: () => void;
  onUploadNew?: () => void;
  isLoading?: boolean;
  preferredLang?: string;
  isDark?: boolean;
}

export const ChatDocumentPickerModal: React.FC<ChatDocumentPickerModalProps> = ({
  visible,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onClose,
  onUploadNew,
  isLoading = false,
  preferredLang = "english",
  isDark = false,
}) => {
  const lang = preferredLang || "english";
  const t = (key: string) =>
    I18N_CHAT_UI[lang]?.[key] || I18N_CHAT_UI.english[key] || key;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="chat-document-picker-modal"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? "#1e293b" : "#ffffff" },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? "#f8fafc" : "#0f172a" },
                ]}
              >
                {t("selectModeOrReport")}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                {t("chooseGeneralOrDiscuss")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Ionicons
                name="close"
                size={22}
                color={isDark ? "#cbd5e1" : "#475569"}
              />
            </TouchableOpacity>
          </View>

          {/* General Health Option (No Document) */}
          <TouchableOpacity
            onPress={() => {
              onSelectDocument(null);
              onClose();
            }}
            style={[
              styles.generalOption,
              !selectedDocumentId && styles.selectedOption,
              {
                backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
                borderColor: !selectedDocumentId
                  ? "#0f766e"
                  : isDark
                    ? "#334155"
                    : "#e2e8f0",
              },
            ]}
          >
            <View style={styles.optionRow}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color="#0f766e"
              />
              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: isDark ? "#f8fafc" : "#0f172a" },
                  ]}
                >
                  {t("generalHealthChatNoDoc")}
                </Text>
              </View>
              {!selectedDocumentId && (
                <Ionicons name="checkmark-circle" size={20} color="#0f766e" />
              )}
            </View>
          </TouchableOpacity>

          {/* Documents List */}
          {isLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color="#0f766e" />
            </View>
          ) : documents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                {t("noReportsUploaded")}
              </Text>
              {onUploadNew && (
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => {
                    onClose();
                    onUploadNew();
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                  <Text style={styles.uploadBtnText}>
                    {t("uploadMedicalReport")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={documents}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = String(item.id) === String(selectedDocumentId);
                const title = item.fileName || item.name || "Medical Document";
                const docType = item.documentType || item.category || "Report";

                return (
                  <TouchableOpacity
                    onPress={() => {
                      onSelectDocument(item);
                      onClose();
                    }}
                    style={[
                      styles.docCard,
                      isSelected && styles.selectedOption,
                      {
                        backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                        borderColor: isSelected
                          ? "#0f766e"
                          : isDark
                            ? "#334155"
                            : "#e2e8f0",
                      },
                    ]}
                  >
                    <View style={styles.docRow}>
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color={isSelected ? "#0f766e" : "#64748b"}
                      />
                      <View style={styles.docTextContainer}>
                        <Text
                          style={[
                            styles.docTitle,
                            { color: isDark ? "#f8fafc" : "#0f172a" },
                          ]}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        <Text style={styles.docSubtitle}>{docType}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#0f766e"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ChatDocumentPickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  generalOption: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  selectedOption: {
    borderWidth: 1.5,
    borderColor: "#0f766e",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  docCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  docSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  centerLoading: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
