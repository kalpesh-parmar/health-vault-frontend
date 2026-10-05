import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
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
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
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
import { listMedications } from "../../services/medicationservice";
import {
  uploadDocumentsBatch,
  retryDocumentProcessing,
  cancelOcr,
} from "../../services/documentService";
import {
  connectSseStream,
  SseEventPayload,
} from "../../services/streamService";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

// Reusable Redesigned Components
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { ChatDateHeader } from "../../components/chat/ChatDateHeader";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import TypingIndicator from "../../components/chat/TypingIndicator";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import DocumentPreview from "../../components/upload/DocumentPreview";
import UploadValidationDialog from "../../components/upload/UploadValidationDialog";
import ConfirmationModal from "../../components/shared/ConfirmationModal";

import { AddMedicineCard, deduplicateDrafts } from "../../components/chat/widgets/AddMedicineCard";
import { sanitizeMedicineForPayload } from "../../components/chat/widgets/MedicineHelpers";
import { ReviewMedicinesListCard } from "../../components/chat/widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "../../components/chat/widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "../../components/chat/widgets/MedicineOptionsPanel";
import { ResolveProfileSourceCard } from "../../components/chat/widgets/ResolveProfileSourceCard";
import { I18N_ONBOARDING_UI as ONBOARDING_I18N } from "../../components/chat/widgets/OnboardingI18n";
import { AskUploadOrSkipCard } from "../../components/chat/widgets/AskUploadOrSkipCard";
import { AskAllergiesCard } from "../../components/chat/widgets/AskAllergiesCard";
import { findHistoricalUserReply } from "../../components/chat/widgets/HistoricalChips";
import { DocumentProcessingModal } from "../../components/chat/widgets/DocumentProcessingModal";
import { ReportSummaryChatCard } from "../../components/chat/widgets/ReportSummaryChatCard";
import { StructuredReportSummaryCard } from "../../components/chat/widgets/StructuredReportSummaryCard";
import { StructuredMedicationListCard } from "../../components/chat/widgets/StructuredMedicationListCard";
import { parseMedicationListMessage, normalizeMedicationItem } from "../../utils/medicationListNormalizer";
import { DocumentViewerModal } from "../../components/shared/DocumentViewerModal";
import { SUGGESTED_QUESTIONS_I18N } from "../../constants/chatConstants";
import { LinearGradient } from "expo-linear-gradient";

import { normalizeReportSummaryToDocument } from "../../utils/documentNormalizer";

const getMedicineName = (medicine: any): string =>
  String(medicine?.name || medicine?.medicationName || medicine?.medicineName || "")
    .trim()
    .toLowerCase();

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  rawValue?: string;
  action?: string;
  actions?: any[];
  reportSummary?: any;
  task?: string;
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
  sourceComparison?: string;
  medicine?: any;
  medicines?: any[];
  items?: any[];
  pagination?: any;
  totalBuffered?: number;
  summary?: any;
  document?: any;
  documents?: any[];
  suggestedQuestions?: string[];
  keyFindings?: any[];
  documentIds?: string[];
  createdAt?: string | Date;
};

const normalizeDocumentIds = (...sources: any[]): string[] | undefined => {
  const ids = sources
    .flatMap((source) => {
      if (!source) return [];
      if (Array.isArray(source)) return source;
      return [source];
    })
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === "string") return [item];
      if (Array.isArray(item.documentId)) return item.documentId;
      if (Array.isArray(item.documentIds)) return item.documentIds;
      if (item.documentId) return [item.documentId];
      if (item.id) return [item.id];
      if (item.fileKey) return [item.fileKey];
      if (item.s3Key) return [item.s3Key];
      return [];
    })
    .map((id) => String(id).trim())
    .filter(Boolean);

  return ids.length ? Array.from(new Set(ids)) : undefined;
};

const mapStatusToProgress = (item: any): number => {
  let progress = item.progress;
  if (progress !== undefined && progress !== null) {
    return typeof progress === "number" && progress <= 1
      ? Math.round(progress * 100)
      : Math.round(progress);
  }

  const status = (item.status || item.stage || item.stageStatus || "").toLowerCase();
  if (status.includes("done") || status.includes("completed") || status.includes("success")) {
    return 100;
  } else if (status.includes("failed") || status.includes("error")) {
    return -1;
  } else if (status.includes("summariz")) {
    return 90;
  } else if (status.includes("analyz")) {
    return 70;
  } else if (status.includes("extract")) {
    return 50;
  } else if (status.includes("validat")) {
    return 30;
  } else if (status.includes("queue")) {
    return 15;
  } else if (
    status.includes("process") ||
    status.includes("started")
  ) {
    if (item.totalPages && item.currentPage) {
      return Math.round((item.currentPage / item.totalPages) * 100);
    }
    return 40;
  }
  return 10;
};

const extractEventProgress = (event: any): number | undefined => {
  if (typeof event?.percentage === "number") return Math.round(event.percentage);
  if (typeof event?.progress === "number") {
    return event.progress <= 1 ? Math.round(event.progress * 100) : Math.round(event.progress);
  }
  if (typeof event?.data?.percentage === "number") return Math.round(event.data.percentage);
  if (typeof event?.data?.progress === "number") {
    return event.data.progress <= 1
      ? Math.round(event.data.progress * 100)
      : Math.round(event.data.progress);
  }
  if (typeof event?.extra?.percentage === "number") return Math.round(event.extra.percentage);
  if (typeof event?.extra?.progress === "number") {
    return event.extra.progress <= 1
      ? Math.round(event.extra.progress * 100)
      : Math.round(event.extra.progress);
  }
  if (typeof event?.data?.extra?.percentage === "number") return Math.round(event.data.extra.percentage);
  if (typeof event?.data?.extra?.progress === "number") {
    return event.data.extra.progress <= 1
      ? Math.round(event.data.extra.progress * 100)
      : Math.round(event.data.extra.progress);
  }
  const docItem =
    event?.documents?.[0] ||
    event?.files?.[0] ||
    event?.data?.documents?.[0] ||
    event?.data?.files?.[0];
  if (docItem) {
    if (typeof docItem.percentage === "number") return Math.round(docItem.percentage);
    if (typeof docItem.progress === "number") {
      return docItem.progress <= 1
        ? Math.round(docItem.progress * 100)
        : Math.round(docItem.progress);
    }
    if (typeof docItem.data?.percentage === "number") return Math.round(docItem.data.percentage);
    if (typeof docItem.data?.progress === "number") {
      return docItem.data.progress <= 1
        ? Math.round(docItem.data.progress * 100)
        : Math.round(docItem.data.progress);
    }
  }
  if (event?.extra?.totalPages && event?.extra?.page) {
    return Math.round((event.extra.page / event.extra.totalPages) * 100);
  }
  return undefined;
};

