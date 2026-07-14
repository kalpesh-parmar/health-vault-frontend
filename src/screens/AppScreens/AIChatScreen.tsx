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
} from "react-native";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";
import { format } from "date-fns";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import {
  ErrorScreen,
  LoadingScreen,
} from "../../components/shared/DefensiveStates";
import { listDocument, sendChatMessage } from "../../services/documentService";
import type { MedicalDocument } from "../../types";
import { safeFilter, safeMap } from "../../utils/arrayUtils";
import apiClient from "../../services/apiClient";
import { ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Reusable Redesigned Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { ChatInput } from "../../components/chat/ChatInput";
import { EmptyChatState } from "../../components/chat/EmptyChatState";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { SuggestedQuestionChip } from "../../components/chat/SuggestedQuestionChip";

import { ResolveProfileSourceCard } from "../../components/chat/widgets/ResolveProfileSourceCard";
import { AskUploadOrSkipCard } from "../../components/chat/widgets/AskUploadOrSkipCard";
import { AddMedicineCard } from "../../components/chat/widgets/AddMedicineCard";
import { ReviewMedicinesListCard } from "../../components/chat/widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "../../components/chat/widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "../../components/chat/widgets/MedicineOptionsPanel";
import { findHistoricalUserReply, HistoricalChips } from "../../components/chat/widgets/HistoricalChips";
import TypingIndicator from "../../components/chat/TypingIndicator";

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
  action?: string;
  options?: any[];
  rawValue?: string;
  stepKey?: string;
  medicine?: any;
  medicines?: any[];
  summary?: any;
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string;
  loginProvider?: string;
};

