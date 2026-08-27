import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  formatUTCDateTime,
  getRelativeDateLabel,
} from "../../utils/dateFormatter";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from "react-native-toast-message";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/ContextAPI";
import { useAppTheme } from "../../context/ThemeContext";
import apiClient from "../../services/apiClient";

import {
  requestGalleryPermission,
  requestCameraPermission,
  openGalleryAsset,
  takePhotoAsset,
  pickDocumentAsset,
} from "../../services/mediaServices";
import { getUser } from "../../services/userService";
import {
  uploadDocumentsBatch,
  retryDocumentProcessing,
} from "../../services/documentService";
import {
  connectSseStream,
  SseEventPayload,
} from "../../services/streamService";

// Reusable Redesigned Components
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { ChatDateHeader } from "../../components/chat/ChatDateHeader";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import TypingIndicator from "../../components/chat/TypingIndicator";
import UploadBottomSheet from "../../components/upload/UploadBottomSheet";
import DocumentPreview from "../../components/upload/DocumentPreview";
import UploadValidationDialog from "../../components/upload/UploadValidationDialog";
import ConfirmationModal from "../../components/shared/ConfirmationModal";

import { AddMedicineCard } from "../../components/chat/widgets/AddMedicineCard";
import { ReviewMedicinesListCard } from "../../components/chat/widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "../../components/chat/widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "../../components/chat/widgets/MedicineOptionsPanel";
import { ResolveProfileSourceCard } from "../../components/chat/widgets/ResolveProfileSourceCard";
import { I18N_ONBOARDING_UI as ONBOARDING_I18N } from "../../components/chat/widgets/OnboardingI18n";
import { AskUploadOrSkipCard } from "../../components/chat/widgets/AskUploadOrSkipCard";
import { findHistoricalUserReply } from "../../components/chat/widgets/HistoricalChips";
import { LinearGradient } from "expo-linear-gradient";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  rawValue?: string;
  action?: string;
  options?: any[];
  fields?: any[];
  onboardingState?: any;
  loginSummary?: string;
  documentSummary?: string;
  mode?: string;
  title?: string;
  subtitle?: string;
  explainer?: string;
  loginProvider?: string;
  medicine?: any;
  medicines?: any[];
  summary?: any;
  createdAt?: string | Date;
};

type UserData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  email: string;
  phoneNumber?: string;
};

