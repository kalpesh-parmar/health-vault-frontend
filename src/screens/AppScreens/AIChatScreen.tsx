import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Platform,
  View,
  KeyboardAvoidingView,
  FlatList,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

import { listDocument, sendChatMessage } from "../../services/documentService";
import BottomSheet from "../../components/shared/BottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { MedicalDocument } from "../../types";
import { safeFilter, safeMap } from "../../utils/arrayUtils";
import { LoadingScreen, ErrorScreen } from "../../components/shared/DefensiveStates";

// Reusable Redesigned Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { ChatInput } from "../../components/chat/ChatInput";
import { SuggestedQuestionChip } from "../../components/chat/SuggestedQuestionChip";
import { EmptyChatState } from "../../components/chat/EmptyChatState";

enum ChatMode {
  GENERAL_HEALTH = "GENERAL_HEALTH",
  DOCUMENT_RAG = "DOCUMENT_RAG",
}

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
  mode?: ChatMode;
  emergency?: boolean;
};

const AIChatScreen = () => {
  const navigation = useNavigation();
  const { isDark, theme } = useAppTheme();
  const [input, setInput] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const documentSheetRef = useRef<BottomSheetModal>(null);

  // Fetch all documents
  const { data: allDocsData, isLoading: isLoadingDocs, error: docsError, refetch: refetchDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: listDocument,
  });

  const documents = useMemo(() => {
    const rawData = allDocsData as any;
    const items = Array.isArray(rawData?.data?.items) ? rawData.data.items : [];
    return items as MedicalDocument[];
  }, [allDocsData]);

  // Filter documents to ensure they have an S3 key
  const documentsList = useMemo(() => {
    return safeFilter(documents, (doc: MedicalDocument) => !!doc?.s3Key);
  }, [documents]);

  const activeMode = selectedDocument ? ChatMode.DOCUMENT_RAG : ChatMode.GENERAL_HEALTH;

  // Clear messages when mode changes
  useEffect(() => {
    setMessages([]);
  }, [selectedDocument]);

  const handleSend = async (customText?: string) => {
    const textToSubmit = (customText || input).trim();
    if (!textToSubmit) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSubmit,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendChatMessage({
        documentKey: selectedDocument?.s3Key || undefined,
        question: textToSubmit,
      });

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: response.data?.reply || "No reply from AI",
        mode: response.data?.mode as ChatMode,
        emergency: !!response.data?.emergency,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Query Failed",
        text2: err.message || "An error occurred while calling the chatbot.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedDocument(null);
  };

  const hasEmergency = useMemo(() => {
    return messages.some((msg) => msg.emergency === true);
  }, [messages]);

  const generalSuggestedQuestions = [
    "What are symptoms of diabetes?",
    "Reduce cholesterol levels",
    "Healthy blood pressure diet",
    "General heart health advice",
  ];

  const documentSuggestedQuestions = [
    "Are there any abnormal values?",
    "What medications are prescribed?",
    "Explain the test results simply.",
    "Summarize this medical report.",
  ];

  const suggestedQuestions = activeMode === ChatMode.DOCUMENT_RAG
    ? documentSuggestedQuestions
    : generalSuggestedQuestions;

  // Reverse messages list for inverted rendering
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  if (isLoadingDocs) {
    return <LoadingScreen />;
  }

  if (docsError) {
    return (
      <ErrorScreen
        message={docsError instanceof Error ? docsError.message : String(docsError)}
        onRetry={() => {
          (refetchDocs as any)();
        }}
      />
    );
  }

  return (
    <Container>
      {/* Sticky Premium AI Header */}
      <ChatHeader
        onBack={() => navigation.goBack()}
        onNewChat={handleNewChat}
        isDark={isDark}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Document Selector bar */}
        <DocumentSelector onPress={() => documentSheetRef.current?.present()}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#0f766e" />
          <SelectorText numberOfLines={1}>
            {selectedDocument ? `Document: ${selectedDocument.fileName}` : "General Health Chat (No Document)"}
          </SelectorText>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </DocumentSelector>

        {/* Emergency Card Display */}
        {hasEmergency && (
          <EmergencyCard>
            <EmergencyTitleRow>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <EmergencyTitle>Seek immediate medical attention</EmergencyTitle>
            </EmergencyTitleRow>
            <EmergencyText>
              This may require urgent medical attention. Please contact emergency services or visit the nearest emergency department immediately.
            </EmergencyText>
          </EmergencyCard>
        )}

        {/* Messages List / Welcome Empty State */}
        <View style={styles.contentWrapper}>
          {messages.length === 0 ? (
            <EmptyChatState
              isDark={isDark}
              suggestedQuestions={suggestedQuestions}
              onPressQuestion={handleSend}
            />
          ) : (
            <FlatList
              data={reversedMessages}
              inverted
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} isDark={isDark} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Suggested Chips above input */}
        <SuggestedQuestionChip
          questions={suggestedQuestions}
          onPressQuestion={handleSend}
          isDark={isDark}
        />

        {/* Floating Input Capsule */}
        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={() => handleSend()}
          isSending={isSending}
          isDark={isDark}
        />
      </KeyboardAvoidingView>

      {/* Document Selector Bottom Sheet */}
      <BottomSheet ref={documentSheetRef} enablePanDownToClose={true}>
        <SheetContentWrapper>
          <BSTitle>Select Mode or Report</BSTitle>
          <BSSub>Choose general health mode or discuss a specific medical report</BSSub>
          <BSScrollView showsVerticalScrollIndicator={false}>
            <BSItem
              selected={selectedDocument === null}
              onPress={() => {
                setSelectedDocument(null);
                documentSheetRef.current?.dismiss();
              }}
              activeOpacity={0.7}
            >
              <BSIconBadge bgColor={selectedDocument === null ? "#ccfbf1" : "#f1f5f9"}>
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={selectedDocument === null ? "#0f766e" : "#64748b"}
                />
              </BSIconBadge>
              <BSLbl selected={selectedDocument === null}>General Health Chat (No Document)</BSLbl>
              {selectedDocument === null && <BSCheck>✓</BSCheck>}
            </BSItem>

            {documentsList.length === 0 ? (
              <EmptyDocumentsWrapper>
                <EmptyTitle>You haven't uploaded any medical reports yet.</EmptyTitle>
                <UploadButton
                  onPress={() => {
                    documentSheetRef.current?.dismiss();
                    (navigation as any).navigate("Home");
                  }}
                >
                  <UploadButtonText>Upload Medical Report</UploadButtonText>
                </UploadButton>
              </EmptyDocumentsWrapper>
            ) : (
              safeMap(documentsList, (doc: MedicalDocument) => (
                <BSItem
                  key={doc.id}
                  selected={selectedDocument?.id === doc.id}
                  onPress={() => {
                    setSelectedDocument(doc);
                    documentSheetRef.current?.dismiss();
                  }}
                  activeOpacity={0.7}
                >
                  <BSIconBadge bgColor={selectedDocument?.id === doc.id ? "#ccfbf1" : "#f1f5f9"}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={selectedDocument?.id === doc.id ? "#0f766e" : "#64748b"}
                    />
                  </BSIconBadge>
                  <BSLbl selected={selectedDocument?.id === doc.id}>{doc.fileName}</BSLbl>
                  {selectedDocument?.id === doc.id && <BSCheck>✓</BSCheck>}
                </BSItem>
              ))
            )}
          </BSScrollView>
        </SheetContentWrapper>
      </BottomSheet>
    </Container>
  );
};