const STATIC_EMPTY_MED_OBJ: any = {};

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
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(true);
  const bottomPadding = useBottomBarPadding(0);
  const [activeDateLabel, setActiveDateLabel] = useState<string>("");
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  const keyboard = useAnimatedKeyboard();

  const animatedKeyboardStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: Math.max(keyboard.height.value, bottomPadding),
    };
  });


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
  const [isDocumentRetryable, setIsDocumentRetryable] = useState<boolean>(true);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [pollElapsedTime, setPollElapsedTime] = useState<number>(0);
  const [pollTotalPages, setPollTotalPages] = useState<number>(1);
  const [pollCurrentPage, setPollCurrentPage] = useState<number>(1);
  const [uploadRetryCount, setUploadRetryCount] = useState<number>(0);
  const uploadRetryCountRef = useRef<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeErrorCode, setActiveErrorCode] = useState<string | null>(null);
  const [activeErrorDetails, setActiveErrorDetails] = useState<string | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [versionToken, setVersionToken] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // Safe reference mapping to avoid stale hook variables inside async polling loops
  const isOfflineRef = useRef(false);
  const selectedFileRef = useRef<any>(null);
  const uploadStateRef = useRef<string>("idle");
  const pollActiveRef = useRef<boolean>(false);
  const cancelRequestedRef = useRef<boolean>(false);
  const isSendingRef = useRef<boolean>(false);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    uploadStateRef.current = uploadState;
  }, [uploadState]);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    fileType: "pdf" | "image" | "document";
  } | null>(null);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  const [validationDialogVisible, setValidationDialogVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [state, setState] = useState({
    currentStep: null as string | null,
    isOnboardingCompleted: false,
    uploadedMedicalDocument: false,
    documentUploaded: false,
    documentConfirmed: false,
    documentId: null as string | string[] | null,
    documentText: "",
    preferredLanguage: null as string | null,
    flowMode: null as string | null,
    documentExtracted: false,
    bloodGroupSkipped: false,
    allergiesSkipped: false,
    hasSocialData: undefined as boolean | undefined,
    loginProvider: undefined as string | undefined,
    provider: undefined as string | undefined,
    socialData: undefined as any,
    loginData: undefined as any,
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
  const [medicineCardMode, setMedicineCardMode] = useState<"default" | "wizard" | "review">("default");

  const { data: medicationsData } = useQuery({
    queryKey: ["medications"],
    queryFn: listMedications,
  });

  const existingMedications = useMemo(() => {
    const data: any = medicationsData as any;
    return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  }, [medicationsData]);

  // The review card stores conflict decisions on the local draft. Keep those
  // fields when onboarding receives a newer copy of the draft list from the
  // backend (for example, after choosing "Add New").
  const mergeMedicineReviewState = (incoming: any[], previous: any[] = localMedicines) => {
    const previousById = new Map<string, any>();
    (previous || []).forEach((medicine: any) => {
      const id = medicine?.client_med_id || medicine?.id;
      if (id) previousById.set(id, medicine);
    });

    const incomingDrafts = deduplicateDrafts(incoming || []);

    return incomingDrafts.map((medicine: any, index: number) => {
      const previousMedicine = previousById.get(medicine?.client_med_id || medicine?.id);
      const medicineName = getMedicineName(medicine);
      const sameExtractedMedicine = incomingDrafts
        .slice(0, index)
        .find((candidate: any) => getMedicineName(candidate) === medicineName && medicineName);
      const existingMedicine = existingMedications.find(
        (candidate: any) => {
          const candidateName = getMedicineName(candidate);
          return candidateName && medicineName && (
            candidateName === medicineName ||
            candidateName.includes(medicineName) ||
            medicineName.includes(candidateName)
          );
        },
      );
      const hasDuplicate = Boolean(
        medicine?.isBackendDuplicate ||
        medicine?.hasDuplicate ||
        medicine?.duplicateInfo?.hasDuplicate ||
        medicine?.duplicateInfo?.conflictType ||
        medicine?.matchedMedication ||
        medicine?.duplicateInfo?.matchedMedication ||
        (medicine?.duplicateInfo?.matchedMedications?.length > 0),
      );
      const hasLocalDuplicate = Boolean(existingMedicine || sameExtractedMedicine);
      const hasUserResolution =
        medicine?.resolutionSource === "user" || medicine?.userResolved === true;

      const draft = hasLocalDuplicate
        ? {
            ...medicine,
            isBackendDuplicate: true,
            hasDuplicate: true,
            duplicateInfo: {
              ...(medicine?.duplicateInfo || {}),
              hasDuplicate: true,
              conflictType: medicine?.duplicateInfo?.conflictType ||
                (sameExtractedMedicine ? "CROSS_DOC_DIFF" : "EXACT_DUPLICATE"),
              matchedMedication:
                medicine?.duplicateInfo?.matchedMedication ||
                existingMedicine ||
                sameExtractedMedicine,
            },
            matchedMedication:
              medicine?.matchedMedication || existingMedicine || sameExtractedMedicine,
          }
        : { ...medicine };

      // The extraction mapper may populate a default resolution for a
      // duplicate. It is not a user decision, so onboarding must still show
      // the conflict resolver for it.
      if ((hasDuplicate || hasLocalDuplicate) && !hasUserResolution) {
        delete draft.resolution;
        delete draft.resolutionSource;
      }

      if (!previousMedicine) return draft;

      return {
        ...draft,
        ...(previousMedicine.resolutionSource === "user" || previousMedicine.userResolved === true
          ? {
              resolution: previousMedicine.resolution,
              resolutionSource: "user",
            }
          : {}),
        ...(previousMedicine.selected !== undefined
          ? { selected: previousMedicine.selected }
          : {}),
      };
    });
  };

  // Synchronize localMedicines with backend state when it changes (guarded by content key to avoid unnecessary re-renders)
  useEffect(() => {
    if (state?.medicinesToAdd) {
      setLocalMedicines((prev) => {
        const prevKey = (prev || []).map((m: any) => m?.client_med_id || m?.id).filter(Boolean).join("|");
        const nextKey = (state.medicinesToAdd || []).map((m: any) => m?.client_med_id || m?.id).filter(Boolean).join("|");
        return prevKey === nextKey
          ? prev
          : mergeMedicineReviewState(state.medicinesToAdd, prev);
      });
    }
  }, [state?.medicinesToAdd, existingMedications]);

  // Memoize initialMedicines so we don't pass a fresh array reference on every single render
  const memoizedInitialMedicines = useMemo(
    () => deduplicateDrafts(localMedicines || state?.medicinesToAdd || []),
    [localMedicines, state?.medicinesToAdd],
  );

  const flatListRef = useRef<FlatList>(null);
  const uploadSheetRef = useRef<any>(null);
  const pendingDraftSyncRef = useRef<Promise<any> | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  // Scroll to end when messages or loading state changes
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScrollRef.current) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  useEffect(() => {
    if (loading && shouldAutoScrollRef.current) {
      scrollToBottom(true);
    }
  }, [loading]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        documentId: null,
        documentText: "",
        preferredLanguage: null,
        flowMode: null,
        documentExtracted: false,
        bloodGroupSkipped: false,
        allergiesSkipped: false,
        hasSocialData: undefined as boolean | undefined,
        loginProvider: undefined as string | undefined,
        provider: undefined as string | undefined,
        socialData: undefined as any,
        loginData: undefined as any,
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
        let baseState = { ...newState };
        try {
          let detectedProvider =
            (userData as any)?.provider ||
            (userData as any)?.authProvider ||
            (userData as any)?.loginProvider ||
            (userData as any)?.socialProvider ||
            "";

          if (!detectedProvider) {
            try {
              detectedProvider =
                (await AsyncStorage.getItem("loginProvider")) ||
                (await SecureStore.getItemAsync("loginProvider")) ||
                "";
            } catch {}
          }

          let isSocialStored = false;
          try {
            isSocialStored = (await AsyncStorage.getItem("isSocialLogin")) === "true";
          } catch {}

          const isSocialFlag =
            isSocialStored ||
            Boolean(
              detectedProvider &&
              ["google", "facebook", "microsoft", "apple", "social"].includes(String(detectedProvider).toLowerCase())
            ) ||
            Boolean((userData as any)?.loginType === "social") ||
            Boolean(userData.email && !userData.mobile);

          const providerToUse = detectedProvider
            ? String(detectedProvider).toLowerCase().trim()
            : (isSocialFlag ? "google" : undefined);
          const hasSocial = isSocialFlag || Boolean(providerToUse);

          const socialProfileData = hasSocial
            ? {
                firstName: initialUserData.firstName,
                lastName: initialUserData.lastName,
                email: initialUserData.email,
                dateOfBirth: initialUserData.dateOfBirth,
                gender: initialUserData.gender,
              }
            : undefined;

          const loginProfileData = hasSocial
            ? {
                firstName: { value: initialUserData.firstName, verified: true },
                lastName: { value: initialUserData.lastName, verified: true },
                email: { value: initialUserData.email, verified: true },
                dateOfBirth: { value: initialUserData.dateOfBirth, verified: false },
                gender: { value: initialUserData.gender, verified: false },
              }
            : undefined;

          baseState = {
            ...newState,
            hasSocialData: hasSocial ? true : undefined,
            loginProvider: providerToUse,
            provider: providerToUse,
            socialData: socialProfileData,
            loginData: loginProfileData,
          };

          console.log("[ONBOARDING] Fetching onboarding history...");
          const response = await apiClient.get("/v1/onboarding/history");
          const {
            chatSessionId,
            messages: historyItems,
            resumableState,
            canSkip: historyCanSkip,
          } = response.data?.data || {};

          let mergedState = { ...baseState };
          if (resumableState) {
            mergedState = {
              ...mergedState,
              ...resumableState,
              hasSocialData: resumableState.hasSocialData ?? baseState.hasSocialData,
              loginProvider: resumableState.loginProvider || baseState.loginProvider,
              provider: resumableState.provider || baseState.provider,
              socialData: resumableState.socialData || baseState.socialData,
              loginData: resumableState.loginData || baseState.loginData,
            };
          }

          setState(mergedState);
          setCanSkip(
            Boolean(
              historyCanSkip ??
              resumableState?.canSkip ??
              response.data?.data?.canSkip,
            ),
          );

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
            const seenNotice = new Set<string>();
            const mappedMessages: Message[] = [];
            for (const dbMsg of historyItems) {
              let meta = dbMsg.metadata;
              if (typeof meta === "string") {
                try {
                  meta = JSON.parse(meta);
                } catch (e) {
                  meta = {};
                }
              }
              const isNotice =
                meta?.action === "ONBOARDING_COMPLETED_NOTICE" ||
                meta?.actionType === "ONBOARDING_COMPLETED_NOTICE" ||
                dbMsg.id?.startsWith("ai-comp-");
              if (isNotice) {
                if (seenNotice.has("ONBOARDING_COMPLETED_NOTICE")) {
                  continue; // Deduplicate notice
                }
                seenNotice.add("ONBOARDING_COMPLETED_NOTICE");
              }
              const medListResult = parseMedicationListMessage(dbMsg.content, meta);
              const msgAction =
                (medListResult.isMedicationList ? "MEDICATION_LIST" : undefined) ||
                meta?.action ||
                (isNotice ? "ONBOARDING_COMPLETED_NOTICE" : undefined);
              const contentText = (dbMsg.content || "").toLowerCase();
              if (
                dbMsg.role === "assistant" &&
                (msgAction === "COMPLETE" ||
                  msgAction === "POST_ONBOARDING" ||
                  contentText.includes("thank you! onboarding is complete") ||
                  contentText.includes("thank you! your onboarding is complete"))
              ) {
                continue;
              }
              const isDuplicateOfPrev =
                mappedMessages.length > 0 &&
                mappedMessages[mappedMessages.length - 1].role === dbMsg.role &&
                mappedMessages[mappedMessages.length - 1].content?.trim() ===
                (medListResult.isMedicationList ? (medListResult.rawText || "") : dbMsg.content)?.trim() &&
                mappedMessages[mappedMessages.length - 1].action === msgAction;
              if (isDuplicateOfPrev) {
                continue;
              }
              mappedMessages.push({
                ...(meta || {}),
                id: dbMsg.id,
                role: dbMsg.role,
                content: medListResult.isMedicationList ? (medListResult.rawText || "") : dbMsg.content,
                action: msgAction,
                task: meta?.task || (medListResult.isMedicationList ? "MEDICATION_LIST" : undefined),
                medicines: medListResult.isMedicationList && medListResult.items.length > 0 ? medListResult.items : (meta?.medicines || []),
                items: medListResult.items,
                pagination: medListResult.pagination || meta?.pagination,
                createdAt: dbMsg.createdAt,
              });
            }

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
          await startOnboardingChat(baseState);
        } finally {
          setLoading(false);
        }
      };

      if (messages.length === 0) {
        fetchOnboardingHistory();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const startOnboardingChat = async (currentState: typeof state) => {
    setLoading(true);
    try {
      const payload = {
        message: "hello",
        history: [],
        state: currentState,
        fromScreen: "Onboarding",
        loginProvider: (currentState as any)?.loginProvider,
        provider: (currentState as any)?.loginProvider,
        hasSocialData: (currentState as any)?.hasSocialData,
        documentId: normalizeDocumentIds(currentState?.documentId),
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

  const processAssistantResponse = (
    aiRes: any,
    currentState: typeof state,
    confirmedMedicines?: any[],
  ) => {
    const messageContent =
      aiRes.reply || aiRes.message || aiRes.message_en || aiRes.message_gu;

    const medListResult = parseMedicationListMessage(messageContent, aiRes);
    const action =
      (medListResult.isMedicationList ? "MEDICATION_LIST" : undefined) ||
      aiRes.actionType ||
      aiRes.action;
    const resolvedOnboardingCompleted = Boolean(
      aiRes.onboardingState?.isOnboardingCompleted ||
      aiRes.state?.isOnboardingCompleted ||
      aiRes.isOnboardingCompleted ||
      action === "COMPLETE" ||
      action === "POST_ONBOARDING" ||
      action === "GO_TO_DASHBOARD" ||
      action === "DASHBOARD" ||
      currentState?.isOnboardingCompleted ||
      currentState?.currentStep === "COMPLETE"
    );
    const resolvedCanSkip = Boolean(
      aiRes.canSkip ??
      aiRes.onboardingState?.canSkip ??
      aiRes.state?.canSkip ??
      aiRes.resumableState?.canSkip ??
      !!aiRes.completionMessage,
    );
    const isReportCardResponse =
      action === "ASK_REPORT" &&
      Boolean(aiRes.document || aiRes.reportSummary) &&
      !messageContent?.trim();
    const messageAction =
      action === "ASK_REPORT" && !isReportCardResponse
        ? "NORMAL_CHAT"
        : action;
    // The confirm endpoint can return a REVIEW_MEDICINES_LIST response with
    // only one medicine even though the submitted confirmation contains all
    // selected medicines. Keep the submitted list for the UI card so the
    // confirmed history does not lose items from the list.
    const responseMedicines =
      Array.isArray(confirmedMedicines) &&
      confirmedMedicines.length > 0 &&
      (aiRes.onboardingState?.medicinesConfirmed || aiRes.state?.medicinesConfirmed)
        ? confirmedMedicines
        : aiRes.medicines;

    const reportSummaryData =
      aiRes.reportSummary ||
      (Array.isArray(aiRes.actions)
        ? aiRes.actions.find(
            (a: any) => a.actionType === "REPORT_SUMMARY" || a.reportSummary,
          )?.reportSummary
        : null);

    const resolvedDoc = normalizeReportSummaryToDocument(
      reportSummaryData || aiRes.document,
      aiRes.document,
    );

    const newMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: isReportCardResponse
        ? ""
        : (medListResult.isMedicationList
            ? (medListResult.rawText || "")
            : (messageContent || "Please provide the information.")),
      action: messageAction,
      actions: aiRes.actions,
      reportSummary: reportSummaryData,
      task: aiRes.task || (medListResult.isMedicationList ? "MEDICATION_LIST" : undefined),
      options: aiRes.options,
      fields: aiRes.fields,
      onboardingState: aiRes.onboardingState,
      loginSummary: aiRes.loginSummary,
      documentSummary: aiRes.documentSummary,
      mode: aiRes.mode,
      title: aiRes.title,
      subtitle: aiRes.subtitle,
      explainer: aiRes.explainer,
      loginProvider:
        aiRes.loginProvider ||
        (currentState as any)?.loginProvider ||
        state?.loginProvider ||
        (currentState as any)?.provider ||
        (state as any)?.provider,
      sourceComparison: aiRes.sourceComparison,
      medicine: aiRes.medicine,
      medicines: medListResult.isMedicationList ? medListResult.items : responseMedicines,
      items: medListResult.items,
      pagination: medListResult.pagination || aiRes.pagination,
      totalBuffered: aiRes.totalBuffered,
      summary: aiRes.summary,
      document: resolvedDoc || aiRes.document,
      suggestedQuestions: aiRes.suggestedQuestions,
      keyFindings: resolvedDoc?.keyFindings || aiRes.document?.keyFindings || aiRes.keyFindings,
      documentIds: normalizeDocumentIds(
        resolvedDoc?.id,
        aiRes.document?.id,
        aiRes.documentId,
        aiRes.documentIds,
        aiRes.documents,
      ),
      createdAt: aiRes.createdAt || new Date().toISOString(),
    };

    const normalizeText = (t?: string) =>
      (t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    const normReply = normalizeText(messageContent);
    const normComp = normalizeText(aiRes.completionMessage);
    const isCompletionAlreadyInReply = Boolean(
      normComp &&
      normReply &&
      (normReply === normComp || normReply.includes(normComp)),
    );

    const completionNoticeId =
      aiRes.completionMessageId || `ai-comp-${Date.now()}`;

    if (action === "RESOLVE_PROFILE_SOURCE") {
      setMessages((prev) => {
        const alreadyHasNotice = prev.some(
          (m) =>
            m.action === "ONBOARDING_COMPLETED_NOTICE" ||
            m.id?.startsWith("ai-comp-") ||
            (aiRes.completionMessageId && m.id === aiRes.completionMessageId) ||
            (normComp && normalizeText(m.content) === normComp),
        );
        const itemsToAdd: Message[] = [];
        if (
          aiRes.completionMessage &&
          !alreadyHasNotice &&
          !isCompletionAlreadyInReply
        ) {
          itemsToAdd.push({
            id: completionNoticeId,
            role: "assistant",
            content: aiRes.completionMessage,
            action: "ONBOARDING_COMPLETED_NOTICE",
            createdAt: aiRes.createdAt || new Date().toISOString(),
          });
        }
        const list = itemsToAdd.length > 0 ? [...prev, ...itemsToAdd] : [...prev];
        const existingIndex = list.findIndex(
          (m) => m.action === "RESOLVE_PROFILE_SOURCE",
        );
        if (existingIndex !== -1) {
          const updated = [...list];
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
            loginProvider: newMsg.loginProvider || existingMsg.loginProvider,
            sourceComparison: newMsg.sourceComparison || aiRes.sourceComparison,
            createdAt: newMsg.createdAt,
          };
          return updated;
        }
        return [...list, newMsg];
      });
    } else {
      setMessages((prev) => {
        const alreadyHasNotice = prev.some(
          (m) =>
            m.action === "ONBOARDING_COMPLETED_NOTICE" ||
            m.id?.startsWith("ai-comp-") ||
            (aiRes.completionMessageId && m.id === aiRes.completionMessageId) ||
            (normComp && normalizeText(m.content) === normComp),
        );
        const itemsToAdd: Message[] = [];
        if (
          aiRes.completionMessage &&
          !alreadyHasNotice &&
          !isCompletionAlreadyInReply
        ) {
          itemsToAdd.push({
            id: completionNoticeId,
            role: "assistant",
            content: aiRes.completionMessage,
            action: "ONBOARDING_COMPLETED_NOTICE",
            createdAt: aiRes.createdAt || new Date().toISOString(),
          });
        }
        const lastAssistantMsg = [...prev]
          .reverse()
          .find((m) => m.role === "assistant");
        const isInteractiveOptionMsg =
          newMsg.action === "MEDICINE_OPTIONS" ||
          (Array.isArray(newMsg.options) && newMsg.options.length > 0);
        const isReportCardMessage =
          newMsg.action === "ASK_REPORT" && Boolean(newMsg.document);
        const isRedundantCompletionMsg =
          newMsg.action === "COMPLETE" ||
          newMsg.action === "POST_ONBOARDING" ||
          (!newMsg.content?.trim() && !isReportCardMessage) ||
          normReply.includes("thankyouonboardingiscomplete") ||
          normReply.includes("thankyouyouronboardingiscomplete");

        if (isRedundantCompletionMsg) {
          return itemsToAdd.length > 0 ? [...prev, ...itemsToAdd] : prev;
        }

        const isDuplicateAssistantMsg =
          !isInteractiveOptionMsg &&
          lastAssistantMsg &&
          lastAssistantMsg.action === newMsg.action &&
          normalizeText(lastAssistantMsg.content) === normReply &&
          lastAssistantMsg.action !== "ONBOARDING_COMPLETED_NOTICE";

        if (isDuplicateAssistantMsg) {
          return itemsToAdd.length > 0 ? [...prev, ...itemsToAdd] : prev;
        }
        return [...prev, ...itemsToAdd, newMsg];
      });
    }

    let updatedUserData = { ...currentState.existingUserData };

    if (aiRes.extractedData) {
      updatedUserData = {
        ...updatedUserData,
        ...aiRes.extractedData,
      };
    }

    let finalState = { ...currentState };
    const serverState = aiRes.onboardingState || aiRes.state;

    if (serverState) {
      finalState = {
        ...finalState,
        ...serverState,
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
        loginProvider:
          aiRes.loginProvider ||
          finalState.loginProvider ||
          (currentState as any)?.loginProvider,
        provider:
          aiRes.provider ||
          aiRes.loginProvider ||
          finalState.provider ||
          (currentState as any)?.provider,
        socialData:
          aiRes.socialData ||
          finalState.socialData ||
          (currentState as any)?.socialData,
        loginData:
          aiRes.loginData ||
          finalState.loginData ||
          (currentState as any)?.loginData,
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
          (aiRes.medicinesConfirmed || finalState.medicinesConfirmed)
            ? []
            : (aiRes.medicinesToAdd || aiRes.medicines || finalState.medicinesToAdd || []),
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

    finalState.currentStep =
      serverState?.currentStep || action || finalState.currentStep;

    finalState.preferredLanguage = getNormalizedLang(
      finalState.preferredLanguage,
    );
    if (finalState.preferredLanguage) {
      AsyncStorage.setItem("preferredLanguage", finalState.preferredLanguage);
    }
    setState(finalState);
    if (Boolean((finalState as any).cancellationNotice)) {
      setLocalMedicines([]);
      setCurrentClientMedId(null);
      setActiveMedicineToEdit(null);
    } else if (aiRes.medicinesConfirmed || finalState.medicinesConfirmed) {
      setLocalMedicines([]);
      finalState.medicinesToAdd = [];
      setCurrentClientMedId(null);
      setActiveMedicineToEdit(null);
    } else if (Array.isArray(finalState.medicinesToAdd) && finalState.medicinesToAdd.length > 0) {
      setLocalMedicines(
        mergeMedicineReviewState(finalState.medicinesToAdd, localMedicines).filter(
          (m: any) => !m.isSaved && !m.dbId,
        ),
      );
    }
    setIsOnboardingCompleted(resolvedOnboardingCompleted);
    setCanSkip((prev) => prev || resolvedCanSkip);

    if (resolvedOnboardingCompleted) {
      queryClient.setQueryData(["profile"], (old: any) => ({
        ...(old || {}),
        onboardingCompleted: true,
        firstName:
          old?.firstName === "User" || !old?.firstName
            ? finalState?.existingUserData?.firstName || old?.firstName || "User"
            : old?.firstName,
        lastName:
          old?.lastName?.startsWith("+") || !old?.lastName
            ? finalState?.existingUserData?.lastName || old?.lastName || ""
            : old?.lastName,
        dateOfBirth:
          old?.dateOfBirth ||
          finalState?.existingUserData?.dateOfBirth ||
          "2000-01-01",
        gender:
          old?.gender || finalState?.existingUserData?.gender || "Other",
      }));
      queryClient.setQueryData(["userProfile"], (old: any) => ({
        ...(old || {}),
        onboardingCompleted: true,
      }));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["allMedications"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });
    }

    if (finalState.documentExtracted) {
      setUploadProgress(null);
    }
  };

  const sendMessage = async (
    userText: string | any,
    updatedState = state,
    displayLabel?: string,
    actionType?: string,
  ) => {
    if (isSendingRef.current || loading) return;
    if (typeof userText === "string" && !userText.trim()) return;
    if (!userText) return;
    isSendingRef.current = true;

    let isEditSave = false;
    try {
      if (typeof userText === "string" && userText.startsWith("{") && userText.includes('"edited"')) {
        const parsed = JSON.parse(userText);
        if (parsed && parsed.edited && !parsed.confirmed) {
          isEditSave = true;
        }
      } else if (typeof userText === "object" && userText?.edited && !userText?.confirmed) {
        isEditSave = true;
      }
    } catch {
      // ignore non-json
    }

    if (!isEditSave) {
      const userContent =
        displayLabel ||
        (typeof userText === "string"
          ? userText
          : userText?.name || userText?.action || "Medicine Selection");
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
        rawValue: typeof userText === "string" ? userText : JSON.stringify(userText), // Store raw value for live matching!
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg &&
          lastMsg.role === "user" &&
          lastMsg.content === userContent
        ) {
          return prev;
        }
        return [...prev, userMsg];
      });
    }
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const latestAssistantMessage = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");

      let resolvedActionType = actionType;
      let actionData: any = undefined;
      let messageString: string = "";

      if (typeof userText === "string") {
        try {
          const parsed = JSON.parse(userText);
          if (parsed && typeof parsed === "object") {
            if (parsed.action === "SAVE_AND_REVIEW" || parsed.saveAndReview) {
              resolvedActionType = resolvedActionType || "SAVE_AND_REVIEW";
              actionData = {
                ...parsed,
                medicines: Array.isArray(parsed.medicines)
                  ? parsed.medicines.map(sanitizeMedicineForPayload)
                  : parsed.medicines,
                medicine: parsed.medicine
                  ? sanitizeMedicineForPayload(parsed.medicine)
                  : parsed.medicine,
              };
              messageString = JSON.stringify(actionData);
            } else if (parsed.selected !== undefined || parsed.medicines !== undefined) {
              resolvedActionType = resolvedActionType || "CONFIRM_MEDICINES";
              actionData = {
                ...parsed,
                medicines: Array.isArray(parsed.medicines)
                  ? parsed.medicines.map(sanitizeMedicineForPayload)
                  : parsed.medicines,
              };
              messageString = JSON.stringify(actionData);
            } else if (parsed.skipAll) {
              resolvedActionType = resolvedActionType || "SKIP_MEDICINES";
              actionData = { skipAll: true };
              messageString = displayLabel || "Skip";
            } else if (parsed.action === "ASK_ALLERGIES" && Array.isArray(parsed.allergies)) {
              resolvedActionType = resolvedActionType || "ASK_ALLERGIES";
              actionData = parsed;
              messageString = displayLabel || parsed.allergies.join(", ");
            } else if (
              parsed.confirmed !== undefined ||
              parsed.source !== undefined ||
              parsed.action === "RESOLVE_PROFILE_SOURCE"
            ) {
              resolvedActionType = resolvedActionType || "RESOLVE_PROFILE_SOURCE";
              actionData = parsed;
              messageString = JSON.stringify(actionData);
            } else {
              messageString = displayLabel || userText;
            }
          } else {
            messageString = userText;
          }
        } catch {
          if (userText === "ADD_MEDICINE" || userText === "ADD") {
            resolvedActionType = resolvedActionType || "ADD_MEDICINE";
            actionData = { action: "ADD_MEDICINE" };
            messageString = displayLabel || "Add Medicines";
          } else if (userText === "GO_TO_DASHBOARD" || userText === "DASHBOARD") {
            messageString = "DASHBOARD";
          } else if (userText === "CANCEL") {
            resolvedActionType = resolvedActionType || "CANCEL";
            messageString = displayLabel || "Cancel";
          } else {
            messageString = userText;
          }
        }
      } else if (userText && typeof userText === "object") {
        if (userText.action === "SAVE_AND_REVIEW" || userText.saveAndReview) {
          resolvedActionType = resolvedActionType || "SAVE_AND_REVIEW";
          actionData = {
            ...userText,
            medicines: Array.isArray(userText.medicines)
              ? userText.medicines.map(sanitizeMedicineForPayload)
              : userText.medicines,
            medicine: userText.medicine
              ? sanitizeMedicineForPayload(userText.medicine)
              : userText.medicine,
          };
          messageString = JSON.stringify(actionData);
        } else if (userText.selected !== undefined || userText.medicines !== undefined) {
          resolvedActionType = resolvedActionType || "CONFIRM_MEDICINES";
          actionData = {
            ...userText,
            medicines: Array.isArray(userText.medicines)
              ? userText.medicines.map(sanitizeMedicineForPayload)
              : userText.medicines,
          };
          messageString = JSON.stringify(actionData);
        } else if (userText.skipAll) {
          resolvedActionType = resolvedActionType || "SKIP_MEDICINES";
          actionData = { skipAll: true };
          messageString = displayLabel || "Skip";
        } else if (userText.action === "ASK_ALLERGIES" && Array.isArray(userText.allergies)) {
          resolvedActionType = resolvedActionType || "ASK_ALLERGIES";
          actionData = userText;
          messageString = displayLabel || userText.allergies.join(", ");
        } else if (userText.action === "ADD_MEDICINE" || userText.action === "ADD") {
          resolvedActionType = resolvedActionType || "ADD_MEDICINE";
          actionData = userText;
          messageString = displayLabel || "Add Medicines";
        } else if (
          userText.confirmed !== undefined ||
          userText.source !== undefined ||
          userText.action === "RESOLVE_PROFILE_SOURCE"
        ) {
          resolvedActionType = resolvedActionType || "RESOLVE_PROFILE_SOURCE";
          actionData = userText;
          messageString = JSON.stringify(actionData);
        } else {
          actionData = userText;
          messageString = displayLabel || userText.name || userText.action || "Continue";
        }
      } else {
        messageString = String(userText || displayLabel || "Continue");
      }

      if (actionType === "CONFIRM_MEDICINES") {
        resolvedActionType = "CONFIRM_MEDICINES";
        if (!actionData && userText && typeof userText === "object") {
          actionData = {
            ...userText,
            medicines: Array.isArray(userText.medicines)
              ? userText.medicines.map(sanitizeMedicineForPayload)
              : userText.medicines,
          };
        }
        if (actionData) {
          messageString = JSON.stringify(actionData);
        }
      } else if (actionType === "SAVE_AND_REVIEW") {
        resolvedActionType = "SAVE_AND_REVIEW";
        if (!actionData && userText && typeof userText === "object") {
          actionData = {
            ...userText,
            medicines: Array.isArray(userText.medicines)
              ? userText.medicines.map(sanitizeMedicineForPayload)
              : userText.medicines,
            medicine: userText.medicine
              ? sanitizeMedicineForPayload(userText.medicine)
              : userText.medicine,
          };
        }
        if (actionData) {
          messageString = JSON.stringify(actionData);
        }
      } else if (actionType === "ADD_MEDICINE") {
        resolvedActionType = "ADD_MEDICINE";
        actionData = actionData || { action: "ADD_MEDICINE" };
        messageString = messageString || displayLabel || "Add Medicines";
      } else if (actionType === "SKIP_MEDICINES") {
        resolvedActionType = "SKIP_MEDICINES";
        actionData = actionData || { skipAll: true };
        messageString = messageString || displayLabel || "Skip";
      } else if (actionType === "CANCEL") {
        resolvedActionType = "CANCEL";
        messageString = messageString || displayLabel || "Cancel";
      } else if (actionType === "RESOLVE_PROFILE_SOURCE") {
        resolvedActionType = "RESOLVE_PROFILE_SOURCE";
        if (!actionData && userText && typeof userText === "object") {
          actionData = userText;
        } else if (!actionData && typeof userText === "string") {
          try {
            actionData = JSON.parse(userText);
          } catch {
            actionData = { confirmed: true };
          }
        }
        if (actionData) {
          messageString = JSON.stringify(actionData);
        }
      }

      if (
        !resolvedActionType &&
        latestAssistantMessage?.action === "RESOLVE_PROFILE_SOURCE" &&
        (actionData?.confirmed !== undefined ||
          actionData?.source !== undefined ||
          userText === "CONFIRM" ||
          userText === "Confirm & Continue" ||
          displayLabel === "Confirm & Continue")
      ) {
        resolvedActionType = "RESOLVE_PROFILE_SOURCE";
        actionData = actionData || { confirmed: true };
        messageString = JSON.stringify(actionData);
      }

      // Sanitize allergies in updatedState so that raw JSON strings or corrupted array fragments are properly cleaned
      if (updatedState?.existingUserData?.allergies) {
        let cleanedAllergies: string[] = [];
        const rawAllergies = updatedState.existingUserData.allergies;
        if (Array.isArray(rawAllergies)) {
          for (const item of rawAllergies) {
            if (typeof item === "string") {
              if (item.includes('"action":"ASK_ALLERGIES"') || item.includes('"allergies"') || item.startsWith("{")) {
                try {
                  const parsed = JSON.parse(item);
                  if (parsed && Array.isArray(parsed.allergies)) {
                    cleanedAllergies.push(...parsed.allergies.map(String));
                    continue;
                  }
                } catch {
                  const matches = item.match(/"allergies":\s*\[(.*?)\]/);
                  if (matches && matches[1]) {
                    try {
                      const arr = JSON.parse(`[${matches[1]}]`);
                      if (Array.isArray(arr)) {
                        cleanedAllergies.push(...arr.map(String));
                        continue;
                      }
                    } catch {}
                  }
                }
              }
              if (!item.startsWith("{") && !item.includes('"action"') && !item.includes('"allergies"')) {
                cleanedAllergies.push(item);
              }
            }
          }
        } else if (typeof rawAllergies === "string") {
          cleanedAllergies = [rawAllergies];
        }

        updatedState = {
          ...updatedState,
          existingUserData: {
            ...updatedState.existingUserData,
            allergies: cleanedAllergies,
          },
        };
      }

      const payload: any = {
        message: messageString || displayLabel || "Continue",
        history,
        state: updatedState,
        displayLabel,
        fromScreen: "Onboarding",
        loginProvider: updatedState?.loginProvider || state?.loginProvider,
        provider: updatedState?.loginProvider || state?.loginProvider,
        hasSocialData: updatedState?.hasSocialData ?? state?.hasSocialData,
        documentId: normalizeDocumentIds(
          updatedState?.documentId,
          latestAssistantMessage?.documentIds,
          latestAssistantMessage?.document?.id,
        ),
        stream: false,
      };

      if (resolvedActionType) {
        payload.actionType = resolvedActionType;
      }
      if (actionData) {
        payload.actionData = actionData;
      }

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;
      console.log("Onboarding sendMessage Response :- ", resData);

      if (resData) {
        processAssistantResponse(
          resData,
          updatedState,
          resolvedActionType === "CONFIRM_MEDICINES" && Array.isArray(actionData?.medicines)
            ? actionData.medicines
            : undefined,
        );
        const action = resData.actionType || resData.action;
        const responseOnboardingCompleted = Boolean(
          resData.onboardingState?.isOnboardingCompleted ||
          resData.state?.isOnboardingCompleted ||
          resData.isOnboardingCompleted ||
          action === "COMPLETE" ||
          action === "POST_ONBOARDING" ||
          action === "GO_TO_DASHBOARD" ||
          action === "DASHBOARD" ||
          messageString === "DASHBOARD"
        );

        if (
          action === "COMPLETE" ||
          action === "POST_ONBOARDING" ||
          action === "GO_TO_DASHBOARD" ||
          action === "DASHBOARD" ||
          messageString === "DASHBOARD" ||
          (responseOnboardingCompleted &&
            action !== "ASK_REPORT" &&
            action !== "NORMAL_CHAT")
        ) {
          setIsOnboardingCompleted(true);
          queryClient.setQueryData(["profile"], (old: any) => ({
            ...(old || {}),
            onboardingCompleted: true,
            firstName:
              old?.firstName === "User" || !old?.firstName
                ? updatedState?.existingUserData?.firstName || old?.firstName || "User"
                : old?.firstName,
            lastName:
              old?.lastName?.startsWith("+") || !old?.lastName
                ? updatedState?.existingUserData?.lastName || old?.lastName || ""
                : old?.lastName,
            dateOfBirth:
              old?.dateOfBirth ||
              updatedState?.existingUserData?.dateOfBirth ||
              "2000-01-01",
            gender:
              old?.gender || updatedState?.existingUserData?.gender || "Other",
          }));
          queryClient.setQueryData(["userProfile"], (old: any) => ({
            ...(old || {}),
            onboardingCompleted: true,
          }));
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
          queryClient.invalidateQueries({ queryKey: ["medications"] });
          queryClient.invalidateQueries({ queryKey: ["allMedications"] });
          queryClient.invalidateQueries({ queryKey: ["reminders"] });
          queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });
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
      isSendingRef.current = false;
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
    if (loading || isSendingRef.current) return;
    const textToSubmit = input.trim();
    if (selectedFile) {
      uploadSelectedFile(selectedFile);
    } else if (textToSubmit) {
      const latestAssistantMsg = [...messages]
        .reverse()
        .find(
          (m) =>
            m.role === "assistant" &&
            m.action !== "ONBOARDING_COMPLETED_NOTICE",
        );
      const activeAction =
        latestAssistantMsg?.action ||
        messages[messages.length - 1]?.action ||
        state.currentStep;
      let updatedState = { ...state };
      if (activeAction === "ASK_FIRST_NAME" || activeAction === "ASK_NAME") {
        updatedState = {
          ...updatedState,
          existingUserData: {
            ...updatedState.existingUserData,
            firstName: textToSubmit,
          },
        };
        setState(updatedState);
      } else if (activeAction === "ASK_LAST_NAME") {
        updatedState = {
          ...updatedState,
          existingUserData: {
            ...updatedState.existingUserData,
            lastName: textToSubmit,
          },
        };
        setState(updatedState);
      } else if (activeAction === "ASK_BLOOD_GROUP") {
        updatedState.currentStep = "ASK_BLOOD_GROUP";
        if (textToSubmit.toLowerCase() === "skip") {
          updatedState = {
            ...updatedState,
            bloodGroupSkipped: true,
          };
        } else {
          updatedState = {
            ...updatedState,
            bloodGroupSkipped: false,
            existingUserData: {
              ...updatedState.existingUserData,
              bloodGroup: textToSubmit,
            },
          };
        }
        setState(updatedState);
      } else if (activeAction === "ASK_ALLERGIES") {
        const lower = textToSubmit.trim().toLowerCase();
        if (lower === "skip" || lower === "no" || lower === "not_sure" || lower === "not sure") {
          updatedState = {
            ...updatedState,
            allergiesSkipped: true,
            existingUserData: {
              ...updatedState.existingUserData,
              allergies: [],
            },
          };
        } else {
          try {
            const parsed = JSON.parse(textToSubmit);
            if (parsed && Array.isArray(parsed.allergies)) {
              updatedState = {
                ...updatedState,
                allergiesSkipped: true,
                existingUserData: {
                  ...updatedState.existingUserData,
                  allergies: parsed.allergies,
                },
              };
            }
          } catch {
            const splitAllergies = textToSubmit
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            updatedState = {
              ...updatedState,
              allergiesSkipped: true,
              existingUserData: {
                ...updatedState.existingUserData,
                allergies: splitAllergies,
              },
            };
          }
        }
        setState(updatedState);
      }
      sendMessage(textToSubmit, updatedState);
    }
  };

  const handleSkipOnboarding = async () => {
    setLoading(true);
    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const latestAssistantMessage = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");

      const payload = {
        message: "",
        history,
        state,
        actionType: "SKIP_ONBOARDING",
        fromScreen: "Onboarding",
        documentId: normalizeDocumentIds(
          state?.documentId,
          latestAssistantMessage?.documentIds,
        ),
        stream: false,
      };

      const res = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });

      if (res?.data?.success === false) {
        throw new Error(res?.data?.message || "Failed to skip onboarding.");
      }

      const skipCompleted = Boolean(
        res?.data?.data?.actionType === "SKIP_ONBOARDING" ||
        res?.data?.data?.onboardingState?.hasSkipped ||
        res?.data?.data?.onboardingState?.isOnboardingCompleted ||
        res?.data?.data?.state?.isOnboardingCompleted ||
        res?.data?.data?.isOnboardingCompleted ||
        res?.data?.isOnboardingCompleted ||
        true,
      );

      setIsOnboardingCompleted(true);

      // Update profile and userProfile caches only after successful server confirmation
      queryClient.setQueryData(["profile"], (old: any) => {
        return {
          ...(old || {}),
          onboardingCompleted: true,
          firstName:
            old?.firstName === "User" || !old?.firstName
              ? state?.existingUserData?.firstName || old?.firstName || "User"
              : old?.firstName,
          lastName:
            old?.lastName?.startsWith("+") || !old?.lastName
              ? state?.existingUserData?.lastName || old?.lastName || ""
              : old?.lastName,
          dateOfBirth:
            old?.dateOfBirth ||
            state?.existingUserData?.dateOfBirth ||
            "2000-01-01",
          gender:
            old?.gender || state?.existingUserData?.gender || "Other",
        };
      });

      queryClient.setQueryData(["userProfile"], (old: any) => {
        return {
          ...(old || {}),
          onboardingCompleted: true,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    } catch (error: any) {
      console.error("[Onboarding] Skip failed:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to skip onboarding.",
      });
    } finally {
      setLoading(false);
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

    const rawName = asset.name || "";
    const ext = rawName.split(".").pop()?.toLowerCase() || "";

    // Resolve MIME type with fallbacks for common medical document formats
    let mimeType = asset.mimeType;
    if (!mimeType || mimeType === "application/octet-stream" || mimeType === "*/*") {
      if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "doc") mimeType = "application/msword";
      else if (ext === "docx")
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "tiff" || ext === "tif") mimeType = "image/tiff";
      else if (ext === "txt") mimeType = "text/plain";
      else mimeType = "application/octet-stream";
    }

    const SUPPORTED_EXTENSIONS = [
      "pdf",
      "doc",
      "docx",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "tiff",
      "tif",
    ];
    const isAllowedMime = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/tiff",
    ].includes(mimeType?.toLowerCase() || "");

    if (!SUPPORTED_EXTENSIONS.includes(ext) && !isAllowedMime) {
      Toast.show({
        type: "error",
        text1: "Unsupported File Format",
        text2: "Please upload a PDF, DOC, DOCX, or supported medical document format.",
      });
      return;
    }

    if (asset.size && asset.size > 150 * 1024 * 1024) {
      Toast.show({
        type: "error",
        text1: "File Too Large",
        text2: "Selected file exceeds the maximum size limit of 150MB.",
      });
      return;
    }

    const isImage =
      ["jpg", "jpeg", "png", "webp", "tiff", "tif"].includes(ext) ||
      mimeType?.startsWith("image/");
    const isPdf = ext === "pdf" || mimeType === "application/pdf";
    const name =
      rawName || `report_${Date.now()}.${ext || (isPdf ? "pdf" : "doc")}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: mimeType || (isPdf ? "application/pdf" : "application/octet-stream"),
      size: asset.size,
      fileType: (isImage ? "image" : isPdf ? "pdf" : "document") as
        | "pdf"
        | "image"
        | "document",
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleDocumentUpload = () => {
    if (loading) return;
    const isProcessing =
      pollActiveRef.current ||
      uploadState === "uploading" ||
      uploadState === "queued" ||
      uploadState === "processing" ||
      uploadState === "validating";
    if (isProcessing) {
      Toast.show({
        type: "info",
        position: "top",
        text1: "Processing in Progress",
        text2: "A document is currently being processed. Please wait for it to complete.",
      });
      return;
    }
    Keyboard.dismiss();
    uploadSheetRef.current?.present();
  };

  const handleUploadStart = () => {
    setUploadState("uploading");
    setUploadPercent(0);
  };

  const handleUploadSuccess = async (jobIds: string[], filesInfo: any[]) => {
    if (!jobIds || jobIds.length === 0) return;
    const primaryJobId = jobIds[0];
    const primaryFile = filesInfo?.[0];
    const primaryDocId =
      primaryFile?.fileKey || primaryFile?.id || primaryJobId;
    const streamUrl =
      primaryFile?.streamUrl || `/sse/files/${primaryDocId}/stream`;
    const primaryFileName =
      primaryFile?.originalName ||
      primaryFile?.displayName ||
      primaryFile?.name ||
      "report.pdf";

    currentDocIdRef.current = primaryDocId;
    selectedFileRef.current = primaryFile
      ? {
          uri: primaryFile.uri,
          name: primaryFileName,
          type: primaryFile.mimeType || "application/pdf",
          size: primaryFile.size,
          fileType: "document",
        }
      : null;

    await AsyncStorage.setItem("onboarding_pending_job_id", primaryJobId);
    await AsyncStorage.setItem("onboarding_pending_document_id", primaryDocId);

    setUploadState("queued");
    setUploadPercent(0);
    startJobPolling(primaryJobId, primaryDocId, streamUrl);
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

        const resolvedDocumentId =
          normalizeDocumentIds(event.documentId, event.documentIds, event.data)?.[0] ||
          documentId;

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
          setUploadPercent(100);
          setUploadState("success");
          setTimeout(() => {
            setUploadState("idle");
          }, 3000);
          await handleCompletedJob(
            resolvedDocumentId,
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

          if (uploadRetryCountRef.current >= 3) {
            forceContinueManualFlow();
            return;
          }

          setUploadState("failed");
          const errorMsg = event.message || "Document analysis failed.";
          const isNonRetryable =
            event.errorCode === "NON_RETRYABLE" ||
            event.errorCode === "INVALID_REQUEST" ||
            event.retryable === false ||
            (typeof errorMsg === "string" &&
              (errorMsg.toLowerCase().includes("non-retryable") ||
                errorMsg.toLowerCase().includes("cannot be retried")));
          if (isNonRetryable) {
            setIsDocumentRetryable(false);
          }
          Toast.show({
            type: "error",
            text1: isNonRetryable ? "Cannot Retry Document" : "Analysis Failed",
            text2: errorMsg,
          });
          return;
        }

        setUploadState("processing");
        const extractedPct = extractEventProgress(event);
        const nextPct = typeof extractedPct === "number" ? extractedPct : mapStatusToProgress(event);
        setUploadPercent((prev) => Math.min(99, Math.max(prev, nextPct)));
        if (event.extra?.totalPages) {
          setPollTotalPages(event.extra.totalPages);
          if (event.extra.page) {
            setPollCurrentPage(event.extra.page);
          }
        }
      },
      onTerminal: async (event: SseEventPayload) => {
        if (!pollActiveRef.current || cancelRequestedRef.current) return;

        const resolvedDocumentId =
          normalizeDocumentIds(event.documentId, event.documentIds, event.data)?.[0] ||
          documentId;

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
          setUploadPercent(100);
          setUploadState("success");
          setTimeout(() => {
            setUploadState("idle");
          }, 3000);
          await handleCompletedJob(
            resolvedDocumentId,
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

          if (uploadRetryCountRef.current >= 3) {
            forceContinueManualFlow();
            return;
          }

          setUploadState("failed");
          const errorMsg = event.message || "Document analysis failed.";
          const isNonRetryable =
            event.errorCode === "NON_RETRYABLE" ||
            event.errorCode === "INVALID_REQUEST" ||
            event.retryable === false ||
            (typeof errorMsg === "string" &&
              (errorMsg.toLowerCase().includes("non-retryable") ||
                errorMsg.toLowerCase().includes("cannot be retried")));
          if (isNonRetryable) {
            setIsDocumentRetryable(false);
          }
          Toast.show({
            type: "error",
            text1: isNonRetryable ? "Cannot Retry Document" : "Analysis Failed",
            text2: errorMsg,
          });
        }
      },
      onError: (err) => {
        console.warn("[ONBOARDING SSE Error]:", err.message);
      },
    });
  };

  const forceContinueManualFlow = () => {
    pollActiveRef.current = false;
    cancelRequestedRef.current = true;
    if (sseUnsubRef.current) {
      sseUnsubRef.current();
      sseUnsubRef.current = null;
    }
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    AsyncStorage.removeItem("onboarding_pending_job_id");
    AsyncStorage.removeItem("onboarding_pending_document_id");

    setUploadState("idle");
    setValidationDialogVisible(false);
    setSelectedFile(null);
    setInput("");

    Toast.show({
      type: "error",
      text1: "Upload Limit Exceeded",
      text2:
        "You have exceeded the maximum upload limit. Please continue with manual Flow.",
      visibilityTime: 4000,
    });

    const newState = { ...state, flowMode: "MANUAL" };
    setState(newState);
    sendMessage("MANUAL", newState);
  };

  const handleRetryJob = async () => {
    if (uploadRetryCountRef.current >= 3) {
      forceContinueManualFlow();
      return;
    }

    const nextRetryCount = uploadRetryCountRef.current + 1;
    uploadRetryCountRef.current = nextRetryCount;
    setUploadRetryCount(nextRetryCount);

    const rawDocId =
      currentDocIdRef.current ||
      (await AsyncStorage.getItem("onboarding_pending_document_id")) ||
      state?.documentId;

    const docId: string | null = Array.isArray(rawDocId)
      ? rawDocId[0]
      : typeof rawDocId === "string"
        ? rawDocId
        : null;

    if (!docId) {
      const file = selectedFileRef.current || selectedFile;
      if (file) {
        uploadSelectedFile(file);
      }
      return;
    }

    currentDocIdRef.current = docId;
    setUploadState("queued");
    setUploadPercent(10);
    try {
      const response = await retryDocumentProcessing({ jobId: docId, fileKey: docId });
      const respData = (response as any)?.data?.data || (response as any)?.data || response;
      const streamUrl =
        respData?.streamUrl ||
        (respData?.fileKey ? `/sse/files/${respData.fileKey}/stream` : `/sse/files/${docId}/stream`);
      const jobId = respData?.fileKey || respData?.jobId || docId;

      await AsyncStorage.setItem("onboarding_pending_job_id", jobId);
      await AsyncStorage.setItem("onboarding_pending_document_id", docId);

      startJobPolling(jobId, docId, streamUrl);
    } catch (err: any) {
      if (uploadRetryCountRef.current >= 3) {
        forceContinueManualFlow();
        return;
      }

      setUploadState("failed");
      const errorData = err?.response?.data || err?.data || {};
      const errorMsg =
        errorData?.message ||
        err?.message ||
        "This document failed with a non-retryable error and cannot be retried.";
      const isNonRetryable =
        err?.response?.status === 400 ||
        errorData?.errorCode === "INVALID_REQUEST" ||
        errorData?.errorCode === "NON_RETRYABLE" ||
        (typeof errorMsg === "string" &&
          (errorMsg.toLowerCase().includes("non-retryable") ||
            errorMsg.toLowerCase().includes("cannot be retried")));

      if (isNonRetryable) {
        setIsDocumentRetryable(false);
      }

      Toast.show({
        type: "error",
        text1: isNonRetryable ? "Cannot Retry Document" : "Retry Failed",
        text2: errorMsg,
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
    setSelectedFile(null); // Clear selected file so it doesn't auto-upload on next send
    if (sseUnsubRef.current) {
      sseUnsubRef.current();
      sseUnsubRef.current = null;
    }
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    const pendingDocId =
      currentDocIdRef.current ||
      (await AsyncStorage.getItem("onboarding_pending_document_id"));
    if (pendingDocId) {
      try {
        await cancelOcr(pendingDocId);
      } catch (err) {
        console.warn("[ONBOARDING] Failed to call cancelOcr endpoint:", err);
      }
      await handleCancelJob(pendingDocId);
    } else {
      setUploadState("cancelled");
      Toast.show({ type: "info", text1: "Upload cancelled" });
    }
  };

  const handleCompletedJob = async (documentId: string, fileName: string) => {
    uploadRetryCountRef.current = 0;
    setUploadRetryCount(0);
    const newState = {
      ...state,
      flowMode: "UPLOAD",
      uploadedMedicalDocument: true,
      documentUploaded: true,
      documentExtracted: true,
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
    setIsDocumentRetryable(true);
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
      const docId =
        createdItem.documentId ||
        createdItem.id ||
        createdItem.uuid ||
        (createdItem.fileKey && !String(createdItem.fileKey).startsWith("doc_") ? createdItem.fileKey : null) ||
        createdItem.fileKey ||
        createdItem.jobId;
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
      if (uploadRetryCountRef.current >= 3) {
        forceContinueManualFlow();
        return;
      }
      setUploadState("failed");
      let errMsg = error.message || "Document upload sequence failed.";

      if (error.response) {
        const backendErr = error.response.data?.error || error.response.data;
        if (backendErr?.message) errMsg = backendErr.message;
      }

      const isNonRetryable =
        error?.response?.status === 400 ||
        error?.response?.data?.errorCode === "INVALID_REQUEST" ||
        error?.response?.data?.errorCode === "NON_RETRYABLE" ||
        (typeof errMsg === "string" &&
          (errMsg.toLowerCase().includes("non-retryable") ||
            errMsg.toLowerCase().includes("cannot be retried")));

      if (isNonRetryable) {
        setIsDocumentRetryable(false);
      }

      Toast.show({
        type: "error",
        text1: isNonRetryable ? "Cannot Retry Document" : "Upload Failed",
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

  const handleDraftSync = async (updatedDrafts: any[]) => {
    const uniqueDrafts = mergeMedicineReviewState(
      deduplicateDrafts(updatedDrafts),
      localMedicines,
    );
    setLocalMedicines(uniqueDrafts);
    const nextState = {
      ...state,
      medicinesToAdd: uniqueDrafts,
      currentMedicineIndex: uniqueDrafts.length,
    };
    setState((prev) => ({
      ...prev,
      medicinesToAdd: uniqueDrafts,
      currentMedicineIndex: uniqueDrafts.length,
    }));
    const syncPromise = (async () => {
      try {
        await apiClient.post(
          "/v1/onboarding/chat",
          {
            message: JSON.stringify({
              action: "DRAFT_SYNC",
              medicinesToAdd: uniqueDrafts,
            }),
            state: nextState,
            isSilent: true,
            stream: false,
          },
          { timeout: 30000 },
        );
      } catch (e) {
        console.warn("[Onboarding] Silent draft sync failed:", e);
      }
    })();
    pendingDraftSyncRef.current = syncPromise;
    try {
      await syncPromise;
    } finally {
      if (pendingDraftSyncRef.current === syncPromise) {
        pendingDraftSyncRef.current = null;
      }
    }
  };

  const renderOptions = (activeMsg: Message, isHistorical: boolean = false) => {
    const preferredLang = state.preferredLanguage || "english";
    if (preferredLang) {
      AsyncStorage.setItem("preferredLanguage", preferredLang);
    }

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
      const valUpper = String(value || "").toUpperCase().trim();
      const lblLower = String(label || "").toLowerCase().trim();
      const isGoToDashboard =
        valUpper === "GO_TO_DASHBOARD" ||
        valUpper === "DASHBOARD" ||
        valUpper === "GO_TO_HOME" ||
        valUpper === "COMPLETE" ||
        lblLower === "go to dashboard" ||
        lblLower.includes("dashboard");

      if (isGoToDashboard) {
        const optionLabel =
          label ||
          (preferredLang && ONBOARDING_I18N[preferredLang.toLowerCase()]?.dashboard) ||
          "Go to Dashboard";
        const nextState = {
          ...state,
          medicationFlowDone: true,
          medicinesConfirmed: true,
          currentStep: "COMPLETE",
          isOnboardingCompleted: true,
        };
        setState(nextState);
        sendMessage(value, nextState, optionLabel);
      } else if (value === "ADD_MORE_MEDICINES" || value === "ADD") {
        const existingMeds = mergeMedicineReviewState(
          deduplicateDrafts(localMedicines || state?.medicinesToAdd || []),
          localMedicines,
        ).filter(
          (m: any) => !m.isSaved && !m.dbId,
        );
        setLocalMedicines(existingMeds);
        setCurrentClientMedId(null);
        setActiveMedicineToEdit(null);
        const nextState = {
          ...state,
          medicinesFlowStarted: true,
          medicinesToAdd: existingMeds,
          currentStep: "ADD_MEDICINE",
          currentMedicineIndex: existingMeds.length,
          cancellationNotice: false,
        };
        setState(nextState);
        sendMessage("ADD_MEDICINE", nextState, label || "Add Medicines", "ADD_MEDICINE");
      } else if (value === "VIEW_MEDICINES" || value === "VIEW_MY_MEDICINES") {
        setTimeout(() => {
          try {
            if (navigation && typeof navigation.navigate === "function") {
              navigation.navigate("MEDICATION", {
                screen: "MedicationList",
              });
            }
          } catch (e) {
            console.warn("[Onboarding] Navigation to medication not available yet:", e);
          }
        }, 500);
      } else if (value === "ASK_ABOUT_REPORT" || value === "ASK_REPORT" || value === "CONFIRM_DOCUMENT") {
        const newState = {
          ...state,
          documentConfirmed: true,
        };
        setState(newState);
        sendMessage("ASK_REPORT", newState, label, "ASK_REPORT");
      } else if (value === "LOGOUT") {
        logout();
      } else if (
        value === "UPLOAD" ||
        value === "UPLOAD_DOCUMENT" ||
        value === "ADD_DOCUMENT" ||
        value === "USE_DOCUMENT" ||
        label?.toLowerCase() === "upload document" ||
        label?.toLowerCase() === "add document" ||
        label?.toLowerCase() === "use document" ||
        label?.toLowerCase().includes("upload document")
      ) {
        handleDocumentUpload();
        return;
      } else {
        let newState = { ...state };
        if (activeMsg.action === "ASK_BLOOD_GROUP") {
          newState.currentStep = "ASK_BLOOD_GROUP";
          if (value === "SKIP") {
            newState.bloodGroupSkipped = true;
          } else {
            newState.bloodGroupSkipped = false;
            newState.existingUserData = {
              ...newState.existingUserData,
              bloodGroup: value,
            };
          }
          setState(newState);
          sendMessage(value, newState, label);
          return;
        }
        if (activeMsg.action === "ASK_ALLERGIES") {
          newState.currentStep = "ASK_ALLERGIES";
          const upper = String(value).trim().toUpperCase();
          if (upper === "SKIP" || upper === "NO" || upper === "NOT_SURE") {
            newState.allergiesSkipped = true;
            newState.existingUserData = {
              ...newState.existingUserData,
              allergies: [],
            };
          } else if (upper === "YES") {
            // User selected Yes chip; do not set allergies to ["YES"]
            newState.existingUserData = {
              ...newState.existingUserData,
              allergies: Array.isArray(newState.existingUserData?.allergies)
                ? newState.existingUserData.allergies.filter(
                    (a: any) =>
                      !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(
                        String(a).toUpperCase().replace(/\s+/g, ""),
                      ),
                  )
                : [],
            };
          } else {
            try {
              const parsed = JSON.parse(value);
              if (parsed && Array.isArray(parsed.allergies)) {
                newState.allergiesSkipped = true;
                newState.existingUserData = {
                  ...newState.existingUserData,
                  allergies: parsed.allergies,
                };
              } else {
                newState.existingUserData = {
                  ...newState.existingUserData,
                  allergies: [value],
                };
              }
            } catch {
              newState.existingUserData = {
                ...newState.existingUserData,
                allergies: [value],
              };
            }
          }
          setState(newState);
          sendMessage(value, newState, label);
          return;
        }
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

    if (activeMsg.action === "ASK_ALLERGIES") {
      return (
        <AskAllergiesCard
          activeMsg={activeMsg}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onExpand={() => {
            shouldAutoScrollRef.current = true;
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 200);
          }}
          sendMessage={sendMessage}
          state={state}
          setState={setState}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
          loading={loading}
        />
      );
    }

    if (activeMsg.action === "ASK_LANGUAGE") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical || loading ? "none" : "auto"}
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
                disabled={isHistorical || loading}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen || loading ? 0.55 : 1,
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
          chosenVal={isProcessingOrSuccess ? (chosenVal || "UPLOAD") : chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "ASK_GENDER") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical || loading ? "none" : "auto"}
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
                disabled={isHistorical || loading}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen || loading ? 0.55 : 1,
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
          pointerEvents={isHistorical || loading ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical || loading}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: loading ? 0.55 : 1,
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
          pointerEvents={isHistorical || loading ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical || loading}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: loading ? 0.55 : 1,
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
      activeMsg.action === "EDIT_MEDICINE"
    ) {
      const med =
        (isHistorical
          ? activeMsg.medicine
          : activeMedicineToEdit || activeMsg.medicine) || STATIC_EMPTY_MED_OBJ;
      const isEditingLocal = !isHistorical && !!activeMedicineToEdit;

      const handleSave = async (updatedMed: any) => {
        if (isEditingLocal) {
          const targetKey = med.client_med_id || med.id;
          const currentMeds = (localMedicines && localMedicines.length > 0)
            ? localMedicines
            : (activeMsg.medicines && activeMsg.medicines.length > 0 ? activeMsg.medicines : state?.medicinesToAdd || []);

          const updatedMeds = currentMeds.map((m: any) => {
            const isMatch = (
              (med.client_med_id && m.client_med_id === med.client_med_id) ||
              (med.id && m.id === med.id) ||
              (m.client_med_id === targetKey || m.id === targetKey)
            );
            if (!isMatch) return m;

            return {
              ...m,
              ...updatedMed,
              selected: m.selected !== undefined ? m.selected : true,
              subtitle:
                updatedMed.type === "TABLET" ||
                  updatedMed.type === "CAPSULE"
                  ? `${updatedMed.dose?.count || 1} ${(updatedMed.type || "tablet").toLowerCase()}(s) · ${(updatedMed.frequency || "once").toLowerCase()}`
                  : `${updatedMed.dose?.value || 1} ${updatedMed.dose?.unit || ""} · ${(updatedMed.frequency || "once").toLowerCase()}`,
            };
          });
          setLocalMedicines(updatedMeds);
          setState((prev) => ({
            ...prev,
            medicinesToAdd: updatedMeds,
          }));

          setActiveMedicineToEdit(null);
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.action === "REVIEW_MEDICINES_LIST" || msg.id === activeMsg.id) {
                return {
                  ...msg,
                  medicines: updatedMeds,
                };
              }
              return msg;
            }),
          );
          handleDraftSync(updatedMeds);
        } else {
          if (pendingDraftSyncRef.current) {
            try {
              await pendingDraftSyncRef.current;
            } catch { }
          }
          setCurrentClientMedId(null);
          const displayLabel =
            preferredLang === "gujarati" || preferredLang === "gu"
              ? `સાચવો / સમીક્ષા કરો: ${updatedMed.name}`
              : preferredLang === "hindi" || preferredLang === "hi"
                ? `सहेजें / समीक्षा करें: ${updatedMed.name}`
                : preferredLang === "marathi" || preferredLang === "mr"
                  ? `जतन करा / पुनरावलोकन करा: ${updatedMed.name}`
                  : preferredLang === "tamil" || preferredLang === "ta"
                    ? `சேமி / மதிப்பாய்வு: ${updatedMed.name}`
                    : `Save / Review: ${updatedMed.name}`;
          const unconfirmedDrafts = (state?.medicinesToAdd || [])
            .filter((m: any) => !m.isSaved && !m.dbId);
          const nextState = {
            ...state,
            medicinesToAdd: unconfirmedDrafts.length > 0 ? unconfirmedDrafts : [updatedMed],
          };
          sendMessage(
            {
              action: "SAVE_AND_REVIEW",
              saveAndReview: true,
              medicine: updatedMed,
              clientMedId: currentClientMedId,
            },
            nextState,
            displayLabel,
            "SAVE_AND_REVIEW",
          );
        }
      };

      const handleSaveMedicines = async (allDrafts: any[]) => {
        if (pendingDraftSyncRef.current) {
          try {
            await pendingDraftSyncRef.current;
          } catch { }
        }
        const uniqueDrafts = deduplicateDrafts(allDrafts).filter((m: any) => !m.isSaved && !m.dbId);
        setLocalMedicines(uniqueDrafts);
        const nextState = {
          ...state,
          medicinesToAdd: uniqueDrafts,
          currentStep: "REVIEW_MEDICINES_LIST",
        };
        setState(nextState);
        const displayLabel = uiT("saveMedicines") || "Save Medicines";
        sendMessage(
          {
            action: "SAVE_AND_REVIEW",
            saveAndReview: true,
            medicines: uniqueDrafts,
          },
          nextState,
          displayLabel,
          "SAVE_AND_REVIEW",
        );
      };

      const handleAddAndContinue = (newMed: any, allDrafts?: any[]) => {
        const uniqueDrafts = deduplicateDrafts(allDrafts || [...localMedicines, newMed]);
        setLocalMedicines(uniqueDrafts);
        const updatedState = {
          ...state,
          medicinesToAdd: uniqueDrafts,
          currentMedicineIndex: uniqueDrafts.length,
        };
        setState(updatedState);
        handleDraftSync(uniqueDrafts);
      };

      const handleExitToOptions = async () => {
        if (pendingDraftSyncRef.current) {
          try {
            await pendingDraftSyncRef.current;
          } catch { }
        }
        setActiveMedicineToEdit(null);
        setCurrentClientMedId(null);
        setMedicineCardMode("default");
        const confirmedMeds = (localMedicines || state?.medicinesToAdd || []).filter(
          (m: any) => m.isSaved === true,
        );
        setLocalMedicines(confirmedMeds);
        // Preserve ADD_MEDICINE in chat history: do NOT filter out activeMsg or ADD_MEDICINE
        const cancelState = {
          ...state,
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: confirmedMeds,
          currentMedicineIndex: confirmedMeds.length,
          cancellationNotice: true,
        };
        setState(cancelState);
        sendMessage("CANCEL", cancelState, uiT("cancel") || "Cancel", "CANCEL");
      };

      return (
        <AddMedicineCard
          key={activeMsg.id || med.client_med_id || "wizard"}
          med={med}
          initialMedicines={memoizedInitialMedicines}
          isEditingLocal={isEditingLocal}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          currentClientMedId={currentClientMedId}
          setCurrentClientMedId={setCurrentClientMedId}
          onSave={handleSave}
          onAddAndContinue={handleAddAndContinue}
          onDraftSync={
            !isHistorical && !isEditingLocal ? handleDraftSync : undefined
          }
          onSaveMedicines={
            !isHistorical && !isEditingLocal ? handleSaveMedicines : undefined
          }
          onExitToOptions={
            !isHistorical
              ? isEditingLocal
                ? () => {
                    setActiveMedicineToEdit(null);
                    setMedicineCardMode("review");
                  }
                : handleExitToOptions
              : undefined
          }
          onCancel={
            !isHistorical
              ? isEditingLocal
                ? () => {
                    setActiveMedicineToEdit(null);
                    setMedicineCardMode("review");
                  }
                : handleExitToOptions
              : undefined
          }
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "REVIEW_MEDICINES_LIST") {
      const handleConfirm = async (checkedMeds: string[], formattedMeds?: any[]) => {
        if (pendingDraftSyncRef.current) {
          try {
            await pendingDraftSyncRef.current;
          } catch { }
        }
        const selectedMedicineObjects =
          formattedMeds && formattedMeds.length > 0
            ? formattedMeds
            : deduplicateDrafts(localMedicines || []).filter(
              (m) => checkedMeds.includes(m.client_med_id || m.id) || checkedMeds.includes(m.id),
            );
        const uniqueSelected = deduplicateDrafts(selectedMedicineObjects);
        const newState = {
          ...state,
          medicinesConfirmed: true,
          medicinesFlowStarted: true,
          medicinesToAdd: [],
        };
        setState(newState);
        setLocalMedicines([]);
        setActiveMedicineToEdit(null);
        setCurrentClientMedId(null);
        setMedicineCardMode("default");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === activeMsg.id
              ? {
                ...msg,
                // Keep the exact set submitted by the user. The backend may
                // return a partial/stale medicines array on the follow-up
                // response, which must not replace the local selection.
                medicines: uniqueSelected.map((m) => ({
                  ...m,
                  selected: true,
                })),
              }
              : msg,
          ),
        );
        sendMessage(
          {
            selected: checkedMeds,
            medicines: uniqueSelected,
          },
          newState,
          uiT("confirmSelection"),
          "CONFIRM_MEDICINES",
        );
      };

      const handleAddNew = () => {
        const currentMeds = mergeMedicineReviewState(
          deduplicateDrafts(localMedicines || state?.medicinesToAdd || []),
          localMedicines,
        );
        setLocalMedicines(currentMeds);
        setState((prev) => ({
          ...prev,
          medicinesToAdd: currentMeds,
          currentMedicineIndex: currentMeds.length,
        }));
        setActiveMedicineToEdit(null);
        setMedicineCardMode("wizard");

        // The form is rendered below the existing list. Force the chat list to
        // the bottom after the new form has been laid out, even if the user had
        // previously scrolled away from the bottom.
        shouldAutoScrollRef.current = true;
        scrollToBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 250);
      };

      const handleSkipAll = () => {
        setMedicineCardMode("default");
        const newState = {
          ...state,
          medicinesFlowStarted: true,
          medicinesConfirmed: false,
        };
        setState(newState);
        sendMessage({ skipAll: true }, newState, uiT("skipAll"), "SKIP_MEDICINES");
      };

      const handleEdit = (med: any) => {
        setActiveMedicineToEdit(med);
        setMedicineCardMode("wizard");
      };

      const handleExitToOptions = async () => {
        if (pendingDraftSyncRef.current) {
          try {
            await pendingDraftSyncRef.current;
          } catch { }
        }
        setActiveMedicineToEdit(null);
        setCurrentClientMedId(null);
        setMedicineCardMode("default");
        const confirmedMeds = (localMedicines || state?.medicinesToAdd || []).filter(
          (m: any) => m.isSaved === true,
        );
        setLocalMedicines(confirmedMeds);
        // Preserve REVIEW_MEDICINES_LIST in chat history: do NOT filter out activeMsg or REVIEW_MEDICINES_LIST
        const cancelState = {
          ...state,
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: confirmedMeds,
          currentMedicineIndex: confirmedMeds.length,
          cancellationNotice: true,
        };
        setState(cancelState);
        sendMessage("CANCEL", cancelState, uiT("cancel") || "Cancel", "CANCEL");
      };

      const reviewMedicinesList = (
        <ReviewMedicinesListCard
          localMedicines={
            isHistorical ? deduplicateDrafts(activeMsg.medicines || []) : deduplicateDrafts(localMedicines)
          }
          setLocalMedicines={setLocalMedicines}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onAddNew={handleAddNew}
          onSkipAll={handleSkipAll}
          onEdit={handleEdit}
          onCancel={!isHistorical ? handleExitToOptions : undefined}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
          documents={activeMsg.documents}
          showDocumentSummary={false}
        />
      );

      if (!isHistorical && medicineCardMode === "wizard") {
        return (
          <View style={{ width: "100%" }}>
            {reviewMedicinesList}
            <AddMedicineCard
            key={activeMedicineToEdit?.client_med_id || activeMedicineToEdit?.id || "wizard-review-mode"}
            med={activeMedicineToEdit || null}
            initialMedicines={memoizedInitialMedicines}
            includeExistingMedicines={!activeMedicineToEdit}
            isEditingLocal={Boolean(activeMedicineToEdit)}
            preferredLang={preferredLang}
            isDark={isDark}
            theme={theme}
            currentClientMedId={currentClientMedId}
            setCurrentClientMedId={setCurrentClientMedId}
            onSave={(updatedMed) => {
              if (activeMedicineToEdit) {
                const targetKey = activeMedicineToEdit.client_med_id || activeMedicineToEdit.id;
                const currentMeds = (localMedicines && localMedicines.length > 0)
                  ? localMedicines
                  : (activeMsg.medicines && activeMsg.medicines.length > 0 ? activeMsg.medicines : state?.medicinesToAdd || []);

                const updatedMeds = currentMeds.map((m: any) => {
                  const isMatch = (
                    (activeMedicineToEdit.client_med_id && m.client_med_id === activeMedicineToEdit.client_med_id) ||
                    (activeMedicineToEdit.id && m.id === activeMedicineToEdit.id) ||
                    (m.client_med_id === targetKey || m.id === targetKey)
                  );
                  if (!isMatch) return m;

                  return {
                    ...m,
                    ...updatedMed,
                    selected: m.selected !== undefined ? m.selected : true,
                    subtitle:
                      updatedMed.type === "TABLET" || updatedMed.type === "CAPSULE"
                        ? `${updatedMed.dose?.count || 1} ${(updatedMed.type || "tablet").toLowerCase()}(s) · ${(updatedMed.frequency || "once").toLowerCase()}`
                        : `${updatedMed.dose?.value || 1} ${updatedMed.dose?.unit || ""} · ${(updatedMed.frequency || "once").toLowerCase()}`,
                  };
                });
                setLocalMedicines(updatedMeds);
                setState((prev) => ({ ...prev, medicinesToAdd: updatedMeds }));
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === activeMsg.id
                      ? {
                          ...msg,
                          medicines: updatedMeds,
                        }
                      : msg
                  )
                );
                handleDraftSync(updatedMeds);
              }
              setActiveMedicineToEdit(null);
              setMedicineCardMode("review");
            }}
            onAddAndContinue={(newMed: any, allDrafts?: any[]) => {
              const uniqueDrafts = deduplicateDrafts(allDrafts || [...localMedicines, newMed]);
              setLocalMedicines(uniqueDrafts);
              setState((prev) => ({
                ...prev,
                medicinesToAdd: uniqueDrafts,
                currentMedicineIndex: uniqueDrafts.length,
              }));
            }}
            // Review-mode additions are frontend-only until the user confirms the list.
            onDraftSync={undefined}
            onSaveMedicines={(allDrafts) => {
              const uniqueDrafts = deduplicateDrafts(allDrafts);
              setLocalMedicines(uniqueDrafts);
              setState((prev) => ({ ...prev, medicinesToAdd: uniqueDrafts }));
              setActiveMedicineToEdit(null);
              setMedicineCardMode("review");
            }}
            onExitToOptions={() => {
              setActiveMedicineToEdit(null);
              setMedicineCardMode("review");
            }}
            onCancel={() => {
              setActiveMedicineToEdit(null);
              setMedicineCardMode("review");
            }}
            readOnly={false}
            chosenVal={null}
            chosenLabel={null}
            />
          </View>
        );
      }

      return reviewMedicinesList;
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
      const activeIndex = messages.findIndex((m) => m.id === activeMsg.id);
      const isLaterMedicineOptionsPresent =
        activeIndex !== -1 &&
        messages.some(
          (m, idx) =>
            idx > activeIndex &&
            m.role === "assistant" &&
            (m.action === "MEDICINE_OPTIONS" || m.action === "CONFIRM_MEDICINE"),
        );
      if (isLaterMedicineOptionsPresent) {
        return null;
      }

      const isCancelledSubFlow =
        activeIndex !== -1 &&
        messages.some(
          (m, idx) =>
            idx > activeIndex &&
            ((m.role === "user" &&
              (m.rawValue === "CANCEL" ||
                m.content?.toLowerCase() === "cancel")) ||
              (m.role === "assistant" &&
                m.content?.toLowerCase().includes("cancelled"))),
        );
      const effectiveChosenVal = isCancelledSubFlow ? null : chosenVal;
      const effectiveChosenLabel = isCancelledSubFlow ? null : chosenLabel;

      return (
        <MedicineOptionsPanel
          optionsList={activeMsg.options || []}
          isDark={isDark}
          theme={theme}
          onOptionPress={handleOptionPress}
          readOnly={isHistorical && !isCancelledSubFlow}
          loading={loading}
          chosenVal={effectiveChosenVal}
          chosenLabel={effectiveChosenLabel}
          preferredLang={preferredLang}
        />
      );
    }

    const isReportOrConfirmActive =
      activeMsg.action === "ASK_REPORT" ||
      activeMsg.action === "CONFIRM_MEDICINES" ||
      activeMsg.action === "CONFIRM_MEDICINE" ||
      (activeMsg as any).actionType === "CONFIRM_MEDICINES" ||
      activeMsg.action === "REPORT_SUMMARY" ||
      (activeMsg as any).actionType === "REPORT_SUMMARY";

    if (isReportOrConfirmActive) {
      const doc =
        normalizeReportSummaryToDocument(
          activeMsg.reportSummary ||
          (Array.isArray((activeMsg as any).actions)
            ? (activeMsg as any).actions.find(
                (a: any) =>
                  a.actionType === "REPORT_SUMMARY" || a.reportSummary,
              )?.reportSummary
            : null) ||
          activeMsg.document,
          activeMsg.document,
        ) ||
        activeMsg.document ||
        {};

      const hasDoc = Boolean(
        doc &&
        !Array.isArray(doc) &&
        (doc.id ||
          doc.report_id ||
          doc.summary ||
          (doc.keyFindings && doc.keyFindings.length > 0) ||
          doc.key_findings ||
          (Array.isArray(doc.abnormalResults) && doc.abnormalResults.length > 0) ||
          (Array.isArray(doc.abnormal_values) && doc.abnormal_values.length > 0) ||
          doc.extractedStructuredData ||
          doc.fileName ||
          doc.report_name ||
          doc.s3Key),
      );

      if (hasDoc) {
        const questions =
          activeMsg.suggestedQuestions && activeMsg.suggestedQuestions.length > 0
            ? activeMsg.suggestedQuestions
            : (SUGGESTED_QUESTIONS_I18N[preferredLang] || SUGGESTED_QUESTIONS_I18N.english).document;

        const isStructured = Boolean(
          doc.patientDetails ||
          (Array.isArray(doc.abnormalResults) && doc.abnormalResults.length > 0) ||
          (Array.isArray(doc.normalResults) && doc.normalResults.length > 0) ||
          (Array.isArray(doc.abnormal_values) && doc.abnormal_values.length > 0) ||
          (Array.isArray(doc.normal_values) && doc.normal_values.length > 0) ||
          doc.whatThisMayMean ||
          doc.isLabReport
        );

        if (isStructured) {
          return (
            <StructuredReportSummaryCard
              document={doc}
              suggestedQuestions={questions}
              isDark={isDark}
              theme={theme}
              preferredLang={preferredLang}
              onQuestionPress={(q) => {
                const newState = {
                  ...state,
                  documentConfirmed: true,
                };
                setState(newState);
                sendMessage(q, newState, q);
              }}
              onViewFullReport={() => {
                setViewerDoc(doc);
                setIsViewerOpen(true);
              }}
              readOnly={isHistorical}
            />
          );
        }

        return (
          <ReportSummaryChatCard
            document={doc}
            suggestedQuestions={questions}
            isDark={isDark}
            theme={theme}
            preferredLang={preferredLang}
            onQuestionPress={(q) => {
              const newState = {
                ...state,
                documentConfirmed: true,
              };
              setState(newState);
              sendMessage(q, newState, q);
            }}
            onViewFullReport={() => {
              setViewerDoc(doc);
              setIsViewerOpen(true);
            }}
            readOnly={isHistorical}
          />
        );
      }
    }

    if (
      activeMsg.action === "MEDICATION_LIST" ||
      (activeMsg as any).task === "MEDICATION_LIST" ||
      (activeMsg as any).mode === "STRUCTURED_LIST"
    ) {
      const rawMeds = activeMsg.medicines?.length
        ? activeMsg.medicines
        : ((activeMsg as any).items?.length ? (activeMsg as any).items : []);

      const normalizedList = rawMeds.map((m: any) =>
        typeof m === "object" && m.name && m.medicationType
          ? m
          : normalizeMedicationItem(m)
      );

      return (
        <StructuredMedicationListCard
          medicines={normalizedList}
          pagination={(activeMsg as any).pagination}
          isDark={isDark}
          theme={theme}
          preferredLang={preferredLang}
          onViewAllMedications={() => navigation.navigate("MEDICATION")}
          onAddMedication={() => {
            setActiveMedicineToEdit(null);
            setMedicineCardMode("default");
            const addMsg: Message = {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: "Please enter the medication details below:",
              action: "ADD_MEDICINE",
              medicine: {},
            };
            setMessages((prev) => [...prev, addMsg]);
          }}
          onUploadPrescription={() => {
            handleDocumentUpload();
          }}
          readOnly={isHistorical}
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
          pointerEvents={isHistorical || loading ? "none" : "auto"}
        >
          {activeMsg.options.map((opt) => {
            const rawLabel = typeof opt === "string" ? opt : opt.label;
            const label =
              rawLabel === "editManually" || rawLabel === "edit_manually" || rawLabel === "EDIT_MANUALLY"
                ? (uiT("editManually") || "Edit Manually")
                : rawLabel;
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
                disabled={isHistorical || loading}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen || loading ? 0.55 : 1,
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

  const latestAssistantMessage = useMemo(() => {
    return [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          m.action !== "ONBOARDING_COMPLETED_NOTICE",
      );
  }, [messages]);

  const activeAction =
    latestAssistantMessage?.action ||
    messages[messages.length - 1]?.action ||
    state.currentStep;

  const isChatInputHidden =
    activeAction === "ASK_LANGUAGE" ||
    activeAction === "ASK_UPLOAD_OR_SKIP" ||
    activeAction === "RESOLVE_PROFILE_SOURCE" ||
    activeAction === "ASK_GENDER" ||
    activeAction === "ASK_DOB" ||
    activeAction === "ASK_BLOOD_GROUP" ||
    activeAction === "ASK_ALLERGIES" ||
    activeAction === "REVIEW_MEDICINES_LIST" ||
    activeAction === "ADD_MEDICINE" ||
    activeAction === "EDIT_MEDICINE" ||
    activeAction === "CONFIRM_MEDICINE" ||
    activeAction === "MEDICINE_OPTIONS" ||
    activeAction === "ASK_REPORT" ||
    activeAction === "POST_ONBOARDING" ||
    activeAction === "COMPLETE";

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <SafeAreaView
        style={{
          flex: 1,
        }}
        edges={["top", "left", "right"]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View
          style={[
            styles.header,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
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
          <TouchableOpacity
            onPress={handleSkipOnboarding}
            disabled={!canSkip}
            style={{
              opacity: !canSkip ? 0.5 : 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: `${theme.colors.primary}15`,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 13,
                fontWeight: "600",
                marginRight: 4,
              }}
            >
              Skip
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[styles.keyboardContainer, animatedKeyboardStyle]}
        >
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
              automaticallyAdjustKeyboardInsets={false}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom: isChatInputHidden
                    ? Math.max(insets.bottom, 16) + 16
                    : 16,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (shouldAutoScrollRef.current) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              onScrollBeginDrag={() => {
                shouldAutoScrollRef.current = false;
              }}
              onMomentumScrollEnd={(event) => {
                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                const isCloseToBottom =
                  layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
                if (isCloseToBottom) {
                  shouldAutoScrollRef.current = true;
                }
              }}
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
                const { chosenVal, chosenLabel } = findHistoricalUserReply(
                  messages,
                  item.id,
                  false,
                );
                const isAnswered = chosenVal !== null || chosenLabel !== null;
                const isLatestMedicineOptions =
                  item.action === "MEDICINE_OPTIONS" &&
                  !messages.some(
                    (m, idx) =>
                      idx > messages.findIndex((msg) => msg.id === item.id) &&
                      m.role === "assistant" &&
                      (m.action === "MEDICINE_OPTIONS" || m.action === "CONFIRM_MEDICINE"),
                  );
                const isInteractiveMedicineOptions =
                  isLatestMedicineOptions && state.currentStep === "MEDICINE_OPTIONS";
                const isHistorical =
                  isInteractiveMedicineOptions
                    ? false
                    : isAnswered || !isLast;
                const options = renderOptions(item, isHistorical);
                const isJson =
                  item.content && item.content.trim().startsWith("{");
                const hasText =
                  item.content && item.content.trim().length > 0;

                return (
                  <View style={{ width: "100%" }}>
                    {!isJson && hasText && (
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
                        pointerEvents={!isHistorical && !loading ? "auto" : "none"}
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
          {!isChatInputHidden && (
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
        </Animated.View>

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

        {/* Document Selection / Upload Bottom Sheet */}
        <DocumentUploadBottomSheet
          ref={uploadSheetRef}
          fromScreen="Onboarding"
          singleDocument={true}
          onSuccess={handleUploadSuccess}
          onUploadStart={handleUploadStart}
        />

        <UploadValidationDialog
          visible={validationDialogVisible}
          onSelectAgain={handleSelectAgain}
          onContinueManual={handleContinueManual}
          onClose={() => setValidationDialogVisible(false)}
        />

        <DocumentProcessingModal
          isVisible={uploadState !== "idle" && uploadState !== "cancelled"}
          uploadState={uploadState}
          pollElapsedTime={pollElapsedTime}
          progressPercent={uploadPercent}
          onCancel={cancelProcessing}
          onRetry={handleRetryJob}
          isRetryable={isDocumentRetryable && uploadRetryCount < 3}
          isDark={isDark}
          theme={theme}
          preferredLanguage={state.preferredLanguage!}
        />

        <DocumentViewerModal
          visible={isViewerOpen}
          document={viewerDoc}
          onClose={() => {
            setIsViewerOpen(false);
            setViewerDoc(null);
          }}
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
    paddingHorizontal: 8,
    paddingTop: 0,
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
