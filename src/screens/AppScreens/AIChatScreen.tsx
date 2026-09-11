import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FlatList,
  Keyboard,
  StatusBar,
  BackHandler,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

// Contexts & Services
import { useAppTheme } from "../../context/ThemeContext";
import { useDocumentUpload } from "../../context/DocumentUploadContext";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import { useOcrJobPolling } from "../../hooks/useOcrJobPolling";
import { listDocument } from "../../services/documentService";

// Chat Hooks & Utils
import { useChatSession } from "../../hooks/chat/useChatSession";
import { useChatWizardManager } from "../../hooks/chat/useChatWizardManager";
import { MedicalDocument } from "../../types";

// Modular UI Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { ChatInput } from "../../components/chat/ChatInput";
import { ChatMessageItem } from "../../components/chat/ChatMessageItem";
import { SuggestedQuestionChip } from "../../components/chat/SuggestedQuestionChip";
import { FloatingProgressPanel } from "../../components/chat/FloatingProgressPanel";
import { EditMedicineFormWrapper } from "../../components/chat/EditMedicineFormWrapper";
import TypingIndicator from "../../components/chat/TypingIndicator";
import BottomSheet from "../../components/shared/BottomSheet";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import MedicineExtractionBottomSheet from "../../components/chat/widgets/MedicineExtractionBottomSheet";
import DocumentViewerModal from "../../components/shared/DocumentViewerModal";
import { LoadingScreen, ErrorScreen } from "../../components/shared/DefensiveStates";

