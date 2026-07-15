import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import {
  ErrorScreen,
  LoadingScreen,
} from "../../components/shared/DefensiveStates";
import { listDocument, sendChatMessage } from "../../services/documentService";
import { getUser } from "../../services/userService";
import type { MedicalDocument } from "../../types";
import { safeFilter, safeMap } from "../../utils/arrayUtils";

// Reusable Redesigned Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { ChatInput } from "../../components/chat/ChatInput";
import { EmptyChatState } from "../../components/chat/EmptyChatState";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { SuggestedQuestionChip } from "../../components/chat/SuggestedQuestionChip";
import { TopProgressBar } from "../../components/chat/TopProgressBar";
import { getChatMessages, pollNewOcrStatus, cancelOcr } from "../../services/documentService";

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
  documents?: { id: string; fileName: string; }[];
};

const AIChatScreen = () => {
  const navigation = useNavigation();
  const { isDark } = useAppTheme();
  const [input, setInput] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<MedicalDocument[]>([]);
  const [processingDocuments, setProcessingDocuments] = useState<MedicalDocument[]>([]);
  const [progressState, setProgressState] = useState<Record<string, { status: "pending"|"processing"|"done"|"failed", progress: number }>>({});
  const [isTopProgressExpanded, setIsTopProgressExpanded] = useState(false);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // Pagination states
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Queue for delaying message send until OCR is done
  const [queuedMessage, setQueuedMessage] = useState<{ text: string, sessionId: string, documentIds: string } | null>(null);

  // Fetch user and session ID
  useEffect(() => {
    const fetchUserAndSession = async () => {
      try {
        const res = await getUser();
        if (res?.data?.sessionId) {
          setCurrentSessionId(res.data.sessionId);
        }
      } catch (err) {
        console.log("Failed to fetch user session", err);
      }
    };
    fetchUserAndSession();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => setKeyboardPadding(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const documentSheetRef = useRef<BottomSheetModal>(null);

  // Fetch all documents
  const {
    data: allDocsData,
    isLoading: isLoadingDocs,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery({
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

  const activeMode = selectedDocuments.length > 0 || processingDocuments.length > 0
    ? ChatMode.DOCUMENT_RAG
    : ChatMode.GENERAL_HEALTH;

  const fetchMessagesForSession = async (sessionId: string, cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMoreMessages(true);
      } else {
        setIsLoadingMessages(true);
      }

      const params: { cursor?: string; limit: number; direction?: 'before' | 'after' } = { limit: 20 };
      if (cursor) {
        params.cursor = cursor;
        params.direction = "before";
      }
      const res = await getChatMessages(sessionId, params);
      if (res?.status?.status === "SUCCESS" && res?.data) {
        const fetchedMessages = res.data.map((msg: any) => ({
          id: msg.id,
          role: msg.role === "assistant" ? "ai" : "user",
          text: msg.content,
          mode: msg.metadata?.mode,
          emergency: msg.metadata?.emergency,
        }));
        
        if (cursor) {
          setMessages(prev => [...fetchedMessages, ...prev]);
        } else {
          setMessages(fetchedMessages);
        }

        const nextCursor = res.page?.nextCursor;
        setMessagesCursor(nextCursor || null);
        setHasMoreMessages(!!nextCursor);
      }
    } catch (e) {
      console.log("Failed to fetch messages", e);
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMoreMessages(false);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      setMessagesCursor(null);
      setHasMoreMessages(true);
      fetchMessagesForSession(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const loadMoreMessages = () => {
    if (currentSessionId && hasMoreMessages && !isLoadingMoreMessages && messagesCursor) {
      fetchMessagesForSession(currentSessionId, messagesCursor);
    }
  };

  const startPolling = (docId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await pollNewOcrStatus(docId);
        const status = res?.data?.status || "processing";
        const progress = res?.data?.progress || 50; // mock if API doesn't return progress
        setProgressState(prev => ({
          ...prev,
          [docId]: { status: status === "done" ? "done" : status === "failed" ? "failed" : "processing", progress: status === "done" ? 100 : progress }
        }));
        if (status === "done" || status === "failed") {
          clearInterval(interval);
        }
      } catch (e) {
        setProgressState(prev => ({ ...prev, [docId]: { status: "failed", progress: 0 } }));
        clearInterval(interval);
      }
    }, 3000);
  };

  const executeSendMessage = async (sessionId: string, textToSubmit: string, documentIds: string) => {
    try {
      const response = await sendChatMessage({
        sessionId,
        documentId: documentIds || undefined,
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
      setProcessingDocuments([]);
      setQueuedMessage(null);
    }
  };

  useEffect(() => {
    if (queuedMessage && processingDocuments.length > 0) {
      const allDocsFinished = processingDocuments.every(doc => {
        const s = progressState[doc.id]?.status;
        return s === "done" || s === "failed";
      });
      
      const anyFailed = processingDocuments.some(doc => progressState[doc.id]?.status === "failed");

      if (allDocsFinished) {
        if (anyFailed) {
          Toast.show({ type: "error", text1: "OCR Failed", text2: "One or more documents failed to process." });
          setIsSending(false);
          setProcessingDocuments([]);
          setQueuedMessage(null);
        } else {
          executeSendMessage(queuedMessage.sessionId, queuedMessage.text, queuedMessage.documentIds);
        }
      }
    }
  }, [progressState, queuedMessage, processingDocuments]);

  const handleSend = async (customText?: string) => {
    const textToSubmit = (customText || input).trim();
    if (!textToSubmit) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSubmit,
      documents: selectedDocuments.length > 0 ? selectedDocuments.map(d => ({ id: d.id, fileName: d.fileName })) : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    let currentDocsToProcess = [...processingDocuments];

    // Move selected documents to processing state and animate up
    if (selectedDocuments.length > 0) {
      const newDocs = [...selectedDocuments];
      currentDocsToProcess = [...currentDocsToProcess, ...newDocs];
      setProcessingDocuments(currentDocsToProcess);
      setSelectedDocuments([]);
      
      newDocs.forEach(doc => {
        setProgressState(prev => ({ ...prev, [doc.id]: { status: "processing", progress: 10 } }));
        startPolling(doc.id);
      });
    }

    const documentIds = currentDocsToProcess.map(d => d.id).join(",");

    if (currentDocsToProcess.length > 0) {
      const allFinished = currentDocsToProcess.every(doc => {
        const s = progressState[doc.id]?.status;
        return s === "done" || s === "failed";
      });
      if (allFinished) {
        executeSendMessage(currentSessionId!, textToSubmit, documentIds);
      } else {
        setQueuedMessage({ text: textToSubmit, sessionId: currentSessionId!, documentIds });
      }
    } else {
      executeSendMessage(currentSessionId!, textToSubmit, "");
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedDocuments([]);
    setProcessingDocuments([]);
    setProgressState({});
    setCurrentSessionId(null);
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

  const suggestedQuestions =
    activeMode === ChatMode.DOCUMENT_RAG
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
        message={
          docsError instanceof Error ? docsError.message : String(docsError)
        }
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

      <TopProgressBar
        documents={processingDocuments}
        progressState={progressState}
        isExpanded={isTopProgressExpanded}
        onToggleExpand={() => setIsTopProgressExpanded(!isTopProgressExpanded)}
        isDark={isDark}
        onCancelDocument={async (docId) => {
          try {
            await cancelOcr(docId);
            setProgressState(prev => ({ ...prev, [docId]: { status: "failed", progress: 0 } }));
          } catch(e) {
            console.log("Failed to cancel", e);
          }
        }}
      />

      <View
        style={[styles.keyboardContainer, { paddingBottom: keyboardPadding }]}
      >
        {/* Document Selector bar */}
        <DocumentSelector onPress={() => documentSheetRef.current?.present()}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#0f766e" />
          <SelectorText numberOfLines={1}>
            {selectedDocuments.length > 0 || processingDocuments.length > 0
              ? `Documents: ${selectedDocuments.length + processingDocuments.length} Selected`
              : "General Health Chat (No Document)"}
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
              This may require urgent medical attention. Please contact
              emergency services or visit the nearest emergency department
              immediately.
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
              renderItem={({ item }) => (
                <MessageBubble message={item} isDark={isDark} />
              )}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              ListFooterComponent={isLoadingMoreMessages ? <ActivityIndicator size="small" color="#0f766e" style={{ margin: 10 }} /> : null}
            />
          )}
        </View>

        {/* Suggested Chips above input */}
        {messages.length === 0 && keyboardPadding === 0 && (
          <SuggestedQuestionChip
            questions={suggestedQuestions}
            onPressQuestion={handleSend}
            isDark={isDark}
          />
        )}

        {/* Selected Documents Strip above input */}
        {selectedDocuments.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.selectedDocsStrip}
            style={{ flexGrow: 0, maxHeight: 110, marginBottom: 4 }}
          >
            {selectedDocuments.map(doc => (
              <View key={doc.id} style={styles.selectedDocCard}>
                <TouchableOpacity
                  style={styles.selectedDocCloseBtn}
                  onPress={() => setSelectedDocuments(prev => prev.filter(d => d.id !== doc.id))}
                >
                  <Ionicons name="close" size={14} color="#000" />
                </TouchableOpacity>
                <Ionicons name="document-text" size={32} color="#0f766e" style={{ marginTop: 8 }} />
                <Text style={styles.selectedDocCardText} numberOfLines={2}>
                  {doc.fileName}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Floating Input Capsule */}
        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={() => handleSend()}
          isSending={isSending}
          isDark={isDark}
        />
      </View>

      {/* Document Selector Bottom Sheet */}
      <BottomSheet ref={documentSheetRef} enablePanDownToClose={true}>
        <SheetContentWrapper>
          <BSTitle>Select Mode or Report</BSTitle>
          <BSSub>
            Choose general health mode or discuss a specific medical report
          </BSSub>
          <BSScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BSItem
              selected={selectedDocuments.length === 0 && processingDocuments.length === 0}
              onPress={() => {
                setSelectedDocuments([]);
                documentSheetRef.current?.dismiss();
              }}
              activeOpacity={0.7}
            >
              <BSIconBadge
                bgColor={selectedDocuments.length === 0 && processingDocuments.length === 0 ? "#ccfbf1" : "#f1f5f9"}
              >
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={selectedDocuments.length === 0 && processingDocuments.length === 0 ? "#0f766e" : "#64748b"}
                />
              </BSIconBadge>
              <BSLbl selected={selectedDocuments.length === 0 && processingDocuments.length === 0}>
                General Health Chat (No Document)
              </BSLbl>
              {selectedDocuments.length === 0 && processingDocuments.length === 0 && <BSCheck>✓</BSCheck>}
            </BSItem>

            {documentsList.length === 0 ? (
              <EmptyDocumentsWrapper>
                <EmptyTitle>
                  You haven't uploaded any medical reports yet.
                </EmptyTitle>
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
              safeMap(documentsList, (doc: MedicalDocument) => {
                const isSelected = selectedDocuments.some(d => d.id === doc.id) || processingDocuments.some(d => d.id === doc.id);
                return (
                  <BSItem
                    key={doc.id}
                    selected={isSelected}
                    onPress={() => {
                      if (processingDocuments.some(d => d.id === doc.id)) {
                        Toast.show({ type: "info", text1: "Document Processing", text2: "This document is currently being processed." });
                        return;
                      }
                      if (isSelected) {
                        setSelectedDocuments(prev => prev.filter(d => d.id !== doc.id));
                      } else {
                        if (selectedDocuments.length >= 5) {
                          Toast.show({ type: "error", text1: "Limit Reached", text2: "You can only select up to 5 documents." });
                          return;
                        }
                        setSelectedDocuments(prev => [...prev, doc]);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <BSIconBadge
                      bgColor={
                        isSelected ? "#ccfbf1" : "#f1f5f9"
                      }
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={
                          isSelected ? "#0f766e" : "#64748b"
                        }
                      />
                    </BSIconBadge>
                    <BSLbl selected={isSelected}>
                      {doc.fileName}
                    </BSLbl>
                    {isSelected ? <BSCheck>✓</BSCheck> : <View style={{ width: 15 }} />}
                  </BSItem>
                );
              })
            )}
          </BSScrollView>
          <UploadButton onPress={() => documentSheetRef.current?.dismiss()} style={{ marginTop: 12 }}>
            <UploadButtonText>Confirm Selection</UploadButtonText>
          </UploadButton>
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
  font-weight: ${({ selected }: { selected: boolean }) =>
    selected ? "700" : "600"};
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
  selectedDocsStrip: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 12,
  },
  selectedDocCard: {
    width: 90,
    height: 100,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  selectedDocCloseBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#f1f5f9",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    zIndex: 10,
  },
  selectedDocCardText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
});
