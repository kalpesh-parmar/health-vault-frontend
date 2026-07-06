import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";

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
import { getUser, updateUser } from "../../services/userService";

// Reusable Redesigned Components
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageBubble } from "../../components/chat/MessageBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import UploadBottomSheet from "../../components/upload/UploadBottomSheet";
import DocumentPreview from "../../components/upload/DocumentPreview";
import UploadValidationDialog from "../../components/upload/UploadValidationDialog";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: string;
  options?: any[];
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string;
  mode?: string;
  title?: string;
  subtitle?: string;
  explainer?: string;
};

type UserData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  email: string;
};

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const isUploadingRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [isEditingProfileManually, setIsEditingProfileManually] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    fileType: "pdf" | "image";
  } | null>(null);
  const [validationDialogVisible, setValidationDialogVisible] = useState(false);

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
    },
  });

  const flatListRef = useRef<FlatList>(null);
  const uploadSheetRef = useRef<any>(null);

  // Keyboard adjustments matching AIChatScreen
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
        firstName:
          userData.firstName === "User" ? "" : userData.firstName || "",
        lastName: userData.lastName?.startsWith("+")
          ? ""
          : userData.lastName || "",
        dateOfBirth: userData.dateOfBirth
          ? format(new Date(userData.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies)
          ? userData.allergies
          : typeof userData.allergies === "string" && userData.allergies
            ? (userData.allergies as string).split(",").map((s) => s.trim())
            : [],
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

      setState(newState);

      if (messages.length === 0) {
        startOnboardingChat(newState);
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
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;
      console.log("AI Response :- ", resData);

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
    const preferredLang =
      aiRes.preferredLanguage || currentState.preferredLanguage || "english";

    const messageContent =
      preferredLang === "gujarati"
        ? aiRes.message_gu || aiRes.message
        : aiRes.message_en || aiRes.message;

    const newMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: messageContent || "Please provide the information.",
      action: aiRes.action,
      options: aiRes.options,
      fields: aiRes.fields,
      loginSummary: aiRes.loginSummary,
      documentSummary: aiRes.documentSummary,
      mode: aiRes.mode,
      title: aiRes.title,
      subtitle: aiRes.subtitle,
      explainer: aiRes.explainer,
    };

    setMessages((prev) => [...prev, newMsg]);

    let updatedUserData = { ...currentState.existingUserData };

    if (aiRes.action === "REGISTER_USER" && aiRes.data) {
      handleRegistration(aiRes.data);
      return;
    }

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
        hasSocialData: aiRes.hasSocialData !== undefined ? aiRes.hasSocialData : finalState.hasSocialData,
        foundMedicines: aiRes.foundMedicines || finalState.foundMedicines,
        medicinesFlowStarted: aiRes.medicinesFlowStarted !== undefined ? aiRes.medicinesFlowStarted : finalState.medicinesFlowStarted,
        medicinesConfirmed: aiRes.medicinesConfirmed !== undefined ? aiRes.medicinesConfirmed : finalState.medicinesConfirmed,
        medicinesToAdd: aiRes.medicinesToAdd || finalState.medicinesToAdd,
        currentMedicineIndex: aiRes.currentMedicineIndex !== undefined ? aiRes.currentMedicineIndex : finalState.currentMedicineIndex,
        medicinesSavedToDb: aiRes.medicinesSavedToDb !== undefined ? aiRes.medicinesSavedToDb : finalState.medicinesSavedToDb,
        existingUserData: updatedUserData,
      };
    }

    setState(finalState);

    if (finalState.documentExtracted) {
      setUploadProgress(null);
    }
  };

  const sendMessage = async (userText: string, updatedState = state, displayLabel?: string) => {
    if (!userText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayLabel || userText,
    };

    setMessages((prev) => [...prev, userMsg]);
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
      };

      console.log("Payload for Onboarding Chat :- ", payload);

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      console.log("Response for Onboarding Chat :- ", response);
      const resData = response.data?.data;

      if (resData) {
        processAssistantResponse(resData, updatedState);
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

  const handleRegistration = async (registerData: UserData) => {
    setLoading(true);
    try {
      const user = await getUser();
      const userId = user?.data?.id;
      if (!userId) throw new Error("No user ID found.");

      const payload = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        dateOfBirth: registerData.dateOfBirth,
        gender: registerData.gender,
        bloodGroup: registerData.bloodGroup || undefined,
        allergies:
          registerData.allergies && registerData.allergies.length > 0
            ? registerData.allergies
            : undefined,
      };

      await updateUser(userId, payload);

      Toast.show({
        type: "success",
        text1: "Onboarding Completed! 🎉",
        text2: "Welcome to your health dashboard.",
      });

      // Refetch profile queries
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    } catch (error: any) {
      console.error("[Onboarding] Registration failed:", error);
      Toast.show({
        type: "error",
        text1: "Registration Error",
        text2: error.message || "Failed to update profile.",
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
        setEditedProfileData((prev: any) => ({ ...prev, dateOfBirth: dobString }));
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

  const handleGenderSelect = (gender: string) => {
    const updatedUserData = {
      ...state.existingUserData,
      gender,
    };
    const newState = {
      ...state,
      existingUserData: updatedUserData,
    };
    setState(newState);
    sendMessage(gender, newState);
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

  const pollOcrStatus = async (documentId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get(`/v1/ocr/status/${documentId}`);
          const resData = statusRes.data?.data;
          console.log("[ONBOARDING] Poll OCR Status:", resData?.status);

          if (resData?.status === "done") {
            clearInterval(interval);
            resolve(resData);
          } else if (resData?.status === "failed") {
            clearInterval(interval);
            reject(new Error("Document processing failed on the server."));
          }
        } catch (error) {
          console.error("[ONBOARDING] Status poll error:", error);
        }
      }, 3000);
    });
  };

  const pollLatestDocumentStatus = async (fileName: string): Promise<any> => {
    const startTime = Date.now();
    const pollTimeout = 240000; // 4 minutes
    const pollInterval = 5000;  // 5 seconds

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (Date.now() - startTime > pollTimeout) {
          clearInterval(interval);
          reject(new Error("Document processing timed out on server."));
          return;
        }

        try {
          const listRes = await apiClient.get("/v1/documents/list?limit=5");
          const items = listRes.data?.data?.items || [];
          const latestDoc = items.find((item: any) => item.fileName === fileName);
          
          if (latestDoc) {
            console.log("[ONBOARDING] Polling latest document status:", latestDoc.ocrStatus);
            if (latestDoc.ocrStatus === "completed") {
              clearInterval(interval);
              resolve({
                document: latestDoc,
                structuredData: latestDoc.structuredExtractedData || {},
              });
            } else if (latestDoc.ocrStatus === "failed") {
              clearInterval(interval);
              reject(new Error("Document processing failed on server."));
            }
          }
        } catch (error) {
          console.warn("[ONBOARDING] Polling latest document error:", error);
        }
      }, pollInterval);
    });
  };

  const handleSuccessfulOcr = async (pollResult: any, fileName: string) => {
    const docData = pollResult.document || {};
    const extractedText = docData.ocrExtractedText || "";
    const structured = pollResult.structuredData || {};

    console.log("[ONBOARDING] Extracted Structured Data:", structured);

    const parsedAllergies = Array.isArray(structured.allergies)
      ? structured.allergies
      : [];

    let firstName = structured.firstName || "";
    let lastName = structured.lastName || "";
    if (!firstName && !lastName && structured.patientName) {
      const parts = structured.patientName.trim().split(/\s+/);
      if (parts.length > 0) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
    }

    const updatedUserData = {
      ...state.existingUserData,
      firstName: firstName || state.existingUserData.firstName || "",
      lastName: lastName || state.existingUserData.lastName || "",
      dateOfBirth:
        structured.dateOfBirth ||
        structured.reportDate ||
        state.existingUserData.dateOfBirth ||
        "",
      gender: structured.gender || state.existingUserData.gender || "",
      bloodGroup:
        structured.bloodGroup || state.existingUserData.bloodGroup || "",
      allergies:
        parsedAllergies.length > 0
          ? parsedAllergies
          : state.existingUserData.allergies || [],
      email: structured.email || state.existingUserData.email || "",
      phoneNumber: structured.phoneNumber || state.existingUserData.phoneNumber || "",
    };

    const newState = {
      ...state,
      flowMode: "UPLOAD",
      uploadedMedicalDocument: true,
      documentUploaded: true,
      documentText: extractedText,
      documentExtracted: true,
      documentData: {
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: structured.dateOfBirth || structured.reportDate || null,
        gender: structured.gender || null,
        email: structured.email || null,
        phoneNumber: structured.phoneNumber || null,
      },
      existingUserData: updatedUserData,
    };

    setState(newState);
    setUploadProgress(null);

    // Reset selected states
    setSelectedFile(null);
    setInput("");

    sendMessage("Document Uploaded: " + fileName, newState);
  };

  const uploadSelectedFile = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return;
    if (isUploadingRef.current) {
      console.log("[ONBOARDING] Upload already in progress. Ignoring duplicate trigger.");
      return;
    }

    isUploadingRef.current = true;
    setLoading(true);
    setUploadProgress("Uploading and validating report...");
    console.log("[ONBOARDING] Upload Started");
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: fileToUpload.uri,
        name: fileToUpload.name,
        type: fileToUpload.type,
      } as any);

      const response = await apiClient.post("/v1/ocr/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });

      console.log("[ONBOARDING] Upload Success, checking document status...");
      const docId = response.data?.data?.documentId || response.data?.data?.document?.id;
      if (!docId) {
        throw new Error("Failed to start processing: no document ID returned.");
      }

      setUploadProgress("Analyzing report details...");
      const pollResult = await pollOcrStatus(docId);
      await handleSuccessfulOcr(pollResult, fileToUpload.name);

    } catch (error: any) {
      console.error("[Onboarding] Document processing failed:", error);
      
      const isTimeoutOrNetworkError = 
        error.message?.toLowerCase().includes("timeout") ||
        error.message?.toLowerCase().includes("network") ||
        error.code === "ECONNABORTED" ||
        !error.response;

      if (isTimeoutOrNetworkError) {
        setUploadProgress("Analyzing report details (connection timed out, polling status)...");
        try {
          const pollResult = await pollLatestDocumentStatus(fileToUpload.name);
          if (pollResult) {
            await handleSuccessfulOcr(pollResult, fileToUpload.name);
            return;
          }
        } catch (pollErr) {
          console.error("[Onboarding] Polling latest document status failed:", pollErr);
        }
      }

      setUploadProgress(null);

      const errCode = error?.response?.data?.error?.code;
      if (errCode === "INVALID_MEDICAL_DOCUMENT") {
        setValidationDialogVisible(true);
      } else {
        // Signal failure to backend state machine
        sendMessage("OCR_FAILED", state);
        Toast.show({
          type: "error",
          text1: "Scan Failed",
          text2:
            error?.response?.data?.error?.message ||
            error.message ||
            "Failed to process medical document.",
        });
      }
    } finally {
      isUploadingRef.current = false;
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
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

  const renderOptions = (activeMsg: Message) => {
    const preferredLang = state.preferredLanguage || "en";

    const handleOptionPress = (value: string, label: string) => {
      if (value === "GO_TO_DASHBOARD" || value === "DASHBOARD") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      } else if (value === "ADD_MORE_MEDICINES") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        setTimeout(() => {
          navigation.navigate("MEDICATION", {
            screen: "MedicationOperation",
            params: { operation: "add" },
          });
        }, 500);
      } else if (value === "VIEW_MEDICINES" || value === "VIEW_MY_MEDICINES") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        setTimeout(() => {
          navigation.navigate("MEDICATION", {
            screen: "MedicationList",
          });
        }, 500);
      } else if (value === "ASK_ABOUT_REPORT") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
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

    const getFieldIcon = (key: string) => {
      switch (key) {
        case "firstName":
        case "lastName":
          return "person-outline";
        case "phoneNumber":
        case "mobile":
          return "call-outline";
        case "dateOfBirth":
        case "dob":
          return "calendar-outline";
        case "gender":
          return "male-female-outline";
        case "email":
          return "mail-outline";
        case "bloodGroup":
          return "water-outline";
        default:
          return "help-circle-outline";
      }
    };

    if (activeMsg.action === "RESOLVE_PROFILE_SOURCE") {
      const fields = activeMsg.fields || [];
      const loginSummary = activeMsg.loginSummary || "";
      const documentSummary = activeMsg.documentSummary || "";

      if (isEditingProfileManually) {
        return (
          <View style={styles.resolveCardContainer}>
            <View style={styles.resolveCardHeader}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary, marginLeft: 8 }]}>
                {preferredLang === "gujarati" ? "પ્રોફાઇલ વિગતો સુધારો" : "Edit Profile Details"}
              </Text>
            </View>
            <View style={styles.editFormContainer}>
              {fields.map((field: any) => {
                if (field.verified) return null;

                if (field.key === "dateOfBirth") {
                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.textInput,
                          {
                            borderColor: isDark ? "#475569" : "#cbd5e1",
                            backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            justifyContent: "center",
                          },
                        ]}
                        onPress={() => {
                          setDatePickerMode("date");
                          setDatePickerVisible(true);
                        }}
                      >
                        <Text style={{ color: editedProfileData.dateOfBirth ? theme.colors.textPrimary : (isDark ? "#64748b" : "#94a3b8") }}>
                          {editedProfileData.dateOfBirth || (preferredLang === "gujarati" ? "જન્મ તારીખ પસંદ કરો" : "Select Date of Birth")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (field.key === "gender") {
                  const currentGen = (editedProfileData.gender || "").toLowerCase();
                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <TouchableOpacity
                          style={[
                            styles.resolveActionButton,
                            {
                              flex: 1,
                              marginRight: 6,
                              backgroundColor: currentGen === "male" ? theme.colors.primary : (isDark ? "#1e293b" : "#f1f5f9"),
                              borderColor: currentGen === "male" ? theme.colors.primary : (isDark ? "#475569" : "#cbd5e1"),
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setEditedProfileData((prev: any) => ({ ...prev, gender: "male" }))}
                        >
                          <Text style={[styles.resolveActionButtonText, { color: currentGen === "male" ? "#ffffff" : theme.colors.textPrimary }]}>
                            {preferredLang === "gujarati" ? "પુરુષ" : "Male"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.resolveActionButton,
                            {
                              flex: 1,
                              marginLeft: 6,
                              backgroundColor: currentGen === "female" ? theme.colors.primary : (isDark ? "#1e293b" : "#f1f5f9"),
                              borderColor: currentGen === "female" ? theme.colors.primary : (isDark ? "#475569" : "#cbd5e1"),
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setEditedProfileData((prev: any) => ({ ...prev, gender: "female" }))}
                        >
                          <Text style={[styles.resolveActionButtonText, { color: currentGen === "female" ? "#ffffff" : theme.colors.textPrimary }]}>
                            {preferredLang === "gujarati" ? "સ્ત્રી" : "Female"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                if (field.key === "phoneNumber") {
                  const phoneStr = editedProfileData.phoneNumber || "";
                  let countryCode = "+91";
                  let nationalNumber = phoneStr;
                  if (phoneStr.startsWith("+")) {
                    countryCode = phoneStr.slice(0, 3);
                    nationalNumber = phoneStr.slice(3);
                  } else if (phoneStr.length > 10) {
                    countryCode = "+" + phoneStr.slice(0, 2);
                    nationalNumber = phoneStr.slice(2);
                  }

                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              width: 60,
                              marginRight: 8,
                              textAlign: "center",
                              color: theme.colors.textPrimary,
                              borderColor: isDark ? "#475569" : "#cbd5e1",
                              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            },
                          ]}
                          value={countryCode}
                          onChangeText={(cc) => {
                            setEditedProfileData((prev: any) => ({
                              ...prev,
                              phoneNumber: cc + nationalNumber,
                            }));
                          }}
                          placeholder="+91"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        />
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              flex: 1,
                              color: theme.colors.textPrimary,
                              borderColor: isDark ? "#475569" : "#cbd5e1",
                              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            },
                          ]}
                          value={nationalNumber}
                          onChangeText={(num) => {
                            setEditedProfileData((prev: any) => ({
                              ...prev,
                              phoneNumber: countryCode + num,
                            }));
                          }}
                          keyboardType="phone-pad"
                          placeholder="Phone Number"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={field.key} style={styles.inputGroup}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                        {field.label}
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: theme.colors.textPrimary,
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        },
                      ]}
                      value={editedProfileData[field.key] || ""}
                      onChangeText={(val) =>
                        setEditedProfileData((prev: any) => ({ ...prev, [field.key]: val }))
                      }
                      placeholder={field.label}
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      keyboardType={field.key === "email" ? "email-address" : "default"}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.resolveActionButtonsRow}>
              <TouchableOpacity
                style={[styles.resolveActionButton, { backgroundColor: theme.colors.primary, flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setIsEditingProfileManually(false);
                  sendMessage(JSON.stringify({ edited: editedProfileData }), state, "Saved manual changes");
                }}
              >
                <Text style={styles.resolveActionButtonText}>
                  {preferredLang === "gujarati" ? "સાચવો" : "Save Details"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.resolveActionButton,
                  { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 1 },
                ]}
                onPress={() => setIsEditingProfileManually(false)}
              >
                <Text style={[styles.resolveActionButtonText, { color: theme.colors.textPrimary }]}>
                  {preferredLang === "gujarati" ? "રદ કરો" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      const mode = activeMsg.mode || "CONFIRM";

      return (
        <View style={styles.resolveCardContainer}>
          {/* Header */}
          <View style={styles.resolveCardHeader}>
            <View style={[styles.shieldIconContainer, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff" }]}>
              <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary }]}>
                {activeMsg.title || (mode === "CONFIRM"
                  ? (preferredLang === "gujarati" ? "પ્રોફાઇલ વિગતોની પુષ્ટિ કરો" : "Confirm your profile details")
                  : (preferredLang === "gujarati" ? "અમને બે અલગ પ્રોફાઇલ મળી છે" : "We found two different profiles"))}
              </Text>
              <Text style={[styles.resolveCardSubtitle, { color: theme.colors.textSecondary }]}>
                {activeMsg.subtitle || (mode === "CONFIRM"
                  ? (preferredLang === "gujarati" ? "કૃપા કરીને નીચેની બધી વિગતો તપાસો અને પુષ્ટિ કરો" : "Please check and confirm all details below")
                  : (preferredLang === "gujarati" ? "કૃપા કરીને સમીક્ષા કરો અને તમારી પસંદગી પસંદ કરો" : "Please review and choose the one you prefer"))}
              </Text>
            </View>
          </View>

          {/* VS Card Columns or CONFIRM layout */}
          {mode === "CONFIRM" ? (
            <View style={[styles.vsColumn, { borderColor: isDark ? "#475569" : "#cbd5e1", width: "100%", marginBottom: 12, borderWidth: 1, borderRadius: 8, overflow: "hidden" }]}>
              <View style={[styles.columnHeader, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
                <Ionicons name="person-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.columnHeaderTitle, { color: theme.colors.textPrimary }]}>
                  {preferredLang === "gujarati" ? "તમારી વિગતો" : "Your Details"}
                </Text>
              </View>
              <View style={styles.columnBody}>
                {fields.map((field: any) => {
                  const val = field.value;
                  return (
                    <View key={field.key} style={styles.fieldRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {!field.verified && (
                          <TouchableOpacity
                            onPress={() => {
                              const initData: any = {};
                              fields.forEach((f: any) => {
                                initData[f.key] = f.value || "";
                              });
                              setEditedProfileData(initData);
                              setIsEditingProfileManually(true);
                            }}
                          >
                            <Ionicons name="pencil" size={12} color={theme.colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.fieldValue,
                          {
                            color: field.verified
                              ? (isDark ? "#64748b" : "#94a3b8")
                              : theme.colors.textPrimary,
                            paddingLeft: 15
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {val || "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.vsContainer}>
              {/* Social Login Column */}
              <View style={[styles.vsColumn, { borderColor: "rgba(59, 130, 246, 0.2)" }]}>
                <View style={[styles.columnHeader, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff" }]}>
                  <Ionicons name="logo-google" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                  <Text style={[styles.columnHeaderTitle, { color: "#3b82f6" }]}>
                    {preferredLang === "gujarati" ? "સોશિયલ લોગિનથી" : "From Social Login"}
                  </Text>
                </View>
                <View style={styles.columnBody}>
                  {fields.map((field: any) => {
                    const val = field.loginValue;
                    return (
                      <View key={field.key} style={styles.fieldRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : field.isMismatch ? (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#d97706", marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {field.isMismatch ? (
                          <View style={[styles.highlightChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" }]}>
                            <Text style={[styles.fieldValue, { color: "#d97706", fontWeight: "bold" }]} numberOfLines={1}>
                              {val || "—"}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.fieldValue,
                              {
                                color: field.verified
                                  ? (isDark ? "#64748b" : "#94a3b8")
                                  : theme.colors.textPrimary,
                                paddingLeft: 15
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {val || "—"}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* VS Badge */}
              <View style={[styles.vsBadge, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#475569" : "#cbd5e1" }]}>
                <Text style={[styles.vsBadgeText, { color: theme.colors.textPrimary }]}>VS</Text>
              </View>

              {/* Document Column */}
              <View style={[styles.vsColumn, { borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                <View style={[styles.columnHeader, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5" }]}>
                  <Ionicons name="document-text" size={16} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.columnHeaderTitle, { color: "#10b981" }]}>
                    {preferredLang === "gujarati" ? "દસ્તાવેજથી" : "From Document"}
                  </Text>
                </View>
                <View style={styles.columnBody}>
                  {fields.map((field: any) => {
                    const val = field.documentValue;
                    return (
                      <View key={field.key} style={styles.fieldRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : field.isMismatch ? (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#d97706", marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {field.isMismatch ? (
                          <View style={[styles.highlightChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" }]}>
                            <Text style={[styles.fieldValue, { color: "#d97706", fontWeight: "bold" }]} numberOfLines={1}>
                              {val || "—"}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.fieldValue,
                              {
                                color: field.verified
                                  ? (isDark ? "#64748b" : "#94a3b8")
                                  : theme.colors.textPrimary,
                                paddingLeft: 15
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {val || "—"}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Explainer box */}
          {mode === "CONFLICT" && (
            <View style={[styles.explainerBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.explainerText, { color: theme.colors.textSecondary }]}>
                {activeMsg.explainer || (preferredLang === "gujarati"
                  ? "વિગતો દસ્તાવેજો અને સામાજિક પ્રોફાઇલમાં ક્યારેક અલગ હોઈ શકે છે."
                  : "Name details can sometimes be written differently in documents vs social profiles.")}
              </Text>
            </View>
          )}

          {/* Large Action Buttons Side-by-Side */}
          {mode === "CONFIRM" ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#10b981", flex: 1, marginRight: 6, justifyContent: "center", paddingVertical: 12 }]}
                onPress={() => sendMessage(JSON.stringify({ confirmed: true }), state, "Confirm Details")}
              >
                <Text style={[styles.bigActionButtonTextSide, { color: "#ffffff", textAlign: "center" }]} numberOfLines={1}>
                  {preferredLang === "gujarati" ? "પુષ્ટિ કરો અને ચાલુ રાખો" : "Confirm & Continue"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bigActionButtonSide,
                  { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 1, marginLeft: 6, justifyContent: "center", paddingVertical: 12 },
                ]}
                onPress={() => {
                  const initData: any = {};
                  fields.forEach((f: any) => {
                    initData[f.key] = f.value || "";
                  });
                  setEditedProfileData(initData);
                  setIsEditingProfileManually(true);
                }}
              >
                <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary, textAlign: "center" }]} numberOfLines={1}>
                  {preferredLang === "gujarati" ? "વિગતો સુધારો" : "Edit Details"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#3b82f6", flex: 1, marginRight: 6 }]}
                onPress={() => sendMessage(JSON.stringify({ source: "LOGIN" }), state, "Use Social Login")}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.bigActionButtonTextSide} numberOfLines={1}>
                    {preferredLang === "gujarati" ? "સોશિયલ લોગિન વાપરો" : "Use Social Login"}
                  </Text>
                  {loginSummary ? (
                    <Text style={styles.bigActionButtonSubtitleSide} numberOfLines={1}>
                      {loginSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#10b981", flex: 1, marginLeft: 6 }]}
                onPress={() => sendMessage(JSON.stringify({ source: "DOCUMENT" }), state, "Use Document")}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.bigActionButtonTextSide} numberOfLines={1}>
                    {preferredLang === "gujarati" ? "દસ્તાવેજ વાપરો" : "Use Document"}
                  </Text>
                  {documentSummary ? (
                    <Text style={styles.bigActionButtonSubtitleSide} numberOfLines={1}>
                      {documentSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Center Manual Edit Link */}
          {mode === "CONFLICT" && (
            <TouchableOpacity
              style={styles.manualEditLink}
              onPress={() => {
                const initData: any = {};
                fields.forEach((f: any) => {
                  initData[f.key] = f.loginValue || f.documentValue || "";
                });
                setEditedProfileData(initData);
                setIsEditingProfileManually(true);
              }}
            >
              <Text style={[styles.manualEditLinkLabel, { color: theme.colors.primary }]}>
                {preferredLang === "gujarati" ? "તેના બદલે વિગતો જાતે સુધારો" : "Edit manually instead"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (activeMsg.action === "ASK_LANGUAGE") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                const newState = { ...state, preferredLanguage: opt.value };
                setState(newState);
                sendMessage(opt.value, newState, opt.label);
              }}
            >
              <Text style={styles.chipText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeMsg.action === "ASK_UPLOAD_OR_SKIP") {
      const uploadOpt =
        (activeMsg.options || []).find((o) => o.value === "UPLOAD") || {};
      const manualOpt =
        (activeMsg.options || []).find((o) => o.value === "MANUAL") || {};

      const uploadLabel =
        preferredLang === "gujarati"
          ? uploadOpt.label_gu || uploadOpt.label || "મેડિકલ રિપોર્ટ અપલોડ કરો"
          : uploadOpt.label_en || uploadOpt.label || "Upload Medical Report";
      const manualLabel =
        preferredLang === "gujarati"
          ? manualOpt.label_gu || manualOpt.label || "છોડો અને મેન્યુઅલી દાખલ કરો"
          : manualOpt.label_en || manualOpt.label || "Skip and Enter Manually";

      return (
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
            onPress={handleDocumentUpload}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="cloud-upload" size={24} color="#fff" />
            </View>
            <Text
              style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
            >
              {uploadLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: "rgba(100, 116, 139, 0.1)" },
            ]}
            onPress={() => {
              const newState = { ...state, flowMode: "MANUAL" };
              setState(newState);
              sendMessage("MANUAL", newState, manualLabel);
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#64748b" }]}>
              <Ionicons name="create" size={24} color="#fff" />
            </View>
            <Text
              style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
            >
              {manualLabel}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_GENDER") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => {
            const label =
              preferredLang === "gujarati" ? opt.label_gu || opt.label : opt.label_en || opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const updatedUserData = { ...state.existingUserData, gender: opt.value };
                  const newState = { ...state, existingUserData: updatedUserData };
                  setState(newState);
                  sendMessage(opt.value, newState, label);
                }}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.action === "ASK_DOB" || activeMsg.action === "ASK_MEDICINE_START_DATE") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setDatePickerMode("date");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name="calendar"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>
              {preferredLang === "gujarati"
                ? "તારીખ પસંદ કરો"
                : "Choose Date"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_MEDICINE_SCHEDULE") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setDatePickerMode("time");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name="time"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>
              {preferredLang === "gujarati"
                ? "સમય પસંદ કરો"
                : "Choose Time"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "REVIEW_MEDICINES_LIST") {
      return (
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
            {preferredLang === "gujarati" ? "દવાઓની સૂચિ" : "Medication Summary"}
          </Text>
          {(state.medicinesToAdd || []).map((med, index) => (
            <View key={index} style={[styles.medCard, { backgroundColor: isDark ? "#334155" : "#f1f5f9" }]}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: "bold" }}>
                {med.medicationName || "Unknown"}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {preferredLang === "gujarati" ? "ડોઝ: " : "Dose: "}{med.dosePerIntake} | {preferredLang === "gujarati" ? "સમય: " : "Frequency: "}{med.frequency}
              </Text>
            </View>
          ))}
          <View style={styles.chipRow}>
            {(activeMsg.options || []).map((opt) => {
              const label = preferredLang === "gujarati" ? opt.label_gu || opt.label : opt.label_en || opt.label;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                  onPress={() => sendMessage(opt.value, state, label)}
                >
                  <Text style={styles.chipText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (activeMsg.action === "POST_ONBOARDING") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => {
            const label =
              preferredLang === "gujarati" ? opt.label_gu || opt.label : opt.label_en || opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleOptionPress(opt.value, label)}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.options && activeMsg.options.length > 0) {
      return (
        <View style={styles.chipRow}>
          {activeMsg.options.map((opt) => {
            const label =
              typeof opt === "string"
                ? opt
                : preferredLang === "gujarati"
                  ? opt.label_gu || opt.label_en || opt.label || opt.value
                  : opt.label_en || opt.label || opt.value;
            const value = typeof opt === "string" ? opt : opt.value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleOptionPress(value, typeof label === "string" ? label : value)}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return null;
  };

  const activeAction = messages[messages.length - 1]?.action;

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
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

        <View
          style={[styles.keyboardContainer, { paddingBottom: keyboardPadding }]}
        >
          {/* Messages List */}
          <View style={styles.listWrapper}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                console.log("Message Item : ", item);
                const isAi = item.role === "assistant";
                const mappedMsg = {
                  id: item.id,
                  role: isAi ? ("ai" as const) : ("user" as const),
                  text: item.content,
                };
                const options = renderOptions(item);

                return (
                  <View style={{ width: "100%" }}>
                    <MessageBubble message={mappedMsg} isDark={isDark} />
                    {isAi && options !== null && (
                      <View style={styles.optionsWrapper}>{options}</View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Typing Indicator */}
          {loading && <TypingIndicator isDark={isDark} />}

          {/* Document Upload Progress Overlay */}
          {uploadProgress && (
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  styles.progressText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {uploadProgress}
              </Text>
            </View>
          )}

          {/* Selected Document Preview */}
          {selectedFile && (
            <DocumentPreview
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              uri={selectedFile.uri}
              fileType={selectedFile.fileType}
              onRemove={handleRemoveFile}
            />
          )}

          {/* Floating Input Capsule */}
          {activeAction !== "ASK_LANGUAGE" &&
            activeAction !== "ASK_UPLOAD_OR_SKIP" &&
            activeAction !== "ASK_GENDER" &&
            activeAction !== "ASK_DOB" &&
            activeAction !== "ASK_MEDICINE_START_DATE" &&
            activeAction !== "ASK_MEDICINE_SCHEDULE" &&
            activeAction !== "REVIEW_MEDICINES_LIST" &&
            activeAction !== "POST_ONBOARDING" && (
              <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isSending={loading}
                isDark={isDark}
                keyboardType={(activeAction === "ASK_DOSE_PER_INTAKE" || activeAction === "ASK_MEDICINE_QUANTITY") ? "numeric" : "default"}
              />
            )}
        </View>

        {/* Modal Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          maximumDate={datePickerMode === "date" ? new Date() : undefined}
          minimumDate={datePickerMode === "date" ? new Date("1900-01-01") : undefined}
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* Custom Upload Bottom Sheet */}
        <UploadBottomSheet
          ref={uploadSheetRef}
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
    padding: 12,
    backgroundColor: "rgba(100, 116, 139, 0.05)",
    borderRadius: 12,
    marginTop: 8,
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
});