const AIChatScreen = ({ route }: any) => {
  const { isDark, theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const bottomPadding = useBottomBarPadding();

  // State
  const [preferredLang, setPreferredLang] = useState("english");
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [pendingStep, setPendingStep] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [showFloatingPanel] = useState(true);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const uploadSheetRef = useRef<BottomSheetModal>(null);
  const extractionSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const lastKnownStateRef = useRef<any>({});

  // Document Upload State
  const {
    uploadingDocs,
    isUploading,
    chatWizardState,
    setChatWizardState,
  } = useDocumentUpload();

  const { isAllTerminal } = useOcrJobPolling(chatWizardState.jobIds);

  // Query documents list
  const {
    data: docsResponse,
    isLoading: isLoadingDocs,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: listDocument,
  });

  const documentsList: MedicalDocument[] = useMemo(() => {
    return docsResponse?.data || [];
  }, [docsResponse]);

  // Chat Session Hook
  const {
    messages,
    setMessages,
    mergedMessages,
    activeSessionId,
    onboardingSessionId,
    selectedDocument,
    input,
    setInput,
    isSending,
    setIsSending,
    isLoadingHistory,
    isLoadingMore,
    isActivelyStreaming,
    hasEmergency,
    suggestedQuestions,
    handleSend,
    loadMoreMessages,
    initChatHistory,
    fetchOnboardingHistory,
    speakingMessageId,
    speakMessage,
    t,
  } = useChatSession({
    initialSessionId: route?.params?.sessionId,
    documentsList,
    preferredLang,
    isOnboardingCompleted,
    setIsOnboardingCompleted,
    pendingStep,
    setPendingStep,
    filesInfo: chatWizardState.filesInfo,
    lastKnownStateRef,
  });

  // Wizard & Conflict Manager Hook
  const {
    isLoadingResults,
    isConfirmingMeds,
    medicineToEdit,
    setMedicineToEdit,
    handleEditSave,
    handleConfirmSelection,
    resolveCurrentConflict,
    navigateConflict,
    handleContinueAnyway,
    handleReviewMedicines,
    handleConfirmAndAddMeds,
    handleGenericOptionPress,
  } = useChatWizardManager({
    chatWizardState,
    setChatWizardState,
    preferredLang,
    isAllTerminal,
    uploadingDocs,
    setMessages,
    editSheetRef,
    extractionSheetRef,
    uploadSheetRef,
    activeSessionId,
    onboardingSessionId,
    navigation,
    messages,
    setIsSending,
    lastKnownStateRef,
    setIsOnboardingCompleted,
    setPendingStep,
  });

  // Load history on focus / mount
  useEffect(() => {
    fetchOnboardingHistory();
    initChatHistory();
  }, [fetchOnboardingHistory, initChatHistory]);

  // Back handler
  useEffect(() => {
    const onBackPress = () => {
      navigation.navigate("Home");
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [navigation]);

  // Keyboard Animation
  const keyboard = useAnimatedKeyboard();
  const animatedKeyboardStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: Math.max(keyboard.height.value, bottomPadding),
    };
  });

  const hasActiveUploads = useMemo(() => {
    if (isUploading) return true;
    if (!uploadingDocs || uploadingDocs.length === 0) return false;
    return uploadingDocs.some((doc) => {
      const status = (doc.status || "").toUpperCase();
      return (
        !["COMPLETED", "FAILED", "REJECTED", "CANCELLED", "SUCCESS", "ERROR"].includes(status) &&
        doc.progress !== 100 &&
        doc.progress !== -1
      );
    });
  }, [isUploading, uploadingDocs]);

  const handleUploadSuccess = async (jobIds: string[], filesInfo: any[]) => {
    setChatWizardState((prev) => ({
      ...prev,
      step: "processing",
      jobIds,
      filesInfo,
      extractedMedicines: [],
      conflicts: [],
      currentConflictIndex: 0,
      resolvedMedicines: [],
      replaceList: [],
      mergeList: [],
      summaries: [],
      hasViewedCompletedOcr: false,
    }));
    extractionSheetRef.current?.present();
  };

  const handleUploadStart = () => {
    extractionSheetRef.current?.present();
  };

  const handleViewFullReport = useCallback((doc: any) => {
    const matched = documentsList.find(
      (d: any) => d.id === doc?.id || d.s3Key === doc?.s3Key || d.fileKey === doc?.fileKey
    );
    setViewerDoc(matched || doc);
    setIsViewerOpen(true);
  }, [documentsList]);

  if (isLoadingDocs || isLoadingHistory) {
    return <LoadingScreen />;
  }

  if (docsError) {
    return (
      <ErrorScreen
        message={docsError instanceof Error ? docsError.message : String(docsError)}
        onRetry={() => refetchDocs()}
      />
    );
  }

  const isOnboardingSession = Boolean(onboardingSessionId && !isOnboardingCompleted);

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <ChatHeader
        onBack={() => navigation.navigate("Home")}
        isDark={isDark}
        theme={theme}
      />

      {/* Upload Progress Panel */}
      {showFloatingPanel && hasActiveUploads && (
        <FloatingProgressPanel
          onOpenSheet={() => extractionSheetRef.current?.present()}
          isDark={isDark}
        />
      )}

      <View style={styles.keyboardContainer}>
        {/* Emergency Alert */}
        {hasEmergency && (
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyTitleRow}>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <Text style={styles.emergencyTitle}>{t("seekImmediateAttention")}</Text>
            </View>
            <Text style={styles.emergencyText}>{t("emergencyWarning")}</Text>
          </View>
        )}

        {/* Read Only Archive Banner */}
        {isOnboardingSession && (
          <View
            style={[
              styles.readOnlyBanner,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="archive-outline" size={18} color="#0f766e" />
            <Text style={styles.readOnlyText}>{t("onboardingSessionReadOnly")}</Text>
          </View>
        )}

        {/* Messages List */}
        <View style={styles.contentWrapper}>
          <FlatList
            ref={flatListRef}
            data={mergedMessages}
            keyExtractor={(item, index) => item.id || `msg-${index}`}
            inverted
            renderItem={({ item, index }) => (
              <ChatMessageItem
                item={item}
                index={index}
                mergedMessages={mergedMessages}
                isDark={isDark}
                theme={theme}
                preferredLang={preferredLang}
                speakingMessageId={speakingMessageId}
                speakMessage={speakMessage}
                onboardingSessionId={onboardingSessionId}
                chatWizardState={chatWizardState}
                isLoadingResults={isLoadingResults}
                isConfirmingMeds={isConfirmingMeds}
                setMedicineToEdit={setMedicineToEdit}
                editSheetRef={editSheetRef}
                handleConfirmSelection={handleConfirmSelection}
                resolveCurrentConflict={resolveCurrentConflict}
                navigateConflict={navigateConflict}
                handleContinueAnyway={handleContinueAnyway}
                handleReviewMedicines={handleReviewMedicines}
                handleConfirmAndAddMeds={handleConfirmAndAddMeds}
                handleGenericOptionPress={handleGenericOptionPress}
                navigation={navigation}
                setChatWizardState={setChatWizardState}
                onViewFullReport={handleViewFullReport}
              />
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: 10 }}>
                  <ActivityIndicator size="small" color="#0f766e" />
                </View>
              ) : null
            }
            ListHeaderComponent={
              isSending && !isActivelyStreaming ? (
                <View style={styles.typingWrapper}>
                  <LinearGradient
                    colors={["#0f766e", "#0ea5e9"]}
                    style={styles.typingAvatar}
                  >
                    <Ionicons name="sparkles" size={14} color="#ffffff" />
                  </LinearGradient>
                  <TypingIndicator isDark={isDark} />
                </View>
              ) : null
            }
          />
        </View>

        {/* Input & Suggested Chips */}
        <Animated.View style={animatedKeyboardStyle}>
          <SuggestedQuestionChip
            questions={suggestedQuestions}
            onPressQuestion={handleSend}
            isDark={isDark}
          />

          <ChatInput
            value={input}
            onChangeText={setInput}
            onSend={() => handleSend()}
            isSending={isSending}
            isDark={isDark}
            preferredLanguage={preferredLang}
            onAttachPress={() => {
              uploadSheetRef.current?.present();
              Keyboard.dismiss();
            }}
          />
        </Animated.View>
      </View>

      {/* Modals & Sheets */}
      <DocumentUploadBottomSheet
        ref={uploadSheetRef}
        fromScreen="AIChat"
        onSuccess={handleUploadSuccess}
        onUploadStart={handleUploadStart}
      />

      <MedicineExtractionBottomSheet
        ref={extractionSheetRef}
        preferredLang={preferredLang}
        isDark={isDark}
        onClose={() => { }}
      />

      <BottomSheet ref={editSheetRef} snapPoints={["85%"]}>
        <View style={{ flex: 1, paddingBottom: bottomPadding }}>
          {medicineToEdit && (
            <EditMedicineFormWrapper
              medicine={medicineToEdit}
              preferredLang={preferredLang}
              isDark={isDark}
              theme={theme}
              onClose={() => {
                editSheetRef.current?.dismiss();
                setMedicineToEdit(null);
              }}
              onSave={handleEditSave}
            />
          )}
        </View>
      </BottomSheet>

      <DocumentViewerModal
        visible={isViewerOpen}
        document={viewerDoc}
        title={viewerDoc?.fileName}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerDoc(null);
        }}
      />
    </LinearGradient>
  );
};

export default AIChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f766e",
    marginLeft: 8,
  },
  emergencyCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  emergencyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
    marginLeft: 6,
  },
  emergencyText: {
    fontSize: 12.5,
    color: "#991b1b",
    lineHeight: 17,
  },
  typingWrapper: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignSelf: "flex-end",
  },
});