const I18N_CHAT_UI: Record<string, Record<string, string>> = {
  english: {
    selectModeOrReport: "Select Mode or Report",
    chooseGeneralOrDiscuss: "Choose general health mode or discuss a specific medical report",
    generalHealthChatNoDoc: "General Health Chat (No Document)",
    recentConversations: "Recent Conversations",
    onboardingSessionReadOnly: "Onboarding Session (Read-Only)",
    untitledSession: "Untitled Session",
    noReportsUploaded: "You haven't uploaded any medical reports yet.",
    uploadMedicalReport: "Upload Medical Report",
    seekImmediateAttention: "Seek immediate medical attention",
    emergencyWarning: "This may require urgent medical attention. Please contact emergency services or visit the nearest emergency department immediately.",
    onboardingArchive: "Onboarding Session (Read-Only Archive)",
    documentPrefix: "Document: ",
  },
  gujarati: {
    selectModeOrReport: "મોડ અથવા રિપોર્ટ પસંદ કરો",
    chooseGeneralOrDiscuss: "સામાન્ય સ્વાસ્થ્ય મોડ પસંદ કરો અથવા ચોક્કસ તબીબી અહેવાલ વિશે ચર્ચા કરો",
    generalHealthChatNoDoc: "સામાન્ય સ્વાસ્થ્ય ચર્ચા (કોઈ દસ્તાવેજ નથી)",
    recentConversations: "તાજેતરની વાતચીતો",
    onboardingSessionReadOnly: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટે)",
    untitledSession: "શીર્ષક વગરનું સત્ર",
    noReportsUploaded: "તમે હજી સુધી કોઈ તબીબી અહેવાલો અપલોડ કર્યા નથી.",
    uploadMedicalReport: "તબીબી અહેવાલ અપલોડ કરો",
    seekImmediateAttention: "તાત્કાલિક તબીબી સારવાર મેળવો",
    emergencyWarning: "આ માટે તાત્કાલિક તબીબી સારવારની જરૂર પડી શકે છે. કૃપા કરીને તાત્કાલિક કટોકટી સેવાઓનો સંપર્ક કરો અથવા નજીકના કટોકટી વિભાગની મુલાકાત લો.",
    onboardingArchive: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટેનું આર્કાઇવ)",
    documentPrefix: "દસ્તાવેજ: ",
  },
  hindi: {
    selectModeOrReport: "मोड या रिपोर्ट चुनें",
    chooseGeneralOrDiscuss: "सामान्य स्वास्थ्य मोड चुनें या किसी विशिष्ट मेडिकल रिपोर्ट पर चर्चा करें",
    generalHealthChatNoDoc: "सामान्य स्वास्थ्य चैट (कोई दस्तावेज़ नहीं)",
    recentConversations: "हाल की बातचीत",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए)",
    untitledSession: "बिना शीर्षक का सत्र",
    noReportsUploaded: "आपने अभी तक कोई मेडिकल रिपोर्ट अपलोड नहीं की है।",
    uploadMedicalReport: "मेडिकल रिपोर्ट अपलोड करें",
    seekImmediateAttention: "तुरंत चिकित्सा सहायता लें",
    emergencyWarning: "इसके लिए तत्काल चिकित्सा सहायता की आवश्यकता हो सकती है। कृपया तुरंत आपातकालीन सेवाओं से संपर्क करें या निकटतम आपातकालीन विभाग में जाएं।",
    onboardingArchive: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए पुरालेख)",
    documentPrefix: "दस्तावेज़: ",
  },
  marathi: {
    selectModeOrReport: "मोड किंवा अहवाल निवडा",
    chooseGeneralOrDiscuss: "सामान्य आरोग्य मोड निवडा किंवा विशिष्ट वैद्यकीय अहवालावर चर्चा करा",
    generalHealthChatNoDoc: "सामान्य आरोग्य चॅट (कोणताही दस्तऐवज नाही)",
    recentConversations: "अलीकडील संभाषणे",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठी)",
    untitledSession: "शीर्षक नसलेले सत्र",
    noReportsUploaded: "तुम्ही अद्याप कोणतेही वैद्यकीय अहवाल अपलोड केलेले नाहीत.",
    uploadMedicalReport: "वैद्यकीय अहवाल अपलोड करा",
    seekImmediateAttention: "त्वरित वैद्यकीय मदत घ्या",
    emergencyWarning: "यासाठी त्वरित वैद्यकीय लक्ष देण्याची आवश्यकता असू शकते. कृपया त्वरित आपत्कालीन सेवांशी संपर्क साधा किंवा जवळच्या आपत्कालीन विभागात जा.",
    onboardingArchive: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठीचे संग्रहण)",
    documentPrefix: "दस्तऐवज: ",
  },
  tamil: {
    selectModeOrReport: "முறை அல்லது அறிக்கையைத் தேர்ந்தெடுக்கவும்",
    chooseGeneralOrDiscuss: "பொது சுகாதார முறையைத் தேர்ந்தெடுக்கவும் அல்லது குறிப்பிட்ட மருத்துவ அறிக்கையைப் பற்றி விவாதிக்கவும்",
    generalHealthChatNoDoc: "பொது சுகாதார அரட்டை (ஆவணம் இல்லை)",
    recentConversations: "சமீபத்திய உரையாடல்கள்",
    onboardingSessionReadOnly: "உள்வாங்கல் அமர்வு (படிக்க மட்டும்)",
    untitledSession: "தலைப்பில்லா அமர்வு",
    noReportsUploaded: "நீங்கள் இன்னும் மருத்துவ அறிக்கைகள் எதையும் பதிவேற்றவில்லை.",
    uploadMedicalReport: "மருத்துவ அறிக்கையைப் பதிவேற்றவும்",
    seekImmediateAttention: "உடனடி மருத்துவ உதவியை நாடுங்கள்",
    emergencyWarning: "இதற்கு அவசர மருத்துவ உதவி தேவைப்படலாம். அவசர சேவைகளைத் தொடர்பு கொள்ளவும் அல்லது உடனடியாக அருகிலுள்ள அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும்.",
    onboardingArchive: "உள்வாங்கல் அமர்வு (படிக்க மட்டும் காப்பகம்)",
    documentPrefix: "ஆவணம்: ",
  },
};

