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
  Platform,
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
import { usePreferredLanguage } from "../../hooks/usePreferredLanguage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOcrJobPolling } from "../../hooks/useOcrJobPolling";
import { listDocument } from "../../services/documentService";
import { getUser } from "../../services/userService";

// Chat Hooks & Utils
import { useChatSession } from "../../hooks/chat/useChatSession";
import { useChatWizardManager } from "../../hooks/chat/useChatWizardManager";
import { MedicalDocument } from "../../types";

// Modular UI Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { ChatDateHeader } from "../../components/chat/ChatDateHeader";
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
import { DocumentMentionDropdown } from "../../components/chat/DocumentMentionDropdown";
import { DocumentMention } from "../../types/chat";
import { LoadingScreen, ErrorScreen } from "../../components/shared/DefensiveStates";
import { ReportReferenceHeader } from "../../components/chat/widgets/ReportReferenceHeader";
import { getRelativeDateLabel } from "../../utils/dateFormatter";
import Toast from "react-native-toast-message";

const AIChatScreen = ({ route }: any) => {
  const { isDark, theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const bottomPadding = useBottomBarPadding();
  const insets = useSafeAreaInsets();

  // State
  const storedPreferredLanguage = usePreferredLanguage();
  const [preferredLang, setPreferredLang] = useState(storedPreferredLanguage || "english");

  useEffect(() => {
    if (storedPreferredLanguage) {
      setPreferredLang(storedPreferredLanguage);
    }
  }, [storedPreferredLanguage]);

  const { data: userProfileResponse } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const profileOnboardingCompleted = Boolean(
    (userProfileResponse as any)?.onboardingCompleted ??
    (userProfileResponse as any)?.data?.onboardingCompleted ??
    true
  );

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(profileOnboardingCompleted);

  useEffect(() => {
    if (profileOnboardingCompleted) {
      setIsOnboardingCompleted(true);
    }
  }, [profileOnboardingCompleted]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pendingStep, setPendingStep] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [showFloatingPanel] = useState(true);
  const [activeDateLabel, setActiveDateLabel] = useState<string>("");
  const activeDateLabelRef = useRef<string>("");

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      let topItem = viewableItems[0];
      for (const item of viewableItems) {
        if (item.index < topItem.index) {
          topItem = item;
        }
      }
      const message = topItem?.item;
      if (message && message.createdAt) {
        const label = getRelativeDateLabel(message.createdAt, true);
        if (label && label !== activeDateLabelRef.current) {
          activeDateLabelRef.current = label;
          setActiveDateLabel(label);
        }
      }
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
  });

  useEffect(() => {
    AsyncStorage.getItem("preferredLanguage")
      .then((lang) => {
        if (lang) {
          setPreferredLang(lang);
        }
      })
      .catch(() => { });
  }, []);

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
    const payload: any = docsResponse?.data;

    // The documents endpoint returns { items: [], total: ... }
    // Always keep this value as an array because the viewer lookup uses Array.find().
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.documents)) return payload.documents;
    return [];
  }, [docsResponse]);

  // Chat Session Hook
  const {
    messages,
    setMessages,
    mergedMessages,
    activeSessionId,
    onboardingSessionId,
    selectedDocument,
    setSelectedDocument,
    selectedDocuments,
    setSelectedDocuments,
    input,
    setInput,
    activeMentions,
    setActiveMentions,
    isSending,
    setIsSending,
    isLoadingHistory,
    isLoadingMore,
    hasMoreMessages,
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
    setPreferredLang,
    selectedOption,
    setSelectedOption,
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
    setSelectedOption,
  });

  // Mention Dropdown & Selection State
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [selectionOverride, setSelectionOverride] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const chatInputRef = useRef<any>(null);

  const currentTextRef = useRef(input);
  currentTextRef.current = input;

  const checkMentionTrigger = useCallback(
    (text: string, cursorPosition: number) => {
      const pos = Math.max(0, Math.min(text.length, cursorPosition));
      const textBefore = text.slice(0, pos);
      const lastAt = textBefore.lastIndexOf("@");
      if (lastAt >= 0) {
        const isStartOrWhitespace =
          lastAt === 0 || /\s/.test(textBefore[lastAt - 1]);
        if (isStartOrWhitespace) {
          const afterAt = textBefore.slice(lastAt + 1);
          if (!/[\s@]/.test(afterAt)) {
            setMentionTriggerIndex(lastAt);
            setMentionQuery(afterAt);
            setMentionDropdownVisible(true);
            return;
          }
        }
      }
      setMentionDropdownVisible(false);
      setMentionQuery("");
      setMentionTriggerIndex(-1);
    },
    [],
  );

  const handleInputChange = useCallback(
    (newText: string) => {
      currentTextRef.current = newText;
      // Clear any temporary programmatic selection override
      setSelectionOverride(undefined);

      // Keep active mentions synchronized if tokens are deleted or edited
      setActiveMentions((prev) =>
        prev.filter((m) => newText.includes(`@${m.displayName}`)),
      );

      // Accurately compute new cursor position based on text delta
      const prevStart = selectionRef.current.start;
      const diff = newText.length - input.length;
      const cursor =
        diff > 0
          ? Math.min(newText.length, Math.max(0, prevStart + diff))
          : Math.min(newText.length, Math.max(0, prevStart));
      selectionRef.current = { start: cursor, end: cursor };

      // Check at computed cursor first, then fallback to end of text
      const posToCheck = cursor > 0 ? cursor : newText.length;
      checkMentionTrigger(newText, posToCheck);
      setInput(newText);
    },
    [input.length, setActiveMentions, setInput, checkMentionTrigger],
  );

  const handleSelectionChange = useCallback(
    (sel: { start: number; end: number }) => {
      selectionRef.current = sel;
      checkMentionTrigger(currentTextRef.current, sel.start);
    },
    [checkMentionTrigger],
  );

  const handleSelectMentionDocument = useCallback(
    (doc: MedicalDocument) => {
      const title = (
        doc.fileName ||
        doc.report_name ||
        doc.name ||
        "Medical Report"
      ).trim();
      const mentionToken = `@${title} `;

      const triggerIdx =
        mentionTriggerIndex >= 0 ? mentionTriggerIndex : input.lastIndexOf("@");
      const textBefore = triggerIdx >= 0 ? input.slice(0, triggerIdx) : input;
      const currentCursor =
        selectionRef.current.start >= triggerIdx
          ? selectionRef.current.start
          : input.length;
      const textAfter = input.slice(currentCursor);
      const nextText = textBefore + mentionToken + textAfter;
      const nextPos = (textBefore + mentionToken).length;

      const newMention: DocumentMention = {
        documentId: doc.id,
        displayName: title,
        fileName: doc.fileName || title,
        type: "DOCUMENT",
        documentType: doc.documentType || "LAB_REPORT",
        reportDate:
          doc.reportDate || (doc.createdAt ? String(doc.createdAt) : undefined),
        patientId: doc.patientId,
        triggerIndex: triggerIdx,
        length: mentionToken.length,
      };

      setActiveMentions((prev) => [
        ...prev.filter((m) => m.documentId !== doc.id),
        newMention,
      ]);
      setInput(nextText);
      selectionRef.current = { start: nextPos, end: nextPos };
      setSelectionOverride({ start: nextPos, end: nextPos });
      setTimeout(() => setSelectionOverride(undefined), 200);

      setMentionDropdownVisible(false);
      setMentionQuery("");
      setMentionTriggerIndex(-1);
    },
    [
      input,
      mentionTriggerIndex,
      setActiveMentions,
      setInput,
    ],
  );

  // Load history on focus / mount
  useEffect(() => {
    initChatHistory();
  }, [initChatHistory]);

  // Sync route document and handle initial question if provided
  const initialParamsHandledRef = useRef<string | null>(null);
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  useEffect(() => {
    const docId = route?.params?.document?.id || route?.params?.documentId;
    const initQ = route?.params?.initialQuestion;
    const initMentions: DocumentMention[] | undefined =
      route?.params?.initialMentions;
    const key = `${docId || ""}_${initQ || ""}`;
    if (key && initialParamsHandledRef.current !== key) {
      initialParamsHandledRef.current = key;
      if (route?.params?.document) {
        setSelectedDocument(route.params.document);
        setSelectedDocuments([route.params.document]);
      }
      if (
        initMentions &&
        Array.isArray(initMentions) &&
        initMentions.length > 0
      ) {
        setActiveMentions(initMentions);
      }
      if (initQ) {
        const timer = setTimeout(() => {
          handleSendRef.current(
            initQ,
            route?.params?.document,
            false,
            initMentions,
          );
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [
    route?.params?.document?.id,
    route?.params?.documentId,
    route?.params?.initialQuestion,
    route?.params?.initialMentions,
    setSelectedDocument,
    setSelectedDocuments,
    setActiveMentions,
  ]);

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
    // Only show upload progress in AIChatScreen if upload originated from AIChat
    const isChatUpload =
      chatWizardState?.fromScreen === "AIChat" ||
      chatWizardState?.fromScreen === "AIChatScreen" ||
      chatWizardState?.step === "processing" ||
      chatWizardState?.step === "results" ||
      uploadingDocs?.some(
        (d) => d.fromScreen === "AIChat" || d.fromScreen === "AIChatScreen"
      );

    if (!isChatUpload) {
      return false;
    }

    if (isUploading) return true;
    if (!uploadingDocs || uploadingDocs.length === 0) return false;
    return uploadingDocs.some((doc) => {
      const isDocFromChat =
        doc.fromScreen === "AIChat" ||
        doc.fromScreen === "AIChatScreen" ||
        (!doc.fromScreen && chatWizardState.step !== "idle");
      if (!isDocFromChat) return false;

      const status = (doc.status || "").toUpperCase();
      return (
        !["COMPLETED", "FAILED", "REJECTED", "CANCELLED", "SUCCESS", "ERROR"].includes(status) &&
        doc.progress !== 100 &&
        doc.progress !== -1
      );
    });
  }, [isUploading, uploadingDocs, chatWizardState]);

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
    const documentId = doc?.id || doc?.documentId || doc?.report_id;
    const documentKey = doc?.s3Key || doc?.fileKey || doc?.file_key;
    const documentName = doc?.fileName || doc?.report_name || doc?.name;
    const matched = documentsList.find(
      (d: any) =>
        d.id === documentId ||
        d.documentId === documentId ||
        d.s3Key === documentKey ||
        d.fileKey === documentKey ||
        d.file_key === documentKey ||
        d.fileName === documentName ||
        d.name === documentName
    );
    // Keep the report summary fields, while adding the original file source
    // from the document list when the summary itself only contains metadata.
    setViewerDoc(
      matched
        ? {
            ...matched,
            ...doc,
            id: matched.id || documentId,
            s3Key: doc?.s3Key || (matched as any).s3Key || (matched as any).fileKey,
            fileKey: doc?.fileKey || (matched as any).fileKey || (matched as any).s3Key,
            fileUrl: doc?.fileUrl || (matched as any).fileUrl,
            imageUri: doc?.imageUri || (matched as any).imageUri,
          }
        : {
            ...doc,
            id: documentId,
            s3Key: documentKey,
            fileKey: documentKey,
          },
    );
    setIsViewerOpen(true);
  }, [documentsList]);

  const keyExtractor = useCallback((item: any, index: number) => item.id || `msg-${index}`, []);

  const shouldAutoScrollRef = useRef(true);
  const isInitialScrollPendingRef = useRef(true);
  const initialScrollSettlingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const programmaticScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollingRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const lastContentHeightRef = useRef(0);
  const prevMessagesCountRef = useRef(0);
  const prevIsSendingRef = useRef(false);
  const prevIsFocusedRef = useRef(false);
  const prevIsLoadingHistoryRef = useRef(isLoadingHistory);
  const lastMessageIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);

  const displayMessages = useMemo(() => {
    return [...mergedMessages].reverse();
  }, [mergedMessages]);

  const scrollToBottom = useCallback((animated = true) => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (!animated) {
      flatListRef.current?.scrollToEnd({ animated: false });
      return;
    }

    if (!shouldAutoScrollRef.current) return;

    isProgrammaticScrollingRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollingRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 400);

    // Single debounced scroll operation to avoid overlapping native scroll animations
    scrollTimerRef.current = setTimeout(() => {
      if (shouldAutoScrollRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
      scrollTimerRef.current = null;
    }, 60);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
        programmaticScrollTimerRef.current = null;
      }
      if (initialScrollSettlingTimerRef.current) {
        clearTimeout(initialScrollSettlingTimerRef.current);
        initialScrollSettlingTimerRef.current = null;
      }
    };
  }, []);

  // When screen opens or regains focus, reset initial scroll flag to anchor to the latest message
  useEffect(() => {
    if (isFocused && !prevIsFocusedRef.current) {
      isInitialScrollPendingRef.current = true;
      shouldAutoScrollRef.current = true;
      if (displayMessages.length > 0 && !isLoadingHistory) {
        flatListRef.current?.scrollToEnd({ animated: false });
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    }
    prevIsFocusedRef.current = isFocused;
  }, [isFocused, isLoadingHistory, displayMessages.length]);

  // When previous chat messages finish loading, trigger auto-scroll to the latest message
  useEffect(() => {
    const justFinishedLoadingHistory = prevIsLoadingHistoryRef.current && !isLoadingHistory;
    prevIsLoadingHistoryRef.current = isLoadingHistory;

    if (justFinishedLoadingHistory && displayMessages.length > 0) {
      isInitialScrollPendingRef.current = true;
      shouldAutoScrollRef.current = true;
      flatListRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    }
  }, [isLoadingHistory, displayMessages.length]);

  // Handle incoming messages, initial message population, sending state, and older message loading
  useEffect(() => {
    const currentFirstId = displayMessages[0]?.id ?? null;
    const currentLastId = displayMessages[displayMessages.length - 1]?.id ?? null;
    const currentCount = displayMessages.length;

    const previousCount = prevMessagesCountRef.current;
    const prevFirstId = firstMessageIdRef.current;
    const prevLastId = lastMessageIdRef.current;

    const justStartedSending = !prevIsSendingRef.current && isSending;
    prevIsSendingRef.current = isSending;

    if (justStartedSending) {
      shouldAutoScrollRef.current = true;
      isInitialScrollPendingRef.current = false;
      scrollToBottom(true);
      return;
    }

    if (currentCount === 0 || isLoadingHistory) {
      return;
    }

    // Initial load of previous chat messages: anchor immediately to the latest message
    if (prevLastId === null) {
      lastMessageIdRef.current = currentLastId;
      firstMessageIdRef.current = currentFirstId;
      prevMessagesCountRef.current = currentCount;
      isInitialScrollPendingRef.current = true;
      shouldAutoScrollRef.current = true;

      flatListRef.current?.scrollToEnd({ animated: false });
      const frameId = requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
      const t1 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 80);
      const t2 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 250);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // Check if new latest message arrived vs. previous messages prepended (pagination)
    const isNewLatestMessage = currentLastId !== prevLastId;
    const isOlderMessagesPrepended =
      !isNewLatestMessage &&
      currentCount > previousCount &&
      currentFirstId !== prevFirstId;

    lastMessageIdRef.current = currentLastId;
    firstMessageIdRef.current = currentFirstId;
    prevMessagesCountRef.current = currentCount;

    if (isOlderMessagesPrepended) {
      // Previous chat messages were loaded at the top (pagination)
      // Do NOT scroll to bottom so the user's reading position is maintained
      return;
    }

    if (isNewLatestMessage) {
      if (shouldAutoScrollRef.current || isInitialScrollPendingRef.current) {
        scrollToBottom(true);
      }
      return;
    }

    if (shouldAutoScrollRef.current && isActivelyStreaming) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [
    displayMessages,
    isSending,
    isActivelyStreaming,
    isLoadingHistory,
    scrollToBottom,
  ]);

  const renderChatItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <ChatMessageItem
        item={item}
        index={index}
        mergedMessages={displayMessages}
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
        uploadSheetRef={uploadSheetRef}
        handleConfirmSelection={handleConfirmSelection}
        resolveCurrentConflict={resolveCurrentConflict}
        navigateConflict={navigateConflict}
        handleContinueAnyway={handleContinueAnyway}
        handleReviewMedicines={handleReviewMedicines}
        handleConfirmAndAddMeds={handleConfirmAndAddMeds}
        handleGenericOptionPress={handleGenericOptionPress}
        navigation={navigation}
        setChatWizardState={setChatWizardState}
        setMessages={setMessages}
        onViewFullReport={handleViewFullReport}
        onReportQuestion={(question, document) =>
          handleSend(question, document, true)
        }
        onAllergyCardExpand={handleAllergyCardExpand}
        isOnboardingCompleted={isOnboardingCompleted}
        selectedOption={selectedOption}
      />
    ),
    [
      displayMessages,
      isOnboardingCompleted,
      selectedOption,
      isDark,
      theme,
      preferredLang,
      speakingMessageId,
      speakMessage,
      onboardingSessionId,
      chatWizardState,
      isLoadingResults,
      isConfirmingMeds,
      setMedicineToEdit,
      editSheetRef,
      uploadSheetRef,
      handleConfirmSelection,
      resolveCurrentConflict,
      navigateConflict,
      handleContinueAnyway,
      handleReviewMedicines,
      handleConfirmAndAddMeds,
      handleGenericOptionPress,
      navigation,
      setChatWizardState,
      setMessages,
      handleViewFullReport,
      handleSend,
    ]
  );

  const renderListHeader = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={{ paddingVertical: 10 }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    return null;
  }, [isLoadingMore, theme.colors.primary]);

  const renderListFooter = useCallback(() => {
    if (isSending && !isActivelyStreaming) {
      return (
        <View style={styles.typingWrapper}>
          <LinearGradient
            colors={["#5B4BFF", "#7C6CFF"]}
            style={styles.typingAvatar}
          >
            <Ionicons name="sparkles" size={14} color="#ffffff" />
          </LinearGradient>
          <TypingIndicator isDark={isDark} />
        </View>
      );
    }
    return null;
  }, [isSending, isActivelyStreaming, isDark]);

  const handleAllergyCardExpand = useCallback(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  const isOnboardingSession = Boolean(onboardingSessionId && !isOnboardingCompleted);

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

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

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

      {/* Report Reference Header */}
      {selectedDocument || (selectedDocuments && selectedDocuments.length > 0) ? (
        <ReportReferenceHeader
          document={selectedDocument || selectedDocuments[0]}
          documents={
            selectedDocuments.length > 0
              ? selectedDocuments
              : selectedDocument
                ? [selectedDocument]
                : []
          }
          isDark={isDark}
          theme={theme}
          preferredLang={preferredLang}
          onPress={() =>
            handleViewFullReport(selectedDocument || selectedDocuments[0])
          }
          onDismiss={() => {
            setSelectedDocument(null);
            setSelectedDocuments([]);
          }}
          onRemoveDocument={(docId) => {
            const updated = selectedDocuments.filter(
              (d: any) => d && (d.id !== docId && d.documentId !== docId),
            );
            setSelectedDocuments(updated);
          }}
        />
      ) : null}

      <Animated.View style={[styles.keyboardContainer, animatedKeyboardStyle]}>
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

        {/* Messages List */}
        <View style={styles.contentWrapper}>
          {activeDateLabel ? (
            <View
              style={styles.stickyDateHeaderContainer}
              pointerEvents="none"
            >
              <ChatDateHeader dateLabel={activeDateLabel} isDark={isDark} />
            </View>
          ) : null}

          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={keyExtractor}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={renderChatItem}
            initialNumToRender={50}
            maxToRenderPerBatch={25}
            windowSize={21}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
            automaticallyAdjustKeyboardInsets={false}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: 16,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onLayout={() => {
              if (displayMessages.length > 0 && (isInitialScrollPendingRef.current || shouldAutoScrollRef.current)) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onContentSizeChange={(_w, h) => {
              const delta = Math.abs(h - lastContentHeightRef.current);
              lastContentHeightRef.current = h;

              if (displayMessages.length === 0 || h === 0) return;

              // Follow content size changes on initial open or whenever following bottom
              if (isInitialScrollPendingRef.current || shouldAutoScrollRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });

                if (initialScrollSettlingTimerRef.current) {
                  clearTimeout(initialScrollSettlingTimerRef.current);
                }
                initialScrollSettlingTimerRef.current = setTimeout(() => {
                  if (isInitialScrollPendingRef.current) {
                    flatListRef.current?.scrollToEnd({ animated: false });
                    isInitialScrollPendingRef.current = false;
                  }
                }, 400);
                return;
              }

              // Active streaming tokens: keep anchored to bottom without animation
              if (shouldAutoScrollRef.current && isActivelyStreaming && delta > 4) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onScroll={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const isCloseToBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;

              // Load more messages when scrolled near top
              if (
                contentOffset.y <= 40 &&
                !isLoadingMore &&
                !isLoadingHistory &&
                hasMoreMessages &&
                isUserInteractingRef.current
              ) {
                loadMoreMessages();
              }

              // During initial load settling, never let passive scroll measurements disable auto-scroll
              if (isInitialScrollPendingRef.current) {
                if (isUserInteractingRef.current) {
                  isInitialScrollPendingRef.current = false;
                  shouldAutoScrollRef.current = isCloseToBottom;
                } else {
                  shouldAutoScrollRef.current = true;
                }
                return;
              }

              // If user is actively dragging or in momentum: update intent based on actual position
              if (isUserInteractingRef.current) {
                shouldAutoScrollRef.current = isCloseToBottom;
                return;
              }

              // Do not let in-flight programmatic scrolls or active streaming layout transients disable auto-scroll
              if (isActivelyStreaming || isProgrammaticScrollingRef.current) {
                if (isCloseToBottom) {
                  shouldAutoScrollRef.current = true;
                }
                return;
              }

              // Passive / programmatic scrolls only re-enable auto-scroll when reaching bottom;
              // never disable auto-scroll unless the user explicitly drags away
              if (isCloseToBottom) {
                shouldAutoScrollRef.current = true;
              }
            }}
            scrollEventThrottle={32}
            onScrollBeginDrag={() => {
              isUserInteractingRef.current = true;
              isProgrammaticScrollingRef.current = false;
              isInitialScrollPendingRef.current = false;
              if (initialScrollSettlingTimerRef.current) {
                clearTimeout(initialScrollSettlingTimerRef.current);
                initialScrollSettlingTimerRef.current = null;
              }
            }}
            onScrollEndDrag={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const isCloseToBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
              shouldAutoScrollRef.current = isCloseToBottom;
              if (!event.nativeEvent.velocity?.y) {
                isUserInteractingRef.current = false;
              }
            }}
            onMomentumScrollEnd={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const isCloseToBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
              shouldAutoScrollRef.current = isCloseToBottom;
              isUserInteractingRef.current = false;
            }}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
          />
        </View>

        {/* Floating Document Mention Dropdown */}
        {mentionDropdownVisible && (
          <DocumentMentionDropdown
            visible={mentionDropdownVisible}
            query={mentionQuery}
            documents={documentsList}
            isLoading={isLoadingDocs}
            isDark={isDark}
            theme={theme}
            onSelectDocument={handleSelectMentionDocument}
            onClose={() => setMentionDropdownVisible(false)}
          />
        )}

        {/* Input & Suggested Chips */}
        <View>
          <SuggestedQuestionChip
            questions={suggestedQuestions}
            onPressQuestion={handleSend}
            isDark={isDark}
          />

          <ChatInput
            inputRef={chatInputRef}
            value={input}
            selection={selectionOverride}
            onSelectionChange={handleSelectionChange}
            onChangeText={handleInputChange}
            onSend={() =>
              handleSend(undefined, undefined, false, activeMentions)
            }
            isSending={isSending}
            isDark={isDark}
            preferredLanguage={preferredLang}
            onAttachPress={() => {
              if (hasActiveUploads) {
                Toast.show({
                  type: "info",
                  position: "top",
                  text1: "Processing in Progress",
                  text2: "A document is currently being processed. Please wait for it to complete.",
                });
                return;
              }
              uploadSheetRef.current?.present();
              Keyboard.dismiss();
            }}
          />
        </View>
      </Animated.View>

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
    position: "relative",
  },
  stickyDateHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 0,
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
