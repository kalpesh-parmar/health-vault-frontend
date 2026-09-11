import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Toast from "react-native-toast-message";
import apiClient from "../../services/apiClient";
import { streamChatResponse } from "../../services/streamService";
import { useTextToSpeech } from "../useTextToSpeech";
import { ChatMessage, ChatMode } from "../../types/chat";
import {
  buildChatHistory,
  normalizeDocumentIds,
  formatChatDateLabel,
  getLocalDayKey,
  parseToLocalDate,
} from "../../utils/chatUtils";
import { I18N_CHAT_UI, SUGGESTED_QUESTIONS_I18N } from "../../constants/chatConstants";

interface UseChatSessionProps {
  initialSessionId?: string;
  documentsList: any[];
  preferredLang: string;
  isOnboardingCompleted: boolean;
  setIsOnboardingCompleted: (val: boolean) => void;
  pendingStep: string | null;
  setPendingStep: (step: string | null) => void;
  filesInfo?: any[];
  lastKnownStateRef?: React.MutableRefObject<any>;
}

export const useChatSession = ({
  initialSessionId,
  documentsList,
  preferredLang,
  isOnboardingCompleted,
  setIsOnboardingCompleted,
  pendingStep,
  setPendingStep,
  filesInfo = [],
  lastKnownStateRef,
}: UseChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onboardingMessages, setOnboardingMessages] = useState<ChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [onboardingSessionId, setOnboardingSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isActivelyStreaming, setIsActivelyStreaming] = useState(false);

  const streamingAbortRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedHistory = useRef(false);
  const isSendingRef = useRef<boolean>(false);

  const {
    speakingMessageId,
    speakMessage,
  } = useTextToSpeech();

  const t = useCallback(
    (key: string) => {
      const lang = preferredLang || "english";
      const dict = I18N_CHAT_UI[lang] || I18N_CHAT_UI.english;
      return dict?.[key] || I18N_CHAT_UI.english[key] || key;
    },
    [preferredLang]
  );

  const clearStreamingTimer = () => {
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
  };

  const abortActiveStream = useCallback(() => {
    clearStreamingTimer();
    if (streamingAbortRef.current) {
      streamingAbortRef.current.abort();
      streamingAbortRef.current = null;
    }
    streamingMessageIdRef.current = null;
    setIsActivelyStreaming(false);
  }, []);

  const upsertAssistantMessage = useCallback(
    (messageId: string, updater: (current?: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === messageId);
        if (index === -1) {
          return [...prev, updater(undefined)];
        }
        const next = [...prev];
        next[index] = updater(next[index]);
        return next;
      });
    },
    []
  );

  const streamNormalChat = async (payload: any) => {
    abortActiveStream();
    const controller = new AbortController();
    streamingAbortRef.current = controller;

    const messageId = `ai-stream-${Date.now()}`;
    streamingMessageIdRef.current = messageId;
    let pendingBuffer = "";
    let displayedText = "";
    let streamFinished = false;
    let finishData: any = null;

    const finalizeStream = (finalData: any) => {
      clearStreamingTimer();
      setIsActivelyStreaming(false);
      const replyText =
        finalData?.reply ||
        finalData?.data?.reply ||
        finalData?.message ||
        finalData?.text ||
        "";

      upsertAssistantMessage(messageId, (current) => {
        const baseMessage = current || {
          id: messageId,
          role: "ai",
          text: "",
          createdAt: new Date().toISOString(),
        };

        return {
          ...baseMessage,
          text: displayedText || replyText || baseMessage.text,
          sessionId: finalData?.sessionId ?? baseMessage.sessionId,
          mode: finalData?.mode ?? baseMessage.mode,
          action:
            finalData?.actionType ||
            finalData?.action ||
            baseMessage.action ||
            "NORMAL_CHAT",
          options: finalData?.options ?? baseMessage.options ?? [],
          medicines: finalData?.medicines ?? baseMessage.medicines ?? [],
          documents: finalData?.documents ?? baseMessage.documents,
          document: finalData?.document ?? baseMessage.document ?? null,
          suggestedQuestions:
            finalData?.suggestedQuestions ??
            baseMessage.suggestedQuestions ??
            [],
          keyFindings:
            finalData?.document?.keyFindings ??
            finalData?.keyFindings ??
            baseMessage.keyFindings ??
            [],
          documentIds:
            normalizeDocumentIds(
              finalData?.documentId,
              finalData?.documentIds,
              finalData?.documents
            ) ?? baseMessage.documentIds,
        };
      });

      if (finalData?.sessionId && !activeSessionId) {
        setActiveSessionId(finalData.sessionId);
        apiClient
          .get("/chat/session", { params: { limit: 50 } })
          .then((res) => {
            setSessions(res.data?.data?.items || res.data?.items || []);
          })
          .catch(() => {});
      }
    };

    streamingTimerRef.current = setInterval(() => {
      if (pendingBuffer.length > 0) {
        let step = 1;
        if (pendingBuffer.length > 80) step = 8;
        else if (pendingBuffer.length > 40) step = 5;
        else if (pendingBuffer.length > 20) step = 3;
        else if (pendingBuffer.length > 8) step = 2;

        const nextChars = pendingBuffer.slice(0, step);
        pendingBuffer = pendingBuffer.slice(step);
        displayedText += nextChars;

        upsertAssistantMessage(messageId, (current) => ({
          ...(current || {
            id: messageId,
            role: "ai",
            text: "",
            createdAt: new Date().toISOString(),
          }),
          text: displayedText,
        }));
      } else if (streamFinished) {
        finalizeStream(finishData);
      }
    }, 20);

    try {
      await streamChatResponse(
        "/v1/onboarding/chat",
        payload,
        {
          onChunk: (chunkText) => {
            if (!chunkText) return;
            setIsActivelyStreaming(true);
            pendingBuffer += chunkText;
          },
          onFinish: (finalData) => {
            finishData = finalData;
            streamFinished = true;
            if (pendingBuffer.length === 0) {
              finalizeStream(finalData);
            }
          },
          onError: (error) => {
            clearStreamingTimer();
            setIsActivelyStreaming(false);
            if (error.message === "Stream cancelled") {
              return;
            }
            console.warn("[AI_CHAT] Streaming request failed:", error.message);
          },
        },
        { signal: controller.signal }
      );
    } finally {
      if (streamingAbortRef.current === controller) {
        streamingAbortRef.current = null;
      }
      streamingMessageIdRef.current = null;
    }
  };

  const fetchOnboardingHistory = useCallback(async () => {
    try {
      const response = await apiClient.get("/v1/onboarding/history");
      const {
        chatSessionId,
        messages: historyItems,
        resumableState,
        currentStep: topLevelCurrentStep,
      } = response.data?.data || {};

      if (chatSessionId) {
        setOnboardingSessionId(chatSessionId);
      }

      const resolvedPendingStep =
        resumableState?.currentStep || topLevelCurrentStep || null;

      const completedFromState = Boolean(
        resumableState?.isOnboardingCompleted ||
          resumableState?.currentStep === "POST_ONBOARDING" ||
          resumableState?.currentStep === "COMPLETE" ||
          resolvedPendingStep === "POST_ONBOARDING" ||
          resolvedPendingStep === "COMPLETE"
      );
      const completedFromHistory = Array.isArray(historyItems)
        ? historyItems.some((dbMsg: any) => {
            const action =
              dbMsg?.metadata?.action || dbMsg?.metadata?.actionType;
            return action === "POST_ONBOARDING" || action === "COMPLETE";
          })
        : false;
      const isComplete = completedFromState || completedFromHistory;
      setIsOnboardingCompleted(isComplete);
      setPendingStep(isComplete ? null : resolvedPendingStep);

      if (lastKnownStateRef && resumableState) {
        lastKnownStateRef.current = resumableState;
      }
      if (chatSessionId && Array.isArray(historyItems)) {
        const seenNotice = new Set<string>();
        const mapped: ChatMessage[] = [];
        for (const dbMsg of historyItems) {
          let meta = dbMsg.metadata;
          if (typeof meta === "string") {
            try {
              meta = JSON.parse(meta);
            } catch {
              meta = {};
            }
          } else {
            meta = meta || {};
          }
          const isNotice =
            meta.action === "ONBOARDING_COMPLETED_NOTICE" ||
            meta.actionType === "ONBOARDING_COMPLETED_NOTICE" ||
            dbMsg.id?.startsWith("ai-comp-");
          if (isNotice) {
            if (seenNotice.has("ONBOARDING_COMPLETED_NOTICE")) {
              continue;
            }
            seenNotice.add("ONBOARDING_COMPLETED_NOTICE");
          }
          const msgAction =
            meta.action ||
            meta.actionType ||
            (isNotice ? "ONBOARDING_COMPLETED_NOTICE" : "NORMAL_CHAT");
          const mappedRole = dbMsg.role === "assistant" ? "ai" : "user";
          const isDuplicateOfPrev =
            mapped.length > 0 &&
            mapped[mapped.length - 1].role === mappedRole &&
            mapped[mapped.length - 1].text?.trim() === dbMsg.content?.trim() &&
            mapped[mapped.length - 1].action === msgAction;
          if (isDuplicateOfPrev) {
            continue;
          }
          mapped.push({
            ...meta,
            id: dbMsg.id,
            role: mappedRole,
            text: dbMsg.content,
            sessionId: chatSessionId,
            createdAt: dbMsg.createdAt,
            action: msgAction,
            document: meta.document || null,
            documentSummary: meta.documentSummary || null,
            suggestedQuestions: meta.suggestedQuestions || [],
            keyFindings:
              meta.document?.keyFindings || meta.keyFindings || [],
            documentIds: normalizeDocumentIds(
              meta.document?.id,
              meta.documentId,
              meta.documentIds,
              meta.documents
            ),
            isOnboardingMessage: true,
          });
        }
        setOnboardingMessages(mapped);
      }
    } catch (err) {
      console.warn("[AI_CHAT] Failed to load onboarding history:", err);
    }
  }, [lastKnownStateRef, setIsOnboardingCompleted, setPendingStep]);

  const initChatHistory = useCallback(async () => {
    hasInitializedHistory.current = true;
    setIsLoadingHistory(true);
    try {
      const sessionsRes = await apiClient.get("/chat/session", {
        params: { limit: 50 },
      });
      const fetchedSessions =
        sessionsRes.data?.data?.items || sessionsRes.data?.items || [];
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0) {
        const mostRecent = fetchedSessions[0];
        setActiveSessionId(mostRecent.id);

        if (mostRecent.documentId) {
          const matchedDoc = documentsList.find(
            (d) => d.id === mostRecent.documentId
          );
          setSelectedDocument(matchedDoc || null);
        } else {
          setSelectedDocument(null);
        }

        const messagesRes = await apiClient.get(
          `/chat/session/${mostRecent.id}/messages`,
          { params: { limit: 20 } }
        );
        const msgItems =
          messagesRes.data?.data?.items || messagesRes.data?.items || [];
        const newCursor =
          messagesRes.data?.data?.nextCursor ||
          messagesRes.data?.nextCursor ||
          null;
        setNextCursor(newCursor);

        const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => {
          let meta = dbMsg.metadata;
          if (typeof meta === "string") {
            try {
              meta = JSON.parse(meta);
            } catch {
              meta = {};
            }
          } else {
            meta = meta || {};
          }
          return {
            ...meta,
            id: dbMsg.id,
            role: dbMsg.role === "assistant" ? "ai" : "user",
            text: dbMsg.content,
            mode: meta.mode as ChatMode,
            createdAt: dbMsg.createdAt,
          };
        });
        setMessages(mapped);
      }
    } catch (e) {
      console.warn("[AI_CHAT] Failed to initialize chat history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [documentsList]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeSessionId || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await apiClient.get(
        `/chat/session/${activeSessionId}/messages`,
        {
          params: { limit: 20, cursor: nextCursor },
        }
      );
      const items = res.data?.data?.items || res.data?.items || [];
      const newCursor =
        res.data?.data?.nextCursor || res.data?.nextCursor || null;
      setNextCursor(newCursor);

      const mapped: ChatMessage[] = items.map((dbMsg: any) => {
        let meta = dbMsg.metadata;
        if (typeof meta === "string") {
          try {
            meta = JSON.parse(meta);
          } catch {
            meta = {};
          }
        } else {
          meta = meta || {};
        }
        return {
          ...meta,
          id: dbMsg.id,
          role: dbMsg.role === "assistant" ? "ai" : "user",
          text: dbMsg.content,
          createdAt: dbMsg.createdAt,
        };
      });
      setMessages((prev) => [...mapped, ...prev]);
    } catch (e) {
      console.warn("[AI_CHAT] Failed to load older messages:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeSessionId, nextCursor, isLoadingMore]);

  const handleSend = async (customText?: string) => {
    const textToSubmit = (customText || input).trim();
    if (!textToSubmit) return;
    if (isSending || isSendingRef.current) return;
    isSendingRef.current = true;

    if (!isOnboardingCompleted && pendingStep) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: textToSubmit,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsSending(true);

      try {
        const latestAssistantMessage = [...messages]
          .reverse()
          .find((msg) => msg.role === "ai");

        const payload: any = {
          sessionId: activeSessionId || onboardingSessionId || undefined,
          preferredLanguage: preferredLang,
          history: buildChatHistory(messages),
          documentId: normalizeDocumentIds(
            latestAssistantMessage?.documentIds,
            latestAssistantMessage?.documents,
            filesInfo
          ),
          message: textToSubmit,
        };

        const response = await apiClient.post("/v1/onboarding/chat", payload);
        const resData = response.data?.data;
        if (resData?.reply) {
          const aiMsg: ChatMessage = {
            id: `ai-opt-res-${Date.now()}`,
            role: "ai",
            text: resData.reply,
            action: resData.actionType || resData.action || "NORMAL_CHAT",
            options: resData.options || [],
            medicines: resData.medicines || [],
            document: resData.document || null,
            documentSummary: resData.documentSummary || null,
            documents: resData.documents || [],
            documentIds: normalizeDocumentIds(
              resData.documentId,
              resData.documentIds,
              resData.documents
            ),
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (
              lastMsg &&
              lastMsg.role === "ai" &&
              lastMsg.action === aiMsg.action &&
              lastMsg.text?.trim() === aiMsg.text?.trim()
            ) {
              return prev;
            }
            let newMessages: ChatMessage[] = [aiMsg];
            if (resData.completionMessage) {
              const hasComp = prev.some(
                (m) =>
                  m.action === "ONBOARDING_COMPLETED_NOTICE" ||
                  m.id?.startsWith("ai-comp-") ||
                  (resData.completionMessageId && m.id === resData.completionMessageId) ||
                  m.text === resData.completionMessage
              );
              if (!hasComp) {
                const compMsg: ChatMessage = {
                  id: resData.completionMessageId || `ai-comp-${Date.now()}`,
                  role: "ai",
                  text: resData.completionMessage,
                  action: "ONBOARDING_COMPLETED_NOTICE",
                  sessionId: activeSessionId || onboardingSessionId || "",
                  createdAt: resData.createdAt || new Date().toISOString(),
                };
                newMessages = [compMsg, aiMsg];
              }
            }
            return [...prev, ...newMessages];
          });

          const nextPendingStep =
            resData?.onboardingState?.currentStep ||
            resData?.state?.currentStep ||
            resData?.actionType ||
            resData?.action ||
            null;
          const isNowCompleted = Boolean(
            resData?.onboardingState?.isOnboardingCompleted ??
              resData?.state?.isOnboardingCompleted ??
              resData?.isOnboardingCompleted ??
              (nextPendingStep === "POST_ONBOARDING" ||
                nextPendingStep === "COMPLETE")
          );
          setIsOnboardingCompleted(isNowCompleted);
          setPendingStep(isNowCompleted ? null : nextPendingStep);
        }
      } catch (err) {
        console.warn("[AI_CHAT] Failed to send onboarding message:", err);
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
      return;
    }

    if (!isOnboardingCompleted) {
      isSendingRef.current = false;
      Toast.show({
        type: "info",
        text1: "Complete onboarding first",
        text2: "Normal chat becomes available after onboarding is complete.",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSubmit,
      documents: selectedDocument
        ? [{ id: selectedDocument.id, fileName: selectedDocument.fileName }]
        : undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const payload = {
        actionType: "NORMAL_CHAT",
        message: textToSubmit,
        sessionId: activeSessionId || onboardingSessionId || undefined,
        preferredLanguage: preferredLang,
        history: buildChatHistory(messages),
        stream: true,
      };

      await streamNormalChat(payload);
    } catch (err) {
      console.warn("[AI_CHAT] Failed to send chat message:", err);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const hasEmergency = useMemo(() => {
    const latest = [...messages].reverse().find((m) => m.role === "ai");
    return Boolean(latest?.emergency);
  }, [messages]);

  const suggestedQuestions = useMemo(() => {
    const langKey = preferredLang || "english";
    const dict =
      SUGGESTED_QUESTIONS_I18N[langKey] || SUGGESTED_QUESTIONS_I18N.english;
    return selectedDocument ? dict.document : dict.general;
  }, [preferredLang, selectedDocument]);

  const mergedMessages = useMemo(() => {
    const liveNewestFirst = [...messages].reverse();
    const onboardingNewestFirst = [...onboardingMessages].reverse();
    const combined = [...liveNewestFirst, ...onboardingNewestFirst];

    const seenIds = new Set<string>();
    const seenNotice = new Set<string>();
    const deduplicated: ChatMessage[] = [];

    for (const msg of combined) {
      if (msg && msg.id) {
        if (seenIds.has(msg.id)) {
          continue;
        }
        seenIds.add(msg.id);
      }
      const isNotice =
        msg.action === "ONBOARDING_COMPLETED_NOTICE" ||
        msg.id?.startsWith("ai-comp-");
      if (isNotice) {
        if (seenNotice.has("ONBOARDING_COMPLETED_NOTICE")) {
          continue;
        }
        seenNotice.add("ONBOARDING_COMPLETED_NOTICE");
      }
      const isDuplicateOfPrev =
        deduplicated.length > 0 &&
        deduplicated[deduplicated.length - 1].role === msg.role &&
        deduplicated[deduplicated.length - 1].text?.trim() === msg.text?.trim() &&
        deduplicated[deduplicated.length - 1].action === msg.action;
      if (isDuplicateOfPrev) {
        continue;
      }
      deduplicated.push(msg);
    }

    return deduplicated;
  }, [messages, onboardingMessages]);

  const dateHeadersMap = useMemo(() => {
    const map: Record<string, string> = {};
    let lastKey = "";
    messages.forEach((msg) => {
      const d = parseToLocalDate(msg.createdAt);
      if (!d) return;
      const dayKey = getLocalDayKey(d);
      if (dayKey !== lastKey) {
        map[msg.id] = formatChatDateLabel(d, preferredLang, t);
        lastKey = dayKey;
      }
    });
    return map;
  }, [messages, preferredLang, t]);

  useEffect(() => {
    return () => {
      abortActiveStream();
    };
  }, [abortActiveStream]);

  return {
    messages,
    setMessages,
    onboardingMessages,
    mergedMessages,
    activeSessionId,
    setActiveSessionId,
    onboardingSessionId,
    setOnboardingSessionId,
    sessions,
    setSessions,
    selectedDocument,
    setSelectedDocument,
    input,
    setInput,
    isSending,
    setIsSending,
    isLoadingHistory,
    isLoadingMore,
    hasMoreMessages: Boolean(nextCursor),
    isActivelyStreaming,
    hasEmergency,
    suggestedQuestions,
    dateHeadersMap,
    handleSend,
    loadMoreMessages,
    initChatHistory,
    fetchOnboardingHistory,
    abortActiveStream,
    speakingMessageId,
    speakMessage,
    t,
  };
};