const SUGGESTED_QUESTIONS_I18N: Record<string, { general: string[]; document: string[] }> = {
  english: {
    general: [
      "What are symptoms of diabetes?",
      "Reduce cholesterol levels",
      "Healthy blood pressure diet",
      "General heart health advice",
    ],
    document: [
      "Are there any abnormal values?",
      "What medications are prescribed?",
      "Explain the test results simply.",
      "Summarize this medical report.",
    ],
  },
  gujarati: {
    general: [
      "ડાયાબિટીસના લક્ષણો શું છે?",
      "કોલેસ્ટરોલનું સ્તર ઓછું કરો",
      "સ્વસ્થ બ્લડ પ્રેશર માટે આહાર",
      "સામાન્ય હૃદયના સ્વાસ્થ્ય અંગે સલાહ",
    ],
    document: [
      "શું કોઈ અસામાન્ય મૂલ્યો છે?",
      "કઈ દવાઓ સૂચવવામાં આવી છે?",
      "પરીક્ષણ પરિણામો સરળ રીતે સમજાવો.",
      "આ તબીબી અહેવાલનો સારાંશ આપો.",
    ],
  },
  hindi: {
    general: [
      "मधुमेह के लक्षण क्या हैं?",
      "कोलेस्ट्रॉल का स्तर कम करें",
      "स्वस्थ रक्तचाप के लिए आहार",
      "सामान्य हृदय स्वास्थ्य सलाह",
    ],
    document: [
      "क्या कोई असामान्य मूल्य हैं?",
      "कौन सी दवाएं दी गई हैं?",
      "परीक्षण के परिणामों को सरलता से समझाएं।",
      "इस मेडिकल रिपोर्ट का सारांश दें।",
    ],
  },
  marathi: {
    general: [
      "मधुमेहाची लक्षणे काय आहेत?",
      "कोलेस्टेरॉलची पातळी कमी करा",
      "निरोगी रक्तदाबासाठी आहार",
      "सामान्य हृदय आरोग्य सल्ला",
    ],
    document: [
      "काही असामान्य मूल्ये आहेत का?",
      "कोणती औषधे लिहून दिली आहेत?",
      "चाचणी निकाल सोप्या भाषेत स्पष्ट करा.",
      "या वैद्यकीय अहवालाचा सारांश द्या.",
    ],
  },
  tamil: {
    general: [
      "நீரிழிவு நோயின் அறிகுறிகள் என்ன?",
      "கொழுப்பின் அளவை குறைக்கவும்",
      "ஆரோக்கியமான இரத்த அழுத்த உணவு",
      "பொதுவான இதய சுகாதார ஆலோசனை",
    ],
    document: [
      "ஏதேனும் அசாதாரண மதிப்புகள் உள்ளதா?",
      "என்ன மருந்துகள் பரிந்துரைக்கப்படுகின்றன?",
      "சோதனை முடிவுகளை எளிமையாக விளக்கவும்.",
      "இந்த மருத்துவ அறிக்கையை சுருக்கமாகக் கூறவும்.",
    ],
  },
};