const getNormalizedLang = (lang: string | null | undefined): string => {
  if (!lang) return "english";
  const l = lang.toLowerCase();
  if (l === "en" || l === "english") return "english";
  if (l === "gu" || l === "gujarati") return "gujarati";
  if (l === "hi" || l === "hindi") return "hindi";
  if (l === "mr" || l === "marathi") return "marathi";
  if (l === "ta" || l === "tamil") return "tamil";
  return l;
};

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const { speakingMessageId, speakMessage } = useTextToSpeech();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const isUploadingRef = useRef(false);
  const isUploadCancelledRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [isEditingProfileManually, setIsEditingProfileManually] =
    useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(true);
  const [actualKeyboardHeight, setActualKeyboardHeight] = useState(0);
  const [activeDateLabel, setActiveDateLabel] = useState<string>("");

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      let topItem = viewableItems[0];
      for (const item of viewableItems) {
        if (item.index < topItem.index) {
          topItem = item;
        }
      }
      const message = topItem.item;
      if (message) {
        if (message.isDateHeader) {
          setActiveDateLabel(message.dateLabel);
        } else if (message.createdAt) {
          const label = getRelativeDateLabel(message.createdAt, true);
          setActiveDateLabel(label);
        }
      }
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
  });

  // State Machine states for OCR Redesign
  const [uploadState, setUploadState] = useState<
    | "idle"
    | "validating"
    | "uploading"
    | "queued"
    | "processing"
    | "success"
    | "failed"
    | "rejected"
    | "timed_out"
    | "cancelled"
  >("idle");
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [pollElapsedTime, setPollElapsedTime] = useState<number>(0);
  const [pollTotalPages, setPollTotalPages] = useState<number>(1);
  const [pollCurrentPage, setPollCurrentPage] = useState<number>(1);
  const [autoRetryCount, setAutoRetryCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeErrorCode, setActiveErrorCode] = useState<string | null>(null);
  const [activeErrorDetails, setActiveErrorDetails] = useState<string | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [versionToken, setVersionToken] = useState<string | null>(null);

  // Safe reference mapping to avoid stale hook variables inside async polling loops
  const isOfflineRef = useRef(false);
  const selectedFileRef = useRef<any>(null);
  const uploadStateRef = useRef<string>("idle");
  const pollActiveRef = useRef<boolean>(false);
  const cancelRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, []);

  useEffect(() => {
    uploadStateRef.current = uploadState;
  }, [uploadState]);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    fileType: "pdf" | "image";
  } | null>(null);
  const [validationDialogVisible, setValidationDialogVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [state, setState] = useState({
    currentStep: null as string | null,
    isOnboardingCompleted: false,
    uploadedMedicalDocument: false,
    documentUploaded: false,
    documentConfirmed: false,
    documentText: "",
    preferredLanguage: null as string | null,
    flowMode: null as string | null,
    documentExtracted: false,
    bloodGroupSkipped: false,
    allergiesSkipped: false,
    hasSocialData: undefined as boolean | undefined,
    foundMedicines: [] as any[],
    medicinesFlowStarted: false,
    medicinesConfirmed: false,
    medicinesToAdd: [] as any[],
    currentMedicineIndex: 0,
    medicinesSavedToDb: false,
    existingUserData: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
      allergies: [] as string[],
      email: "",
      phoneNumber: "",
    } as UserData,
  });

  // Local medicines state for UI checkbox tracking and local edits
  const [localMedicines, setLocalMedicines] = useState<any[]>([]);
  const [activeMedicineToEdit, setActiveMedicineToEdit] = useState<any>(null);
  const [currentClientMedId, setCurrentClientMedId] = useState<string | null>(
    null,
  );

  // Synchronize localMedicines with backend state when it changes
  useEffect(() => {
    if (state?.medicinesToAdd) {
      setLocalMedicines(state.medicinesToAdd);
    }
  }, [state?.medicinesToAdd]);

  const flatListRef = useRef<FlatList>(null);
  const uploadSheetRef = useRef<any>(null);

  // Scroll to end when messages length changes or keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => {
        setKeyboardPadding(Platform.OS === "ios" ? e.endCoordinates.height : 0);
        setActualKeyboardHeight(e.endCoordinates.height);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardPadding(0);
        setActualKeyboardHeight(0);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to end when messages length changes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Network detection check
  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (active) setIsOffline(false);
      } catch {
        if (active) setIsOffline(true);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Startup crash recovery / polling resume hook
  useEffect(() => {
    const resumePendingJob = async () => {
      try {
        const pendingJobId = await AsyncStorage.getItem(
          "onboarding_pending_job_id",
        );
        const pendingDocId = await AsyncStorage.getItem(
          "onboarding_pending_document_id",
        );
        if (
          pendingJobId &&
          pendingJobId !== "null" &&
          pendingJobId !== "undefined" &&
          pendingJobId.trim() !== ""
        ) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(pendingJobId)) {
            console.log(
              "[ONBOARDING] Invalid job ID format in storage, clearing:",
              pendingJobId,
            );
            await AsyncStorage.removeItem("onboarding_pending_job_id");
            await AsyncStorage.removeItem("onboarding_pending_document_id");
            return;
          }
          console.log(
            "[ONBOARDING] Resuming pending job ID on startup:",
            pendingJobId,
          );
          setUploadState("processing");
          startJobPolling(pendingJobId, pendingDocId || pendingJobId);
        }
      } catch (err) {
        console.warn("[ONBOARDING] Failed to resume pending job:", err);
      }
    };

    resumePendingJob();
  }, []);

  // Fetch initial profile
  const { data: userData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  useEffect(() => {
    if (userData) {
      const isCompleted =
        userData.firstName &&
        userData.firstName !== "User" &&
        userData.dateOfBirth &&
        userData.gender;

      const initialUserData: UserData = {
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        dateOfBirth: userData.dateOfBirth
          ? format(new Date(userData.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies) ? userData.allergies : [],
        email: userData.email || "",
      };

      const newState = {
        currentStep: null as string | null,
        isOnboardingCompleted: !!isCompleted,
        uploadedMedicalDocument: false,
        documentUploaded: false,
        documentConfirmed: false,
        documentText: "",
        preferredLanguage: null,
        flowMode: null,
        documentExtracted: false,
        bloodGroupSkipped: false,
        allergiesSkipped: false,
        hasSocialData: undefined,
        foundMedicines: [],
        medicinesFlowStarted: false,
        medicinesConfirmed: false,
        medicinesToAdd: [],
        currentMedicineIndex: 0,
        medicinesSavedToDb: false,
        existingUserData: initialUserData,
      };

      const fetchOnboardingHistory = async () => {
        setLoading(true);
        try {
          console.log("[ONBOARDING] Fetching onboarding history...");
          const response = await apiClient.get("/v1/onboarding/history");
          const {
            chatSessionId,
            messages: historyItems,
            resumableState,
          } = response.data?.data || {};

          let mergedState = { ...newState };
          if (resumableState) {
            mergedState = {
              ...mergedState,
              ...resumableState,
            };
          }

          setState(mergedState);

          if (
            chatSessionId &&
            Array.isArray(historyItems) &&
            historyItems.length > 0
          ) {
            console.log(
              "[ONBOARDING] Replaying",
              historyItems.length,
              "historical messages.",
            );
            const mappedMessages: Message[] = historyItems.map(
              (dbMsg: any) => ({
                ...(dbMsg.metadata || {}),
                id: dbMsg.id,
                role: dbMsg.role,
                content: dbMsg.content,
                createdAt: dbMsg.createdAt,
              }),
            );

            setMessages(mappedMessages);
            setLoading(false);
            return;
          }

          // If no session or no history, start fresh with "hello"
          await startOnboardingChat(mergedState);
        } catch (error) {
          console.error(
            "[ONBOARDING] Failed to load onboarding history:",
            error,
          );
          // Fallback: start fresh
          await startOnboardingChat(newState);
        } finally {
          setLoading(false);
        }
      };

      if (messages.length === 0) {
        fetchOnboardingHistory();
      }
    }
  }, [userData]);

  const startOnboardingChat = async (currentState: typeof state) => {
    setLoading(true);
    try {
      const payload = {
        message: "hello",
        history: [],
        state: currentState,
        stream: false,
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;
      console.log("Onboarding Chat Response :- ", resData);

      if (resData) {
        processAssistantResponse(resData, currentState);
      }
    } catch (error: any) {
      console.error("[Onboarding] Start failed:", error);
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Failed to connect to the onboarding assistant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAssistantResponse = (aiRes: any, currentState: typeof state) => {
    const messageContent =
      aiRes.reply || aiRes.message || aiRes.message_en || aiRes.message_gu;

    const action = aiRes.actionType || aiRes.action;

    const newMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: messageContent || "Please provide the information.",
      action,
      options: aiRes.options,
      fields: aiRes.fields,
      onboardingState: aiRes.onboardingState,
      loginSummary: aiRes.loginSummary,
      documentSummary: aiRes.documentSummary,
      mode: aiRes.mode,
      title: aiRes.title,
      subtitle: aiRes.subtitle,
      explainer: aiRes.explainer,
      loginProvider: aiRes.loginProvider,
      medicine: aiRes.medicine,
      medicines: aiRes.medicines,
      summary: aiRes.summary,
      createdAt: aiRes.createdAt || new Date().toISOString(),
    };

    if (action === "RESOLVE_PROFILE_SOURCE") {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (m) => m.action === "RESOLVE_PROFILE_SOURCE",
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          const existingMsg = updated[existingIndex];
          updated[existingIndex] = {
            ...existingMsg,
            content: newMsg.content,
            options: newMsg.options,
            fields: newMsg.fields,
            onboardingState: aiRes.onboardingState,
            loginSummary: newMsg.loginSummary,
            documentSummary: newMsg.documentSummary,
            mode: newMsg.mode,
            title: newMsg.title,
            subtitle: newMsg.subtitle,
            explainer: newMsg.explainer,
            loginProvider: newMsg.loginProvider,
            createdAt: newMsg.createdAt,
          };
          return updated;
        }
        return [...prev, newMsg];
      });
    } else {
      setMessages((prev) => [...prev, newMsg]);
    }

    let updatedUserData = { ...currentState.existingUserData };

    if (aiRes.extractedData) {
      updatedUserData = {
        ...updatedUserData,
        ...aiRes.extractedData,
      };
    }

    let finalState = { ...currentState };

    if (aiRes.state) {
      finalState = {
        ...finalState,
        ...aiRes.state,
      };
    } else {
      finalState = {
        ...finalState,
        preferredLanguage:
          aiRes.preferredLanguage || finalState.preferredLanguage,
        flowMode: aiRes.flowMode || finalState.flowMode,
        documentUploaded:
          aiRes.documentUploaded !== undefined
            ? aiRes.documentUploaded
            : finalState.documentUploaded,
        documentConfirmed:
          aiRes.documentConfirmed !== undefined
            ? aiRes.documentConfirmed
            : finalState.documentConfirmed,
        documentExtracted:
          aiRes.documentExtracted !== undefined
            ? aiRes.documentExtracted
            : finalState.documentExtracted,
        bloodGroupSkipped:
          aiRes.bloodGroupSkipped !== undefined
            ? aiRes.bloodGroupSkipped
            : finalState.bloodGroupSkipped,
        allergiesSkipped:
          aiRes.allergiesSkipped !== undefined
            ? aiRes.allergiesSkipped
            : finalState.allergiesSkipped,
        hasSocialData:
          aiRes.hasSocialData !== undefined
            ? aiRes.hasSocialData
            : finalState.hasSocialData,
        foundMedicines: aiRes.foundMedicines || finalState.foundMedicines,
        medicinesFlowStarted:
          aiRes.medicinesFlowStarted !== undefined
            ? aiRes.medicinesFlowStarted
            : finalState.medicinesFlowStarted,
        medicinesConfirmed:
          aiRes.medicinesConfirmed !== undefined
            ? aiRes.medicinesConfirmed
            : finalState.medicinesConfirmed,
        medicinesToAdd:
          aiRes.medicinesToAdd || aiRes.medicines || finalState.medicinesToAdd,
        currentMedicineIndex:
          aiRes.currentMedicineIndex !== undefined
            ? aiRes.currentMedicineIndex
            : finalState.currentMedicineIndex,
        medicinesSavedToDb:
          aiRes.medicinesSavedToDb !== undefined
            ? aiRes.medicinesSavedToDb
            : finalState.medicinesSavedToDb,
        existingUserData: updatedUserData,
      };
    }

    finalState.preferredLanguage = getNormalizedLang(
      finalState.preferredLanguage,
    );
    setState(finalState);

    if (finalState.documentExtracted) {
      setUploadProgress(null);
    }
  };

  const sendMessage = async (
    userText: string,
    updatedState = state,
    displayLabel?: string,
  ) => {
    if (!userText.trim()) return;

    let isEditSave = false;
    try {
      if (userText.startsWith("{") && userText.includes('"edited"')) {
        const parsed = JSON.parse(userText);
        if (parsed && parsed.edited && !parsed.confirmed) {
          isEditSave = true;
        }
      }
    } catch {
      // ignore non-json
    }

    if (!isEditSave) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: displayLabel || userText,
        rawValue: userText, // Store raw value for live matching!
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
    }
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload = {
        message: userText,
        history,
        state: updatedState,
        displayLabel,
        stream: false,
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;
      console.log("Onboarding sendMessage Response :- ", resData);

      if (resData) {
        processAssistantResponse(resData, updatedState);
        const action = resData.actionType || resData.action;
        if (
          action === "COMPLETE" ||
          action === "POST_ONBOARDING" ||
          resData.state?.isOnboardingCompleted
        ) {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        }
      }
    } catch (error: any) {
      console.error("[Onboarding] Send message failed:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to get response from onboarding assistant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    setDatePickerVisible(false);
    if (datePickerMode === "time") {
      const timeString = format(date, "hh:mm a");
      sendMessage(timeString, state);
    } else {
      const dobString = format(date, "yyyy-MM-dd");
      if (isEditingProfileManually) {
        setEditedProfileData((prev: any) => ({
          ...prev,
          dateOfBirth: dobString,
        }));
      } else {
        const updatedUserData = {
          ...state.existingUserData,
          dateOfBirth: dobString,
        };
        const newState = {
          ...state,
          existingUserData: updatedUserData,
        };
        setState(newState);
        sendMessage(dobString, newState);
      }
    }
  };

  const handleSend = () => {
    const textToSubmit = input.trim();
    if (selectedFile) {
      uploadSelectedFile(selectedFile);
    } else if (textToSubmit) {
      sendMessage(textToSubmit);
    }
  };

  // Upload actions for BottomSheet
  const handleTakePhoto = async () => {
    if (loading) return;
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Camera permission is required to capture photos of reports.",
      });
      return;
    }

    const asset = await takePhotoAsset();
    if (!asset) return;

    const uriParts = asset.uri.split(".");
    console.log("[ONBOARDING] FILE URI :- ", asset?.uri);
    const ext = uriParts[uriParts.length - 1] || "jpg";
    const name = `report_${Date.now()}.${ext}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      fileType: "image" as const,
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleChooseGallery = async () => {
    if (loading) return;
    const permission = await requestGalleryPermission();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Gallery permission is required to select photos of reports.",
      });
      return;
    }

    const asset = await openGalleryAsset();
    if (!asset) return;

    const uriParts = asset.uri.split(".");
    console.log("[ONBOARDING] ASSET :- ", asset);
    const ext = uriParts[uriParts.length - 1] || "jpg";
    const name = asset.fileName || `report_${Date.now()}.${ext}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      fileType: "image" as const,
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleChooseDocument = async () => {
    if (loading) return;
    const asset = await pickDocumentAsset();
    if (!asset) return;

    const isPdf =
      asset.name?.toLowerCase().endsWith(".pdf") ||
      asset.mimeType === "application/pdf";
    const name = asset.name || `report_${Date.now()}.${isPdf ? "pdf" : "jpg"}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
      size: asset.size,
      fileType: (isPdf ? "pdf" : "image") as "pdf" | "image",
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleDocumentUpload = () => {
    if (loading) return;
    Keyboard.dismiss();
    uploadSheetRef.current?.present();
  };

  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const sseUnsubRef = useRef<(() => void) | null>(null);
  const currentDocIdRef = useRef<string | null>(null);

  const startJobPolling = async (
    jobId: string,
    documentId: string,
    streamUrlOverride?: string,
  ) => {
    pollActiveRef.current = true;
    cancelRequestedRef.current = false;
    setUploadState("queued");
    setPollElapsedTime(0);
    setPollCurrentPage(1);
    setPollTotalPages(1);

    if (sseUnsubRef.current) {
      sseUnsubRef.current();
      sseUnsubRef.current = null;
    }

    const streamUrl = streamUrlOverride || `/sse/files/${jobId}/stream`;

    sseUnsubRef.current = connectSseStream({
      endpoint: streamUrl,
      onEvent: async (event: SseEventPayload) => {
        if (!pollActiveRef.current || cancelRequestedRef.current) return;

        const isCompleted =
          event.stage === "COMPLETED" ||
          event.stageStatus === "COMPLETED" ||
          event.type === "document.completed" ||
          (event.status === "SUCCESS" && event.percentage === 100);

        const isFailed =
          event.stage === "FAILED" ||
          event.stageStatus === "FAILED" ||
          event.type === "document.failed" ||
          event.status === "FAILED";

        const isRejected =
          event.stage === "REJECTED" ||
          event.stageStatus === "REJECTED" ||
          event.type === "document.rejected" ||
          event.status === "REJECTED" ||
          (event.message && event.message.toLowerCase().includes("reject"));

        if (isCompleted) {
          pollActiveRef.current = false;
          if (sseUnsubRef.current) {
            sseUnsubRef.current();
            sseUnsubRef.current = null;
          }
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("success");
          setTimeout(() => {
            setUploadState("idle");
          }, 3000);
          await handleCompletedJob(
            documentId,
            selectedFileRef.current?.name || "report.pdf",
          );
          return;
        }

        if (isRejected) {
          pollActiveRef.current = false;
          if (sseUnsubRef.current) {
            sseUnsubRef.current();
            sseUnsubRef.current = null;
          }
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("rejected");
          Toast.show({
            type: "error",
            text1: "Document Rejected",
            text2: event.message || "Document was rejected.",
          });
          return;
        }

        if (isFailed) {
          pollActiveRef.current = false;
          if (sseUnsubRef.current) {
            sseUnsubRef.current();
            sseUnsubRef.current = null;
          }
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("failed");
          Toast.show({
            type: "error",
            text1: "Analysis Failed",
            text2: event.message || "Document analysis failed.",
          });
          return;
        }

        setUploadState("processing");
        if (typeof event.percentage === "number") {
          setUploadPercent(event.percentage);
        } else if (typeof event.progress === "number") {
          setUploadPercent(event.progress);
        }
        if (event.extra?.totalPages) {
          setPollTotalPages(event.extra.totalPages);
          if (event.extra.page) {
            setPollCurrentPage(event.extra.page);
          }
        }
      },
      onTerminal: async (event: SseEventPayload) => {
        if (!pollActiveRef.current || cancelRequestedRef.current) return;

        const isCompleted =
          event.stage === "COMPLETED" ||
          event.stageStatus === "COMPLETED" ||
          event.type === "document.completed" ||
          (event.status === "SUCCESS" && event.percentage === 100);

        const isFailed =
          event.stage === "FAILED" ||
          event.stageStatus === "FAILED" ||
          event.type === "document.failed" ||
          event.status === "FAILED";

        const isRejected =
          event.stage === "REJECTED" ||
          event.stageStatus === "REJECTED" ||
          event.type === "document.rejected" ||
          event.status === "REJECTED" ||
          (event.message && event.message.toLowerCase().includes("reject"));

        if (!isCompleted && !isFailed && !isRejected) {
          // Ignore false positive terminal events (e.g. status: SUCCESS but percentage !== 100)
          return;
        }

        pollActiveRef.current = false;
        if (sseUnsubRef.current) {
          sseUnsubRef.current();
          sseUnsubRef.current = null;
        }

        if (isCompleted) {
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("success");
          setTimeout(() => {
            setUploadState("idle");
          }, 3000);
          await handleCompletedJob(
            documentId,
            selectedFileRef.current?.name || "report.pdf",
          );
        } else if (isRejected) {
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("rejected");
          Toast.show({
            type: "error",
            text1: "Document Rejected",
            text2: event.message || "Document was rejected.",
          });
        } else {
          await AsyncStorage.removeItem("onboarding_pending_job_id");
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("failed");
          Toast.show({
            type: "error",
            text1: "Analysis Failed",
            text2: event.message || "Document analysis failed.",
          });
        }
      },
      onError: (err) => {
        console.warn("[ONBOARDING SSE Error]:", err.message);
      },
    });
  };

  const handleRetryJob = async () => {
    const docId = currentDocIdRef.current;
    if (!docId) return;

    setUploadState("queued");
    setUploadPercent(0);
    try {
      const response = await retryDocumentProcessing({ fileKey: docId });
      const streamUrl = response.data?.streamUrl;
      const jobId = response.data?.fileKey || docId;

      await AsyncStorage.setItem("onboarding_pending_job_id", jobId);
      await AsyncStorage.setItem("onboarding_pending_document_id", docId);

      startJobPolling(jobId, docId, streamUrl);
    } catch (err: any) {
      setUploadState("failed");
      Toast.show({
        type: "error",
        text1: "Retry Failed",
        text2: err.message || "Failed to retry document.",
      });
    }
  };

  const handleCancelJob = async (documentId: string) => {
    try {
      await AsyncStorage.removeItem("onboarding_pending_job_id");
      await AsyncStorage.removeItem("onboarding_pending_document_id");
    } catch (err) {
      console.warn("[ONBOARDING] Failed to clear storage on cancel:", err);
    }
    setUploadState("cancelled");
    Toast.show({ type: "info", text1: "Upload cancelled" });
  };

  const handleChooseDifferentFile = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setInput("");
    setIdempotencyKey(null);
    setVersionToken(null);
  };

  const cancelProcessing = async () => {
    cancelRequestedRef.current = true;
    pollActiveRef.current = false;
    if (sseUnsubRef.current) {
      sseUnsubRef.current();
      sseUnsubRef.current = null;
    }
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    const pendingDocId = await AsyncStorage.getItem(
      "onboarding_pending_document_id",
    );
    if (pendingDocId) {
      await handleCancelJob(pendingDocId);
    } else {
      setUploadState("cancelled");
      Toast.show({ type: "info", text1: "Upload cancelled" });
    }
  };

  const handleCompletedJob = async (documentId: string, fileName: string) => {
    const newState = {
      ...state,
      flowMode: "UPLOAD",
      uploadedMedicalDocument: true,
      documentUploaded: true,
      documentId: documentId,
    };

    setState(newState);
    setUploadProgress(null);
    setSelectedFile(null);
    setInput("");

    await sendMessage(
      "DOCUMENT_UPLOADED",
      newState,
      "Document Uploaded: " + fileName,
    );

    setTimeout(() => {
      setUploadState("idle");
    }, 2500);
  };

  const uploadSelectedFile = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return;
    if (isUploadingRef.current) {
      console.log(
        "[ONBOARDING] Upload already in progress. Ignoring duplicate trigger.",
      );
      return;
    }

    if (fileToUpload.size && fileToUpload.size > 18 * 1024 * 1024) {
      Toast.show({
        type: "info",
        text1: "Large File Notice",
        text2: "Files over 18MB may take slightly longer to process.",
      });
    }

    isUploadingRef.current = true;
    isUploadCancelledRef.current = false;
    setLoading(true);
    setUploadState("validating");
    setActiveErrorCode(null);
    setActiveErrorDetails(null);
    setUploadPercent(0);

    const patientId = userData?.id;
    if (!patientId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Patient profile missing. Please log in again.",
      });
      isUploadingRef.current = false;
      setLoading(false);
      return;
    }

    try {
      setUploadState("uploading");
      const uploadRes = await uploadDocumentsBatch([fileToUpload]);
      const responseData = (uploadRes as any)?.data || uploadRes;
      const documents = responseData?.documents;
      const createdItem = documents?.[0];

      if (!createdItem || (!createdItem.jobId && !createdItem.fileKey)) {
        throw new Error("Upload failed: No job ID returned from server.");
      }

      const jobId = createdItem.jobId || createdItem.fileKey;
      const docId = createdItem.fileKey || createdItem.jobId;
      const streamUrl = createdItem.streamUrl;
      currentDocIdRef.current = docId;

      console.log(
        "[ONBOARDING] File uploaded successfully. JobId:",
        jobId,
        "DocId:",
        docId,
      );

      await AsyncStorage.setItem("onboarding_pending_job_id", jobId);
      await AsyncStorage.setItem("onboarding_pending_document_id", docId);

      startJobPolling(jobId, docId, streamUrl);
    } catch (error: any) {
      console.error("[ONBOARDING] Document upload sequence failed:", error);
      setUploadState("idle");
      let errMsg = error.message || "Document upload sequence failed.";

      if (error.response) {
        const backendErr = error.response.data?.error;
        if (backendErr?.message) errMsg = backendErr.message;
      }

      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: errMsg,
      });
    } finally {
      isUploadingRef.current = false;
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    isUploadCancelledRef.current = true;
    setSelectedFile(null);
    setInput("");
  };

  const handleSelectAgain = () => {
    setValidationDialogVisible(false);
    setSelectedFile(null);
    setInput("");
    setTimeout(() => {
      uploadSheetRef.current?.present();
    }, 300);
  };

  const handleContinueManual = () => {
    setValidationDialogVisible(false);
    setSelectedFile(null);
    setInput("");
    const newState = { ...state, flowMode: "MANUAL" };
    setState(newState);
    sendMessage("MANUAL", newState);
  };

  const renderOptions = (activeMsg: Message, isHistorical: boolean = false) => {
    const preferredLang = state.preferredLanguage || "english";

    const { chosenVal, chosenLabel } = findHistoricalUserReply(
      messages,
      activeMsg.id,
      false,
    );

    const uiT = (key: string) => {
      const lang = preferredLang || "english";
      const dict =
        ONBOARDING_I18N[lang.toLowerCase()] || ONBOARDING_I18N.english;
      return dict[key] || ONBOARDING_I18N.english[key] || key;
    };

    const handleOptionPress = (value: string, label: string) => {
      if (value === "GO_TO_DASHBOARD" || value === "DASHBOARD") {
        sendMessage(value, state, label);
      } else if (value === "ADD_MORE_MEDICINES" || value === "ADD") {
        sendMessage(value, state, label);
      } else if (value === "VIEW_MEDICINES" || value === "VIEW_MY_MEDICINES") {
        setTimeout(() => {
          navigation.navigate("MEDICATION", {
            screen: "MedicationList",
          });
        }, 500);
      } else if (value === "ASK_ABOUT_REPORT" || value === "ASK_REPORT") {
        sendMessage(value, state, label);
        setTimeout(() => {
          navigation.navigate("HOME", {
            screen: "AIChatScreen",
          });
        }, 500);
      } else if (value === "LOGOUT") {
        logout();
      } else {
        sendMessage(value, state, label);
      }
    };

    if (activeMsg.action === "RESOLVE_PROFILE_SOURCE") {
      return (
        <ResolveProfileSourceCard
          activeMsg={activeMsg}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          sendMessage={sendMessage}
          state={state}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "ASK_LANGUAGE") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {(activeMsg.options || []).map((opt) => {
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(opt.value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(opt.label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() => {
                  const newState = {
                    ...state,
                    preferredLanguage: getNormalizedLang(opt.value),
                  };
                  setState(newState);
                  sendMessage(opt.value, newState, opt.label);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{opt.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.action === "ASK_UPLOAD_OR_SKIP") {
      const isProcessingOrSuccess = [
        "uploading",
        "processing",
        "validating",
        "queued",
        "success",
      ].includes(uploadState);
      return (
        <AskUploadOrSkipCard
          activeMsg={activeMsg}
          preferredLang={preferredLang}
          theme={theme}
          state={state}
          setState={setState}
          sendMessage={sendMessage}
          handleDocumentUpload={handleDocumentUpload}
          isHistorical={isHistorical || isProcessingOrSuccess}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "ASK_GENDER") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {(activeMsg.options || []).map((opt) => {
            const label = opt.label;
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(opt.value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() => {
                  const updatedUserData = {
                    ...state.existingUserData,
                    gender: opt.value,
                  };
                  const newState = {
                    ...state,
                    existingUserData: updatedUserData,
                  };
                  setState(newState);
                  sendMessage(opt.value, newState, label);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (
      activeMsg.action === "ASK_DOB" ||
      activeMsg.action === "ASK_MEDICINE_START_DATE"
    ) {
      const displayDate = uiT("chooseDate");
      return (
        <View
          style={styles.actionRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: 1,
                borderWidth: isHistorical ? 2 : 0,
                borderColor: isHistorical ? "#ffffff" : "transparent",
              },
            ]}
            onPress={() => {
              setDatePickerMode("date");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name={isHistorical ? "checkmark-circle" : "calendar"}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>{displayDate}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_MEDICINE_SCHEDULE") {
      const displayTime = uiT("chooseTime");
      return (
        <View
          style={styles.actionRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: 1,
                borderWidth: isHistorical ? 2 : 0,
                borderColor: isHistorical ? "#ffffff" : "transparent",
              },
            ]}
            onPress={() => {
              setDatePickerMode("time");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name={isHistorical ? "checkmark-circle" : "time"}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>{displayTime}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      activeMsg.action === "ADD_MEDICINE" || // "EXTRACTED_MEDICINES"
      activeMsg.action === "EDIT_MEDICINE" ||
      (activeMedicineToEdit && !isHistorical)
    ) {
      const med =
        (isHistorical
          ? activeMsg.medicine
          : activeMedicineToEdit || activeMsg.medicine) || {};
      const isEditingLocal = !isHistorical && !!activeMedicineToEdit;

      const handleSave = (updatedMed: any) => {
        if (isEditingLocal) {
          const updatedMeds = localMedicines.map((m) =>
            (m.client_med_id || m.id) === (med.client_med_id || med.id)
              ? {
                  ...m,
                  ...updatedMed,
                  subtitle:
                    updatedMed.type === "TABLET" ||
                    updatedMed.type === "CAPSULE"
                      ? `${updatedMed.dose.count} ${updatedMed.type.toLowerCase()}(s) · ${updatedMed.frequency.toLowerCase()}`
                      : `${updatedMed.dose.value} ${updatedMed.dose.unit} · ${updatedMed.frequency.toLowerCase()}`,
                }
              : m,
          );
          setLocalMedicines(updatedMeds);
          setState((prev) => ({
            ...prev,
            medicinesToAdd: updatedMeds,
          }));

          setActiveMedicineToEdit(null);
          setMessages((prev) =>
            prev
              .map((msg) => {
                // if (msg.action === "CONFIRM_MEDICINE") {
                //   return {
                //     ...msg,
                //     summary: {
                //       ...msg.summary,
                //       medicines: updatedMeds,
                //     },
                //     medicines: updatedMeds,
                //   };
                // }
                if (msg.action === "REVIEW_MEDICINES_LIST") {
                  return {
                    ...msg,
                    medicines: updatedMeds,
                  };
                }
                return msg;
              })
              .filter((m) => m.id !== activeMsg.id),
          );
        } else {
          setCurrentClientMedId(null);
          const displayLabel =
            preferredLang === "gujarati" || preferredLang === "gu"
              ? `દવા ઉમેરો: ${updatedMed.name}`
              : preferredLang === "hindi" || preferredLang === "hi"
                ? `દવા જોડેં: ${updatedMed.name}`
                : preferredLang === "marathi" || preferredLang === "mr"
                  ? `औषध जोडा: ${updatedMed.name}`
                  : preferredLang === "tamil" || preferredLang === "ta"
                    ? `மருந்தைச் சேர்: ${updatedMed.name}`
                    : `Add medicine: ${updatedMed.name}`;
          sendMessage(
            JSON.stringify({
              medicine: updatedMed,
              clientMedId: currentClientMedId,
            }),
            state,
            displayLabel,
          );
        }
      };

      return (
        <AddMedicineCard
          key={med.client_med_id || med.id || "new"}
          med={med}
          isEditingLocal={isEditingLocal}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          currentClientMedId={currentClientMedId}
          setCurrentClientMedId={setCurrentClientMedId}
          onSave={handleSave}
          onCancel={
            isEditingLocal
              ? () => {
                  setActiveMedicineToEdit(null);
                  setMessages((prev) =>
                    prev.filter((m) => m.id !== activeMsg.id),
                  );
                }
              : undefined
          }
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "REVIEW_MEDICINES_LIST") {
      const handleConfirm = (checkedMeds: string[]) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMsg.id
              ? {
                  ...msg,
                  medicines: (msg.medicines || localMedicines || []).map(
                    (m) => ({
                      ...m,
                      selected: checkedMeds.includes(m.id),
                    }),
                  ),
                }
              : msg,
          ),
        );
        sendMessage(
          JSON.stringify({ selected: checkedMeds }),
          state,
          uiT("confirmSelection"),
        );
      };
      const handleAddNew = () => {
        sendMessage(JSON.stringify({ addNew: true }), state, uiT("addNew"));
      };
      const handleSkipAll = () => {
        sendMessage(JSON.stringify({ skipAll: true }), state, uiT("skipAll"));
      };
      const handleEdit = (med: any) => {
        setActiveMedicineToEdit(med);
        const newMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: uiT("editMedicationDetails"),
          action: "EDIT_MEDICINE",
          medicine: med,
        };
        setMessages((prev) => [...prev, newMsg]);
      };

      return (
        <ReviewMedicinesListCard
          localMedicines={
            isHistorical ? activeMsg.medicines || [] : localMedicines
          }
          setLocalMedicines={setLocalMedicines}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onAddNew={handleAddNew}
          onSkipAll={handleSkipAll}
          onEdit={handleEdit}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    // if (activeMsg.action === "CONFIRM_MEDICINE") {
    //   const handleConfirm = () => {
    //     const displayLabel =
    //       preferredLang === "gujarati" || preferredLang === "gu"
    //         ? "હા, યોગ્ય છે"
    //         : preferredLang === "hindi" || preferredLang === "hi"
    //           ? "हाँ, सही है"
    //           : preferredLang === "marathi" || preferredLang === "mr"
    //             ? "होय, योग्य आहे"
    //             : preferredLang === "tamil" || preferredLang === "ta"
    //               ? "ஆம், சரியானது"
    //               : "Yes, Correct";

    //     const updatedState = {
    //       ...state,
    //       medicinesToAdd: localMedicines,
    //     };

    //     sendMessage(
    //       JSON.stringify({
    //         confirmed: true,
    //         medicines: localMedicines,
    //         medications: localMedicines,
    //       }),
    //       updatedState,
    //       displayLabel,
    //     );
    //   };
    //   const handleEdit = (med?: any) => {
    //     if (med) {
    //       setActiveMedicineToEdit(med);
    //       const newMsg: Message = {
    //         id: `ai-${Date.now()}`,
    //         role: "assistant",
    //         content: "Please edit the medication details below:",
    //         action: "EDIT_MEDICINE",
    //         medicine: med,
    //       };
    //       setMessages((prev) => [...prev, newMsg]);
    //     } else {
    //       const displayLabel =
    //         preferredLang === "gujarati" || preferredLang === "gu"
    //           ? "સુધારો"
    //           : preferredLang === "hindi" || preferredLang === "hi"
    //             ? "संपादित करें"
    //             : preferredLang === "marathi" || preferredLang === "mr"
    //               ? "संपादित करा"
    //               : preferredLang === "tamil" || preferredLang === "ta"
    //                 ? "திருத்து"
    //                 : "Edit";
    //       sendMessage(JSON.stringify({ edit: true }), state, displayLabel);
    //     }
    //   };

    //   const isEditStepActive =
    //     messages[messages.length - 1]?.action === "EDIT_MEDICINE";
    //   const isCardReadOnly = isHistorical && !isEditStepActive;

    //   return (
    //     <ConfirmMedicineCard
    //       summary={
    //         isCardReadOnly
    //           ? (activeMsg.medicines || activeMsg.summary || {})
    //           : { medicines: localMedicines }
    //       }
    //       preferredLang={preferredLang}
    //       isDark={isDark}
    //       theme={theme}
    //       onConfirm={handleConfirm}
    //       onEdit={handleEdit}
    //       readOnly={isCardReadOnly}
    //       chosenVal={chosenVal}
    //       chosenLabel={chosenLabel}
    //     />
    //   );
    // }

    if (
      activeMsg.action === "MEDICINE_OPTIONS" ||
      activeMsg.action === "CONFIRM_MEDICINE"
    ) {
      return (
        <MedicineOptionsPanel
          optionsList={activeMsg.options || []}
          isDark={isDark}
          theme={theme}
          onOptionPress={handleOptionPress}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (
      activeMsg.action === "COMPLETE" ||
      activeMsg.action === "POST_ONBOARDING"
    ) {
      return null;
    }

    if (activeMsg.options && activeMsg.options.length > 0) {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {activeMsg.options.map((opt) => {
            const label = typeof opt === "string" ? opt : opt.label;
            const value = typeof opt === "string" ? opt : opt.value;
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() =>
                  handleOptionPress(
                    value,
                    typeof label === "string" ? label : value,
                  )
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return null;
  };

  const displayMessages = useMemo(() => {
    const displayArr: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const item = messages[i];
      const prevMsg = i > 0 ? messages[i - 1] : null;

      let showDateHeader = false;
      if (!item.createdAt) {
        showDateHeader = false;
      } else if (!prevMsg || !prevMsg.createdAt) {
        showDateHeader = true;
      } else {
        const currentDate = formatUTCDateTime(
          item.createdAt,
          "dd-MMM-yyyy",
          true,
        );
        const prevDate = formatUTCDateTime(
          prevMsg.createdAt,
          "dd-MMM-yyyy",
          true,
        );
        if (currentDate !== prevDate) {
          showDateHeader = true;
        }
      }

      if (showDateHeader && item.createdAt) {
        const label = getRelativeDateLabel(item.createdAt, true);
        displayArr.push({
          isDateHeader: true,
          id: `date-header-${item.id || i}`,
          dateLabel: label,
        });
      }

      displayArr.push(item);
    }

    return displayArr;
  }, [messages]);

  const activeAction = messages[messages.length - 1]?.action;

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <SafeAreaView
        style={{
          flex: 1,
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.avatarBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Health Assistant
              </Text>
              <Text
                style={[
                  styles.headerSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Multilingual Profile Onboarding
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.keyboardContainer]}>
          {/* Messages List */}
          <View style={styles.listWrapper}>
            {activeDateLabel ? (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 99,
                }}
                pointerEvents="none"
              >
                <ChatDateHeader dateLabel={activeDateLabel} isDark={isDark} />
              </View>
            ) : null}
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              keyExtractor={(item) => item.id}
              onViewableItemsChanged={onViewableItemsChanged.current}
              viewabilityConfig={viewabilityConfig.current}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom:
                    activeAction === "ADD_MEDICINE" ||
                    activeAction === "EDIT_MEDICINE"
                      ? Math.max(insets.bottom, 16) + 16 + actualKeyboardHeight
                      : activeAction === "ASK_LANGUAGE" ||
                          activeAction === "ASK_UPLOAD_OR_SKIP" ||
                          activeAction === "ASK_GENDER" ||
                          activeAction === "ASK_DOB" ||
                          activeAction === "REVIEW_MEDICINES_LIST" ||
                          activeAction === "CONFIRM_MEDICINE" ||
                          activeAction === "MEDICINE_OPTIONS" ||
                          activeAction === "POST_ONBOARDING"
                        ? Math.max(insets.bottom, 16) + 16
                        : 16,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.isDateHeader) {
                  return (
                    <ChatDateHeader
                      dateLabel={item.dateLabel}
                      isDark={isDark}
                    />
                  );
                }

                // console.log("Message Item : ", item);
                const isAi = item.role === "assistant";
                const mappedMsg = {
                  ...item,
                  role: isAi ? ("ai" as const) : ("user" as const),
                  text: item.content,
                };
                const isLast = item.id === messages[messages.length - 1].id;
                const isHistorical = !isLast;
                const options = renderOptions(item, isHistorical);
                const isJson =
                  item.content && item.content.trim().startsWith("{");

                return (
                  <View style={{ width: "100%" }}>
                    {!isJson && (
                      <MessageBubble
                        message={{ ...mappedMsg, createdAt: item.createdAt }}
                        isDark={isDark}
                        onSpeak={() =>
                          speakMessage(
                            mappedMsg.id,
                            mappedMsg.text,
                            state.preferredLanguage || undefined,
                          )
                        }
                        isSpeaking={speakingMessageId === mappedMsg.id}
                      />
                    )}
                    {isAi && options !== null && (
                      <View
                        style={[styles.optionsWrapper, { opacity: 1 }]}
                        pointerEvents={isLast ? "auto" : "none"}
                      >
                        {options}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Typing Indicator */}
          {loading && <TypingIndicator isDark={isDark} />}

          {/* Document Upload & OCR Experience States */}
          {uploadState !== "idle" && uploadState !== "cancelled" && (
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#e2e8f0",
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 14,
                  overflow: "hidden",
                  position: "absolute",
                  left: 12,
                  right: 12,
                  alignItems: "stretch",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                },
                [
                  "uploading",
                  "processing",
                  "validating",
                  "queued",
                  "success",
                  "failed",
                  "rejected"
                ].includes(uploadState) && { top: 24 },
              ]}
            >
              {/* COMPACT VIEW (Row layout) */}
              {(uploadState === "uploading" ||
                uploadState === "processing" ||
                uploadState === "validating" ||
                uploadState === "queued" ||
                uploadState === "failed" ||
                uploadState === "timed_out" ||
                uploadState === "rejected" ||
                uploadState === "success") && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 4,
                  }}
                >
                  {/* Left Side: Bold Status & Secondary Text */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: ["failed", "timed_out", "rejected"].includes(
                          uploadState,
                        )
                          ? "#ef4444"
                          : theme.colors.textPrimary,
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {uploadState === "uploading"
                        ? "Uploading"
                        : uploadState === "processing"
                          ? (
                              ONBOARDING_I18N[
                                (
                                  state.preferredLanguage || "english"
                                ).toLowerCase()
                              ]?.page_progress ||
                              ONBOARDING_I18N.english.page_progress
                            )
                              .replace("Page", "Processing")
                              .replace("પૃષ્ઠ", "Processing")
                              .replace("पृष्ठ", "Processing")
                              .replace("पान", "Processing")
                              .replace("பக்கம்", "Processing")
                              .replace("{current}", String(pollCurrentPage))
                              .replace("{total}", String(pollTotalPages))
                          : uploadState === "validating"
                            ? "Validating"
                            : uploadState === "failed" ||
                                uploadState === "timed_out"
                              ? "Analysis Failed"
                              : uploadState === "rejected"
                                ? "Document Rejected"
                                : uploadState === "success"
                                  ? (ONBOARDING_I18N[(state.preferredLanguage || "english").toLowerCase()]?.success || "Analysis Complete")
                                  : "Queued"}
                    </Text>

                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        marginHorizontal: 6,
                        fontSize: 13,
                      }}
                    >
                      •
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 13,
                      }}
                      numberOfLines={1}
                    >
                      {uploadState === "uploading"
                        ? "Uploading"
                        : uploadState === "processing"
                          ? "Analyzing"
                          : uploadState === "validating"
                            ? "Validating"
                            : ["failed", "timed_out", "rejected"].includes(
                                  uploadState,
                                )
                              ? "Error"
                              : uploadState === "success"
                                ? "Done"
                                : "Waiting"}
                    </Text>
                  </View>

                  {/* Right Side: Percentage & Toggle/Retry/Close */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {/* Percentage */}
                    {[
                      "uploading",
                      "processing",
                      "failed",
                      "timed_out",
                      "success",
                    ].includes(uploadState) && (
                      <Text
                        style={{
                          color: ["failed", "timed_out"].includes(uploadState)
                            ? "#ef4444"
                            : uploadState === "success"
                              ? "#10b981"
                              : theme.colors.primary,
                          fontWeight: "bold",
                          fontSize: 13,
                          marginRight: 12,
                        }}
                      >
                        {`${uploadPercent}%`}
                      </Text>
                    )}

                    {/* Action buttons */}
                    {["failed", "timed_out"].includes(uploadState) ? (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <TouchableOpacity
                          onPress={handleRetryJob}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: theme.colors.primary,
                            marginRight: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: "bold",
                            }}
                          >
                            Retry
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setUploadState("idle")}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color={isDark ? "#475569" : "#94a3b8"}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : uploadState === "rejected" ? (
                      <TouchableOpacity onPress={() => setUploadState("idle")}>
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color={isDark ? "#475569" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    ) : uploadState === "success" ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10b981"
                        style={{ marginLeft: 4 }}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => setIsProgressCollapsed((prev) => !prev)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: isDark ? "#334155" : "#f1f5f9",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontSize: 12,
                            fontWeight: "500",
                            marginRight: 2,
                          }}
                        >
                          {isProgressCollapsed ? "View" : "Hide"}
                        </Text>
                        <Ionicons
                          name={
                            isProgressCollapsed ? "chevron-down" : "chevron-up"
                          }
                          size={12}
                          color={theme.colors.textPrimary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* EXPANDED VIEW (Additional details) */}
              {!isProgressCollapsed &&
                (uploadState === "uploading" ||
                  uploadState === "processing" ||
                  uploadState === "validating" ||
                  uploadState === "queued") && (
                  <View
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: isDark ? "#334155" : "#f1f5f9",
                    }}
                  >
                    {uploadState === "processing" && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.textSecondary,
                            fontSize: 11,
                            fontStyle: "italic",
                            flex: 1,
                            marginRight: 8,
                          }}
                        >
                          {ONBOARDING_I18N[
                            (state.preferredLanguage || "english").toLowerCase()
                          ]?.eta_hint || ONBOARDING_I18N.english.eta_hint}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          {Math.round(pollElapsedTime / 1000)}s
                        </Text>
                      </View>
                    )}
                    {uploadState === "uploading" && autoRetryCount > 0 && (
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: 11,
                          marginBottom: 8,
                        }}
                      >
                        {(
                          ONBOARDING_I18N[
                            (state.preferredLanguage || "english").toLowerCase()
                          ]?.retry_count || ONBOARDING_I18N.english.retry_count
                        )
                          .replace("{attempt}", String(autoRetryCount))
                          .replace("{max}", "3")}
                      </Text>
                    )}

                    {/* Cancel action button */}
                    <TouchableOpacity
                      accessibilityLabel="Cancel processing"
                      accessibilityRole="button"
                      onPress={cancelProcessing}
                      style={{
                        alignSelf: "flex-end",
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: isDark ? "#475569" : "#e2e8f0",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_cancel || ONBOARDING_I18N.english.btn_cancel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Progress bar at the bottom edge */}
              {[
                "uploading",
                "processing",
                "failed",
                "timed_out",
                "rejected",
                "queued",
                "validating",
                "success",
              ].includes(uploadState) && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${uploadPercent}%`,
                      backgroundColor: [
                        "failed",
                        "timed_out",
                        "rejected",
                      ].includes(uploadState)
                        ? "#ef4444"
                        : theme.colors.primary,
                    }}
                  />
                </View>
              )}
            </View>
          )}

          {/* Selected Document Preview
          {selectedFile && (
            <DocumentPreview
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              uri={selectedFile.uri}
              fileType={selectedFile.fileType}
              onRemove={handleRemoveFile}
            />
          )} */}

          {/* Floating Input Capsule */}
          {activeAction !== "ASK_LANGUAGE" &&
            activeAction !== "ASK_UPLOAD_OR_SKIP" &&
            activeAction !== "ASK_GENDER" &&
            activeAction !== "ASK_DOB" &&
            activeAction !== "REVIEW_MEDICINES_LIST" &&
            activeAction !== "ADD_MEDICINE" &&
            activeAction !== "EDIT_MEDICINE" &&
            activeAction !== "CONFIRM_MEDICINE" &&
            activeAction !== "MEDICINE_OPTIONS" &&
            activeAction !== "POST_ONBOARDING" && (
              <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isSending={loading}
                isDark={isDark}
                mode="onboarding"
                keyboardType={
                  activeAction === "ASK_MEDICINE_QUANTITY"
                    ? "numeric"
                    : "default"
                }
                preferredLanguage={state.preferredLanguage!}
              />
            )}
        </View>

        {/* Modal Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          maximumDate={datePickerMode === "date" ? new Date() : undefined}
          minimumDate={
            datePickerMode === "date" ? new Date("1900-01-01") : undefined
          }
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* Custom Upload Bottom Sheet */}
        <UploadBottomSheet
          ref={uploadSheetRef}
          fromScreen={true}
          onTakePhoto={handleTakePhoto}
          onChooseGallery={handleChooseGallery}
          onChooseDocument={handleChooseDocument}
        />

        {/* Custom Validation Alert Dialog */}
        <UploadValidationDialog
          visible={validationDialogVisible}
          onSelectAgain={handleSelectAgain}
          onContinueManual={handleContinueManual}
          onClose={() => setValidationDialogVisible(false)}
        />
      </SafeAreaView>
      <ConfirmationModal
        showModal={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        mode="Log Out"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100, 116, 139, 0.1)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSub: {
    fontSize: 12,
  },
  keyboardContainer: {
    flex: 1,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 8,
    paddingBottom: 16,
  },
  optionsWrapper: {
    paddingLeft: 48,
    paddingRight: 16,
    marginBottom: 8,
    marginTop: 2,
  },
  optionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    width: "100%",
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    width: "100%",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressCard: {
    position: "absolute",
    top: "35%",
    left: "10%",
    right: "10%",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  progressText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "bold",
  },
  summaryContainer: {
    alignItems: "center",
    borderTopColor: "rgba(100, 116, 139, 0.1)",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabletGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tabletOptionCard: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  tabletImage: {
    width: 32,
    height: 32,
    marginBottom: 6,
  },
  tabletLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
    backgroundColor: "rgba(100, 116, 139, 0.05)",
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  counterSubmit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  liquidContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
    backgroundColor: "rgba(100, 116, 139, 0.05)",
  },
  liquidInput: {
    minWidth: 80,
    height: 36,
    fontSize: 15,
    fontWeight: "500",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
  },
  liquidUnit: {
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liquidSubmit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  editMedicineCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  editMedicineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editField: {
    marginBottom: 10,
  },
  editFieldLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  editFieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    backgroundColor: "transparent",
  },
  editConfirmBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  editConfirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  summaryTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  medCard: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  resolveCardContainer: {
    width: "100%",
    padding: 12,
    borderRadius: 20,
    backgroundColor: "transparent",
    marginTop: 8,
  },
  resolveCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  shieldIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resolveCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  resolveCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  vsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
    marginBottom: 16,
  },
  vsColumn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 4,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  columnHeaderTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  columnBody: {
    padding: 8,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 12,
  },
  highlightChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  vsBadge: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  vsBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  explainerBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  explainerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  bigActionButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bigActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bigActionButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  manualEditLink: {
    width: "100%",
    paddingVertical: 8,
    alignItems: "center",
  },
  manualEditLinkLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  editFormContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  resolveActionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resolveActionButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  resolveActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bigActionButtonSide: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bigActionButtonTextSide: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  bigActionButtonSubtitleSide: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  medEditCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  medCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  medCardSubtitleText: {
    fontSize: 12,
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitContainer: {
    flexDirection: "row",
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  freqChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  medListCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  medListItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  medListItemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  medListItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pencilIconButton: {
    padding: 6,
  },
  skipListButton: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  skipListText: {
    fontSize: 12,
    fontWeight: "600",
  },
  medConfirmCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  confirmSummaryBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  confirmSummaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryLineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  summaryLineText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  optionsPanel: {
    width: "100%",
    marginTop: 8,
  },
  optionsPanelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  optionsPanelText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