export default AIChatScreen;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const DocumentSelector = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin: 12px 16px 8px;
  padding: 10px 14px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const SelectorText = styled.Text`
  flex: 1;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-left: 10px;
  margin-right: 10px;
`;

const EmergencyCard = styled.View`
  background-color: #fef2f2;
  border-width: 1.5px;
  border-color: #fca5a5;
  border-radius: 16px;
  padding: 12px 16px;
  margin: 4px 16px 8px;
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

const SheetContentWrapper = styled.View`
  padding: 20px;
  padding-bottom: 40px;
  width: 100%;
`;

const BSTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const BSSub = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-bottom: 15px;
`;

const BSScrollView = styled(ScrollView)`
  width: 100%;
  max-height: 350px;
`;

const BSItem = styled.TouchableOpacity<{ selected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 14px 0px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: any) => theme.colors.border};
`;

const BSIconBadge = styled.View<{ bgColor: string }>`
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background-color: ${({ bgColor }: { bgColor: string }) => bgColor};
  align-items: center;
  justify-content: center;
  margin-right: 13px;
`;

const BSLbl = styled.Text<{ selected: boolean }>`
  flex: 1;
  font-size: 14px;
  font-weight: ${({ selected }: { selected: boolean }) => (selected ? "700" : "600")};
  color: ${({ selected, theme }: { selected: boolean; theme: any }) =>
    selected ? "#0f766e" : theme.colors.textPrimary};
`;

const BSCheck = styled.Text`
  font-size: 15px;
  color: #0f766e;
  font-weight: 700;
`;

const EmptyDocumentsWrapper = styled.View`
  padding: 15px 5px;
`;

const EmptyTitle = styled.Text`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 16px;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #0f766e;
  padding: 12px;
  border-radius: 12px;
  align-items: center;
`;

const UploadButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
});