const AIChatScreen = () => {
  const navigation = useNavigation();
  const { isDark, theme } = useAppTheme();

  const t = (key: string) => {
    const lang = preferredLang || "english";
    return I18N_CHAT_UI[lang]?.[key] || I18N_CHAT_UI.english[key] || key;
  };
  const [input, setInput] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<MedicalDocument | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [preferredLang, setPreferredLang] = useState("english");
  const [onboardingSessionId, setOnboardingSessionId] = useState<string | null>(null);
  const [onboardingMessages, setOnboardingMessages] = useState<any[]>([]);

  // Fetch onboarding history once on mount
  useEffect(() => {
    const fetchOnboardingHistory = async () => {
      try {
        console.log("[AI_CHAT] Fetching onboarding history...");
        const response = await apiClient.get("/v1/onboarding/history");
        const { chatSessionId, messages: historyItems, resumableState } = response.data?.data || {};
        setOnboardingSessionId(chatSessionId || null);
        if (resumableState?.preferredLanguage) {
          setPreferredLang(resumableState.preferredLanguage);
        }
        if (chatSessionId && Array.isArray(historyItems)) {
          const mapped = historyItems.map((dbMsg: any) => ({
            ...(dbMsg.metadata || {}),
            id: dbMsg.id,
            role: dbMsg.role === "assistant" ? "ai" : "user",
            text: dbMsg.content,
            sessionId: chatSessionId,
          }));
          setOnboardingMessages(mapped);
        }
      } catch (err) {
        console.warn("[AI_CHAT] Failed to load onboarding history:", err);
      }
    };

    fetchOnboardingHistory();
  }, []);
  
  const isOnboardingSession = useMemo(() => {
    const activeSess = sessions.find((s) => s.id === activeSessionId);
    return activeSess?.metadata?.type === "ONBOARDING";
  }, [sessions, activeSessionId]);

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

  const activeMode = selectedDocument
    ? ChatMode.DOCUMENT_RAG
    : ChatMode.GENERAL_HEALTH;

  // Load sessions list and select the most recent session on mount
  useEffect(() => {
    const initChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        console.log("[AI_CHAT] Initializing sessions list...");
        const sessionsRes = await apiClient.get("/chat/session", {
          params: { limit: 50 },
        });
        const fetchedSessions = sessionsRes.data?.data?.items || sessionsRes.data?.items || [];
        setSessions(fetchedSessions);

        if (fetchedSessions.length > 0) {
          const mostRecent = fetchedSessions[0];
          console.log("[AI_CHAT] Selecting most recent session on mount:", mostRecent.id);
          setActiveSessionId(mostRecent.id);

          // Find corresponding document if any
          if (mostRecent.documentId) {
            const matchedDoc = documentsList.find((d) => d.id === mostRecent.documentId);
            setSelectedDocument(matchedDoc || null);
          } else {
            setSelectedDocument(null);
          }

          const messagesRes = await apiClient.get(`/chat/session/${mostRecent.id}/messages`, {
            params: { limit: 20 },
          });
          const msgItems = messagesRes.data?.data?.items || messagesRes.data?.items || [];
          const newCursor = messagesRes.data?.data?.nextCursor || messagesRes.data?.nextCursor || null;
          setNextCursor(newCursor);

          const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => ({
            ...(dbMsg.metadata || {}),
            id: dbMsg.id,
            role: dbMsg.role === "assistant" ? "ai" : "user",
            text: dbMsg.content,
            mode: dbMsg.metadata?.mode as ChatMode,
            emergency: !!dbMsg.metadata?.emergency,
          }));

          setMessages(mapped);
        } else {
          console.log("[AI_CHAT] No historical sessions found.");
          setActiveSessionId(null);
          setMessages([]);
          setNextCursor(null);
        }
      } catch (err) {
        console.warn("[AI_CHAT] Failed to initialize chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initChatHistory();
  }, [documentsList]);

  // Load matched session when document selection is changed manually
  const handleDocumentModeChange = async (doc: MedicalDocument | null) => {
    setSelectedDocument(doc);
    documentSheetRef.current?.dismiss();
    setIsLoadingHistory(true);
    try {
      const matched = sessions.find((s: any) => {
        if (doc) {
          return s.documentId === doc.id;
        } else {
          return !s.documentId && s.metadata?.type !== "ONBOARDING";
        }
      });

      if (matched) {
        setActiveSessionId(matched.id);
        const messagesRes = await apiClient.get(`/chat/session/${matched.id}/messages`, {
          params: { limit: 20 },
        });
        const msgItems = messagesRes.data?.data?.items || messagesRes.data?.items || [];
        const newCursor = messagesRes.data?.data?.nextCursor || messagesRes.data?.nextCursor || null;
        setNextCursor(newCursor);

        const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => ({
          ...(dbMsg.metadata || {}),
          id: dbMsg.id,
          role: dbMsg.role === "assistant" ? "ai" : "user",
          text: dbMsg.content,
          mode: dbMsg.metadata?.mode as ChatMode,
          emergency: !!dbMsg.metadata?.emergency,
        }));
        setMessages(mapped);
      } else {
        console.log("[AI_CHAT] No matching session for mode, starting clean.");
        setActiveSessionId(null);
        setMessages([]);
        setNextCursor(null);
      }
    } catch (err) {
      console.warn("[AI_CHAT] Failed to switch document mode session:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Infinite scroll pagination to load older messages
  const loadMoreMessages = async () => {
    if (isLoadingMore || !nextCursor || !activeSessionId) return;
    setIsLoadingMore(true);
    try {
      const response = await apiClient.get(`/chat/session/${activeSessionId}/messages`, {
        params: { limit: 20, cursor: nextCursor },
      });
      const msgItems = response.data?.data?.items || response.data?.items || [];
      const newCursor = response.data?.data?.nextCursor || response.data?.nextCursor || null;

      const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => ({
        ...(dbMsg.metadata || {}),
        id: dbMsg.id,
        role: dbMsg.role === "assistant" ? "ai" : "user",
        text: dbMsg.content,
        mode: dbMsg.metadata?.mode as ChatMode,
        emergency: !!dbMsg.metadata?.emergency,
      }));

      setMessages((prev) => [...mapped, ...prev]);
      setNextCursor(newCursor);
    } catch (err) {
      console.warn("[AI_CHAT] Failed to load older messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
        sessionId: activeSessionId,
      });

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: response.data?.reply || "No reply from AI",
        mode: response.data?.mode as ChatMode,
        emergency: !!response.data?.emergency,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (response.data?.user?.sessionId && !activeSessionId) {
        setActiveSessionId(response.data.user.sessionId);
        apiClient.get("/chat/session", { params: { limit: 50 } }).then((res) => {
          setSessions(res.data?.data?.items || res.data?.items || []);
        }).catch(() => {});
      }
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


  const hasEmergency = useMemo(() => {
    return messages.some((msg) => msg.emergency === true);
  }, [messages]);

  const suggestedQuestions = useMemo(() => {
    const langKey = preferredLang || "english";
    const questionSource = SUGGESTED_QUESTIONS_I18N[langKey] || SUGGESTED_QUESTIONS_I18N.english;
    return activeMode === ChatMode.DOCUMENT_RAG
      ? questionSource.document
      : questionSource.general;
  }, [activeMode, preferredLang]);

  // Merge live messages and onboarding history (rendered newest-first for inverted FlatList)
  const mergedMessages = useMemo(() => {
    const liveNewestFirst = [...messages].reverse();
    if (selectedDocument) {
      return liveNewestFirst;
    }
    const onboardingNewestFirst = [...onboardingMessages].reverse();
    return [...liveNewestFirst, ...onboardingNewestFirst];
  }, [messages, onboardingMessages, selectedDocument]);

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
    <Container
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
    >
      {/* Sticky Premium AI Header */}
      <ChatHeader
        onBack={() => navigation.goBack()}
        isDark={isDark}
        theme={theme}
      />

      <View
        style={[styles.keyboardContainer, { paddingBottom: keyboardPadding }]}
      >
        {/* Document Selector bar */}
        <DocumentSelector onPress={() => documentSheetRef.current?.present()}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#0f766e" />
          <SelectorText numberOfLines={1}>
            {selectedDocument
              ? `${t("documentPrefix")}${selectedDocument.fileName}`
              : t("generalHealthChatNoDoc")}
          </SelectorText>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </DocumentSelector>

        {/* Emergency Card Display */}
        {hasEmergency && (
          <EmergencyCard>
            <EmergencyTitleRow>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <EmergencyTitle>{t("seekImmediateAttention")}</EmergencyTitle>
            </EmergencyTitleRow>
            <EmergencyText>
              {t("emergencyWarning")}
            </EmergencyText>
          </EmergencyCard>
        )}

        {/* Messages List / Welcome Empty State */}
        <View style={styles.contentWrapper}>
          {isLoadingHistory ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0f766e" />
            </View>
          ) : mergedMessages.length === 0 ? (
            <EmptyChatState
              isDark={isDark}
              suggestedQuestions={suggestedQuestions}
              onPressQuestion={handleSend}
            />
          ) : (
            <FlatList
              data={mergedMessages}
              inverted
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isHistorical = item.sessionId === onboardingSessionId;
                const { chosenVal, chosenLabel } = isHistorical
                  ? findHistoricalUserReply(mergedMessages, item.id, true)
                  : { chosenVal: null, chosenLabel: null };

                const isComplexStep =
                  item.action === "RESOLVE_PROFILE_SOURCE" ||
                  item.action === "ASK_UPLOAD_OR_SKIP" ||
                  item.action === "MEDICINE_OPTIONS" ||
                  item.action === "ADD_MEDICINE" ||
                  item.action === "EDIT_MEDICINE" ||
                  item.action === "REVIEW_MEDICINES_LIST" ||
                  item.action === "CONFIRM_MEDICINE";

                const isExcludedStep =
                  item.action === "FILE_UPLOAD" ||
                  item.action === "ASK_UPLOAD_DOCUMENT" ||
                  item.action === "ASK_DOB" ||
                  item.action === "ASK_MEDICINE_START_DATE" ||
                  item.action === "ASK_MEDICINE_SCHEDULE" ||
                  item.action === "INFO";

                const isChipStep =
                  !isComplexStep &&
                  !isExcludedStep &&
                  item.action !== "COMPLETE" &&
                  item.action !== "POST_ONBOARDING" &&
                  (item.action === "ASK_LANGUAGE" ||
                   item.action === "ASK_GENDER" ||
                   item.action === "ASK_BLOOD_GROUP" ||
                   (item.options && item.options.length > 0));

                const renderAssistantPrompt = (card: React.ReactNode) => {
                  const hasText = item.text && item.text.trim().length > 0;
                  return (
                    <View style={{ width: "100%" }}>
                      {hasText && <MessageBubble message={item} isDark={isDark} />}
                      <View style={styles.optionsWrapper}>
                        {card}
                      </View>
                    </View>
                  );
                };

                if (isHistorical && isComplexStep) {
                  if (item.action === "RESOLVE_PROFILE_SOURCE") {
                    return renderAssistantPrompt(
                      <ResolveProfileSourceCard
                        activeMsg={item}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        sendMessage={() => {}}
                        state={{}}
                        isHistorical={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                  if (item.action === "ASK_UPLOAD_OR_SKIP") {
                    return renderAssistantPrompt(
                      <AskUploadOrSkipCard
                        activeMsg={item}
                        preferredLang={preferredLang}
                        theme={theme}
                        state={{}}
                        setState={() => {}}
                        sendMessage={() => {}}
                        handleDocumentUpload={() => {}}
                        isHistorical={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                  if (item.action === "ADD_MEDICINE" || item.action === "EDIT_MEDICINE") {
                    const med = item.medicine || {};
                    return renderAssistantPrompt(
                      <AddMedicineCard
                        key={item.id}
                        med={med}
                        isEditingLocal={false}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        currentClientMedId={null}
                        setCurrentClientMedId={() => {}}
                        onSave={() => {}}
                        readOnly={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                  if (item.action === "REVIEW_MEDICINES_LIST") {
                    return renderAssistantPrompt(
                      <ReviewMedicinesListCard
                        localMedicines={item.medicines || []}
                        setLocalMedicines={() => {}}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        onConfirm={() => {}}
                        onAddNew={() => {}}
                        onSkipAll={() => {}}
                        onEdit={() => {}}
                        readOnly={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                  if (item.action === "CONFIRM_MEDICINE") {
                    return renderAssistantPrompt(
                      <ConfirmMedicineCard
                        summary={item.summary || {}}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        onConfirm={() => {}}
                        onEdit={() => {}}
                        readOnly={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                  if (item.action === "MEDICINE_OPTIONS") {
                    return renderAssistantPrompt(
                      <MedicineOptionsPanel
                        optionsList={item.options || []}
                        isDark={isDark}
                        theme={theme}
                        onOptionPress={() => {}}
                        readOnly={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />
                    );
                  }
                }

                if (isHistorical && isChipStep) {
                  return (
                    <View style={{ width: "100%" }}>
                      <MessageBubble message={item} isDark={isDark} />
                      <View style={styles.optionsWrapper}>
                        <HistoricalChips
                          options={item.options || []}
                          chosenVal={chosenVal}
                          chosenLabel={chosenLabel}
                          theme={theme}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <MessageBubble message={item} isDark={isDark} />
                );
              }}
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
                isSending ? (
                  <View style={{ flexDirection: "row", alignSelf: "flex-start", paddingLeft: 12, marginTop: 4, marginBottom: 8 }}>
                    <View style={{ alignSelf: "flex-end" }}>
                      <LinearGradient
                        colors={["#0f766e", "#0ea5e9"]}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.3)",
                        }}
                      >
                        <Ionicons name="sparkles" size={14} color="#ffffff" />
                      </LinearGradient>
                    </View>
                    <View style={{ marginLeft: -4 }}>
                      <TypingIndicator isDark={isDark} />
                    </View>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {isOnboardingSession ? (
          <ReadOnlyBanner>
            <Ionicons name="lock-closed" size={16} color="#0f766e" />
            <ReadOnlyText>{t("onboardingArchive")}</ReadOnlyText>
          </ReadOnlyBanner>
        ) : (
          <>
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
          </>
        )}
      </View>

      {/* Document Selector Bottom Sheet */}
      <BottomSheet ref={documentSheetRef} enablePanDownToClose={true}>
        <SheetContentWrapper>
          <BSTitle>{t("selectModeOrReport")}</BSTitle>
          <BSSub>{t("chooseGeneralOrDiscuss")}</BSSub>
          <BSScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BSItem
              selected={selectedDocument === null}
              onPress={() => handleDocumentModeChange(null)}
              activeOpacity={0.7}
            >
              <BSIconBadge
                bgColor={selectedDocument === null ? "#ccfbf1" : "#f1f5f9"}
              >
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={selectedDocument === null ? "#0f766e" : "#64748b"}
                />
              </BSIconBadge>
              <BSLbl selected={selectedDocument === null}>
                {t("generalHealthChatNoDoc")}
              </BSLbl>
              {selectedDocument === null && <BSCheck>✓</BSCheck>}
            </BSItem>

            {documentsList.length === 0 ? (
              <EmptyDocumentsWrapper>
                <EmptyTitle>
                  {t("noReportsUploaded")}
                </EmptyTitle>
                <UploadButton
                  onPress={() => {
                    documentSheetRef.current?.dismiss();
                    (navigation as any).navigate("Home");
                  }}
                >
                  <UploadButtonText>{t("uploadMedicalReport")}</UploadButtonText>
                </UploadButton>
              </EmptyDocumentsWrapper>
            ) : (
              safeMap(documentsList, (doc: MedicalDocument) => (
                <BSItem
                  key={doc.id}
                  selected={selectedDocument?.id === doc.id}
                  onPress={() => handleDocumentModeChange(doc)}
                  activeOpacity={0.7}
                >
                  <BSIconBadge
                    bgColor={
                      selectedDocument?.id === doc.id ? "#ccfbf1" : "#f1f5f9"
                    }
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={
                        selectedDocument?.id === doc.id ? "#0f766e" : "#64748b"
                      }
                    />
                  </BSIconBadge>
                  <BSLbl selected={selectedDocument?.id === doc.id}>
                    {doc.fileName}
                  </BSLbl>
                  {selectedDocument?.id === doc.id && <BSCheck>✓</BSCheck>}
                </BSItem>
              ))
            )}

            {/* Recent Conversations / Session Switcher */}
            {sessions.length > 0 && (
              <>
                <BSTitle style={{ marginTop: 24, marginBottom: 8 }}>{t("recentConversations")}</BSTitle>
                {sessions.map((sess) => {
                  const isSelected = activeSessionId === sess.id;
                  const isOnboarding = sess.metadata?.type === "ONBOARDING";
                  const titleText = isOnboarding
                    ? t("onboardingSessionReadOnly")
                    : sess.title || t("untitledSession");
                  const dateText = sess.lastMessageAt
                    ? format(new Date(sess.lastMessageAt), "MMM dd, yyyy HH:mm")
                    : "";

                  return (
                    <BSItem
                      key={sess.id}
                      selected={isSelected}
                      onPress={async () => {
                        documentSheetRef.current?.dismiss();
                        setActiveSessionId(sess.id);
                        setIsLoadingHistory(true);
                        try {
                          if (sess.documentId) {
                            const matchedDoc = documentsList.find((d) => d.id === sess.documentId);
                            setSelectedDocument(matchedDoc || null);
                          } else {
                            setSelectedDocument(null);
                          }

                          const messagesRes = await apiClient.get(`/chat/session/${sess.id}/messages`, {
                            params: { limit: 20 },
                          });
                          const msgItems = messagesRes.data?.data?.items || messagesRes.data?.items || [];
                          const newCursor = messagesRes.data?.data?.nextCursor || messagesRes.data?.nextCursor || null;
                          setNextCursor(newCursor);

                          const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => ({
                            ...(dbMsg.metadata || {}),
                            id: dbMsg.id,
                            role: dbMsg.role === "assistant" ? "ai" : "user",
                            text: dbMsg.content,
                            mode: dbMsg.metadata?.mode as ChatMode,
                            emergency: !!dbMsg.metadata?.emergency,
                          }));

                          setMessages(mapped);
                        } catch (err) {
                          console.warn("[AI_CHAT] Switch session failed:", err);
                        } finally {
                          setIsLoadingHistory(false);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <BSIconBadge bgColor={isSelected ? "#ccfbf1" : "#f1f5f9"}>
                        <Ionicons
                          name={isOnboarding ? "lock-closed" : "chatbubble-ellipses-outline"}
                          size={20}
                          color={isSelected ? "#0f766e" : "#64748b"}
                        />
                      </BSIconBadge>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <BSLbl selected={isSelected} numberOfLines={1}>
                          {titleText}
                        </BSLbl>
                        {dateText ? (
                          <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {dateText}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && <BSCheck>✓</BSCheck>}
                    </BSItem>
                  );
                })}
              </>
            )}
          </BSScrollView>
        </SheetContentWrapper>
      </BottomSheet>
    </Container>
  );
};

export default AIChatScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const ReadOnlyBanner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin: 12px 16px 16px;
  padding: 14px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const ReadOnlyText = styled.Text`
  font-size: 13.5px;
  font-weight: 700;
  color: #0f766e;
  margin-left: 8px;
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
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 16,
  },
  optionsWrapper: {
    paddingLeft: 48,
    paddingRight: 16,
    marginTop: 2,
    marginBottom: 8,
  },
});
