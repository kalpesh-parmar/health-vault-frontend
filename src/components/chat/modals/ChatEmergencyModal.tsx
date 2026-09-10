import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styled from "styled-components/native";
import { I18N_CHAT_UI } from "../ChatDateUtils";

interface ChatEmergencyBannerProps {
  visible?: boolean;
  preferredLang?: string;
  title?: string;
  warningMessage?: string;
}

export const ChatEmergencyBanner: React.FC<ChatEmergencyBannerProps> = ({
  visible = true,
  preferredLang = "english",
  title,
  warningMessage,
}) => {
  if (!visible) return null;

  const lang = preferredLang || "english";
  const displayTitle =
    title ||
    I18N_CHAT_UI[lang]?.seekImmediateAttention ||
    I18N_CHAT_UI.english.seekImmediateAttention;
  const displayText =
    warningMessage ||
    I18N_CHAT_UI[lang]?.emergencyWarning ||
    I18N_CHAT_UI.english.emergencyWarning;

  return (
    <EmergencyCard testID="chat-emergency-banner">
      <EmergencyTitleRow>
        <Ionicons name="warning" size={20} color="#dc2626" />
        <EmergencyTitle>{displayTitle}</EmergencyTitle>
      </EmergencyTitleRow>
      <EmergencyText>{displayText}</EmergencyText>
    </EmergencyCard>
  );
};

interface ChatEmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  preferredLang?: string;
  title?: string;
  warningMessage?: string;
}

export const ChatEmergencyModal: React.FC<ChatEmergencyModalProps> = ({
  visible,
  onClose,
  preferredLang = "english",
  title,
  warningMessage,
}) => {
  const lang = preferredLang || "english";
  const displayTitle =
    title ||
    I18N_CHAT_UI[lang]?.seekImmediateAttention ||
    I18N_CHAT_UI.english.seekImmediateAttention;
  const displayText =
    warningMessage ||
    I18N_CHAT_UI[lang]?.emergencyWarning ||
    I18N_CHAT_UI.english.emergencyWarning;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      testID="chat-emergency-modal"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="warning" size={28} color="#dc2626" />
            <Text style={styles.modalTitle}>{displayTitle}</Text>
          </View>
          <Text style={styles.modalMessage}>{displayText}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.modalButtonText}>Acknowledge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ChatEmergencyBanner;

const EmergencyCard = styled.View`
  background-color: #fef2f2;
  border-width: 1.5px;
  border-color: #fca5a5;
  border-radius: 16px;
  padding: 12px 16px;
  margin: 4px 10px 8px;
`;

const EmergencyTitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 4px;
`;

const EmergencyTitle = styled.Text`
  color: #991b1b;
  font-size: 14px;
  font-weight: 800;
  margin-left: 8px;
`;

const EmergencyText = styled.Text`
  color: #7f1d1d;
  font-size: 12.5px;
  line-height: 17px;
  font-weight: 600;
`;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991b1b",
    marginLeft: 10,
    flex: 1,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
