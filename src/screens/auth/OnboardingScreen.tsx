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
  TouchableOpacity,
  View,
  Image,
  TextInput,
  StatusBar,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";

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
import {
  documentUpload,
  runOcr,
  getOcrStatus,
  addDocument,
} from "../../services/documentService";

// Reusable Redesigned Components
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageBubble } from "../../components/chat/MessageBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import UploadBottomSheet from "../../components/upload/UploadBottomSheet";
import DocumentPreview from "../../components/upload/DocumentPreview";
import UploadValidationDialog from "../../components/upload/UploadValidationDialog";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import { listMedications } from "../../services/medicationservice";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: string;
  options?: any[];
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // Custom dose UI state
  const [capsuleCount, setCapsuleCount] = useState(1);
  const [liquidDose, setLiquidDose] = useState("");

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
    hasSocialData: false,
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
        hasSocialData: !!(
          (userData as any)?.googleId ||
          (userData as any)?.appleId ||
          (userData as any)?.socialId
        ),
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
    };

    setMessages((prev) => [...prev, newMsg]);

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
        medicinesToAdd: aiRes.medicinesToAdd || finalState.medicinesToAdd,
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

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
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

  const handleDateConfirm = (date: Date) => {
    setDatePickerVisible(false);
    if (datePickerMode === "time") {
      const timeString = format(date, "hh:mm a");
      sendMessage(timeString, state);
    } else {
      const dobString = format(date, "yyyy-MM-dd");
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
    Keyboard.dismiss();
    uploadSheetRef.current?.present();
  };

  const uploadSelectedFile = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return;

    setLoading(true);
    setUploadProgress("Uploading report to secure storage...");
    console.log("[ONBOARDING] Upload Started");
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: fileToUpload.uri,
        name: fileToUpload.name,
        type: fileToUpload.type,
      } as any);
      formData.append("uploadType", "PATIENT_DOCUMENT");

      const uploadRes = await documentUpload(formData);
      const fileKey = uploadRes?.data?.fileKey;

      if (!fileKey) {
        throw new Error("Upload response missing file key");
      }

      console.log("[ONBOARDING] Upload Success");
      console.log("[ONBOARDING] OCR Started");

      setUploadProgress("Checking whether the document is medical...");
      await runOcr({ fileKey, documentType: "medical_document" });

      const maxRetries = 100;
      const delayMs = 1500;
      let job = null;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const statusRes = await getOcrStatus(fileKey);
        const jobData = statusRes?.data || statusRes;

        if (
          jobData?.stage === "OCR_QUEUED" ||
          jobData?.stage === "OCR_STARTED" ||
          jobData?.stage === "VALIDATING"
        ) {
          setUploadProgress("Checking whether the document is medical...");
        } else if (jobData?.stage === "EXTRACTING") {
          setUploadProgress("Reading report contents...");
        } else if (jobData?.stage === "ANALYZING") {
          setUploadProgress("Finding tests and medical values...");
        } else if (jobData?.stage === "SUMMARIZING") {
          setUploadProgress("Preparing easy explanation...");
        }

        if (jobData?.status === "COMPLETED") {
          await addDocument({
            documentType: "medical_document",
            s3Key: fileKey,
            fileName: uploadRes.data?.originalFileName,
            fileType: uploadRes.data?.mimeType,
            s3bucket: uploadRes.data?.s3Bucket,
            rawOcrData: jobData.rawOcrData,
            extractedStructuredData: jobData.extractedStructuredData,
            graphs: jobData.graphs,
            embeddingsGenerated: true
          });
          setUploadProgress("You can now ask questions.");
          job = jobData;
          break;
        }

        if (jobData?.status === "FAILED") {
          throw new Error(jobData?.error || "OCR extraction failed");
        }
      }

      if (!job) {
        throw new Error("OCR job timed out");
      }

      const extractedText =
        job?.rawOcrData?.ocrExtractedText || job?.rawOcrData?.text || "";
      const structured = job?.extractedStructuredData || {};

      console.log("[ONBOARDING] Extracted Structured Data:", structured);

      const parsedAllergies = Array.isArray(structured.allergies)
        ? structured.allergies
        : [];

      // Split name if patientName is found but firstName/lastName are missing
      let firstName = structured.firstName || "";
      let lastName = structured.lastName || "";
      if (!firstName && !lastName && structured.patientName) {
        const parts = structured.patientName.trim().split(/\s+/);
        if (parts.length > 0) {
          firstName = parts[0];
          // Slice returns a new array starting from index 1 and join joins the other indexes after 1(if found) with Space in between.
          lastName = parts.slice(1).join(" "); 
        }
      }

      // Populate existingUserData in the state
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
      };

      const newState = {
        ...state,
        flowMode: "UPLOAD",
        uploadedMedicalDocument: true,
        documentUploaded: true,
        documentText: extractedText,
        documentExtracted: true,
        existingUserData: updatedUserData,
      };

      setState(newState);
      setUploadProgress(null);

      // Reset selected states
      setSelectedFile(null);
      setInput("");

      await sendMessage("Document Uploaded: " + fileToUpload.name, newState);
    } catch (error: any) {
      console.error("[Onboarding] Document processing failed:", error);
      setUploadProgress(null);

      const errCode = error?.response?.data?.error?.code;
      if (errCode === "INVALID_MEDICAL_DOCUMENT") {
        setValidationDialogVisible(true);
      } else {
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

  const handleEditMedicineField = (field: string, value: any) => {
    const newMedicines = [...state.medicinesToAdd];
    const currentIndex = state.currentMedicineIndex;
    if (!newMedicines[currentIndex]) newMedicines[currentIndex] = {};
    newMedicines[currentIndex] = {
      ...newMedicines[currentIndex],
      [field]: value,
    };
    setState({ ...state, medicinesToAdd: newMedicines });
  };

  const handleViewMedicines = async () => {
    setLoading(true);
    try {
      const res = await listMedications();
      console.log("[MEDICINES] ", res?.data);
      const meds = res?.data || [];
      if (meds.length >= 0) {
        const medList = meds
          .map((m: any) => `- **${m.medicationName}**`)
          .join("\n");
        const msg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `Here are your medicines:\n${medList}`,
        };
        setMessages((prev) => [...prev, msg]);
      } else {
        const msg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `You have no medicines added yet.`,
        };
        setMessages((prev) => [...prev, msg]);
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch medicines.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderOptions = (activeMsg: Message) => {
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

      const uploadLabel = uploadOpt.label || "Upload Medical Report";
      const manualLabel = manualOpt.label || "Skip and Enter Manually";

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
            const label = opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
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
                <Text style={styles.chipText}>{label}</Text>
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
      const btnLabel = activeMsg.options?.[0]?.label || "Choose Date";
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
            <Text style={styles.actionButtonText}>{btnLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_MEDICINE_SCHEDULE") {
      const btnLabel = activeMsg.options?.[0]?.label || "Choose Time";
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
            <Text style={styles.actionButtonText}>{btnLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_DOSE_PER_INTAKE") {
      const currentMedType =
        state.medicinesToAdd[
          state.currentMedicineIndex
        ]?.medicationType?.toUpperCase() || "";

      if (currentMedType === "TABLET") {
        const tabletOptions = [
          {
            label: "1/4",
            value: "0.25",
            image: require("../../../assets/one-fourth.png"),
          },
          {
            label: "1/3",
            value: "0.33",
            image: require("../../../assets/one-third.png"),
          },
          {
            label: "1/2",
            value: "0.5",
            image: require("../../../assets/half.png"),
          },
          {
            label: "1",
            value: "1",
            image: require("../../../assets/one-medicine.png"),
          },
          {
            label: "1 1/2",
            value: "1.5",
            image: require("../../../assets/one-and-a-half.png"),
          },
          {
            label: "2",
            value: "2",
            image: require("../../../assets/two-medicines.png"),
          },
        ];

        return (
          <View style={styles.tabletGrid}>
            {tabletOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.tabletOptionCard,
                  {
                    backgroundColor: theme.colors.primary + "15",
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => sendMessage(opt.value, state, opt.label)}
              >
                <Image
                  source={opt.image}
                  style={styles.tabletImage}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.tabletLabel,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

      if (currentMedType === "CAPSULE") {
        return (
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={[
                styles.counterBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setCapsuleCount((prev) => Math.max(1, prev - 1))}
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <Text
              style={[styles.counterValue, { color: theme.colors.textPrimary }]}
            >
              {capsuleCount}
            </Text>
            <TouchableOpacity
              style={[
                styles.counterBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setCapsuleCount((prev) => prev + 1)}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
            <View
              style={{
                width: 1,
                height: 24,
                backgroundColor: "rgba(100,116,139,0.2)",
                marginHorizontal: 8,
              }}
            />
            <TouchableOpacity
              style={[
                styles.counterSubmit,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() =>
                sendMessage(
                  capsuleCount.toString(),
                  state,
                  capsuleCount.toString(),
                )
              }
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      }

      // Fallback for Syrup, Injection, Drops, or anything else if they hit ASK_DOSE_PER_INTAKE
      let unit = "";
      if (currentMedType === "SYRUP" || currentMedType === "INJECTION")
        unit = "ML";
      if (currentMedType === "DROPS") unit = "DROPS";

      return (
        <View style={styles.liquidContainer}>
          <TextInput
            style={[styles.liquidInput, { color: theme.colors.textPrimary }]}
            value={liquidDose}
            onChangeText={setLiquidDose}
            keyboardType="numeric"
            placeholder="Amount"
            placeholderTextColor={theme.colors.textSecondary}
          />
          {unit ? (
            <Text
              style={[styles.liquidUnit, { color: theme.colors.textSecondary }]}
            >
              {unit}
            </Text>
          ) : null}
          <View
            style={{
              width: 1,
              height: 24,
              backgroundColor: "rgba(100,116,139,0.2)",
              marginHorizontal: 8,
            }}
          />
          <TouchableOpacity
            style={[
              styles.liquidSubmit,
              {
                backgroundColor: theme.colors.primary,
                opacity: liquidDose.trim() ? 1 : 0.5,
              },
            ]}
            disabled={!liquidDose.trim()}
            onPress={() => {
              const val = liquidDose.trim();
              const displayLabel = unit ? `${val} ${unit}` : val;
              sendMessage(val, state, displayLabel);
              setLiquidDose(""); // Reset for next time
            }}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "EDIT_MEDICINE") {
      const currentMed = state.medicinesToAdd[state.currentMedicineIndex] || {};
      const confirmOpt = activeMsg.options?.[0] || {
        label: "Confirm",
        value: "CONFIRM",
      };

      return (
        <View
          style={[
            styles.editMedicineCard,
            {
              backgroundColor: theme.colors.primary + "15",
              borderColor: theme.colors.primary + "30",
            },
          ]}
        >
          <Text
            style={[
              styles.editMedicineTitle,
              { color: theme.colors.textPrimary },
            ]}
          >
            Edit Details
          </Text>

          <View style={styles.editField}>
            <Text
              style={[
                styles.editFieldLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Name
            </Text>
            <TextInput
              style={[
                styles.editFieldInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: "rgba(100, 116, 139, 0.2)",
                },
              ]}
              value={currentMed.medicationName || ""}
              onChangeText={(t) => handleEditMedicineField("medicationName", t)}
              placeholder="Medication Name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.editRow}>
            <View style={[styles.editField, { flex: 1, marginRight: 8 }]}>
              <Text
                style={[
                  styles.editFieldLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Type
              </Text>
              <TextInput
                style={[
                  styles.editFieldInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: "rgba(100, 116, 139, 0.2)",
                  },
                ]}
                value={currentMed.medicationType || ""}
                onChangeText={(t) =>
                  handleEditMedicineField("medicationType", t)
                }
                placeholder="Tablet"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text
                style={[
                  styles.editFieldLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Dose
              </Text>
              <TextInput
                style={[
                  styles.editFieldInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: "rgba(100, 116, 139, 0.2)",
                  },
                ]}
                value={currentMed.dosePerIntake?.toString() || ""}
                onChangeText={(t) =>
                  handleEditMedicineField("dosePerIntake", t)
                }
                placeholder="1"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.editRow}>
            <View style={[styles.editField, { flex: 1, marginRight: 8 }]}>
              <Text
                style={[
                  styles.editFieldLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Frequency
              </Text>
              <TextInput
                style={[
                  styles.editFieldInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: "rgba(100, 116, 139, 0.2)",
                  },
                ]}
                value={currentMed.frequency || ""}
                onChangeText={(t) => handleEditMedicineField("frequency", t)}
                placeholder="ONCE_DAILY"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text
                style={[
                  styles.editFieldLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Food
              </Text>
              <TextInput
                style={[
                  styles.editFieldInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: "rgba(100, 116, 139, 0.2)",
                  },
                ]}
                value={currentMed.foodFrequency || ""}
                onChangeText={(t) =>
                  handleEditMedicineField("foodFrequency", t)
                }
                placeholder="AFTER_FOOD"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.editConfirmBtn,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() =>
              sendMessage(confirmOpt.value, state, confirmOpt.label)
            }
          >
            <Text style={styles.editConfirmBtnText}>{confirmOpt.label}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "CONFIRM_DOCUMENT_DETAILS") {
      const summaryTitleLabel = activeMsg.content || "Document Details Summary";
      const uData = state.existingUserData || {};
      const formatVal = (val: any) =>
        val && typeof val === "string" && val.trim().length > 0
          ? val
          : "Not Extracted";

      return (
        <View style={styles.summaryContainer}>
          <Text
            style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}
          >
            {summaryTitleLabel}
          </Text>
          <View
            style={[
              styles.medCard,
              { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
            ]}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              Personal Information
            </Text>
            {uData?.firstName && (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontWeight: "600" }}>First Name:</Text>{" "}
                {formatVal(uData.firstName)}
              </Text>
            )}

            {uData?.lastName && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Last Name:</Text>{" "}
              {formatVal(uData.lastName)}
            </Text>
            )}
            {uData?.dateOfBirth && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Date of Birth:</Text>{" "}
              {formatVal(uData.dateOfBirth)}
            </Text>
            )}
            {uData?.gender && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Gender:</Text>{" "}
              {formatVal(uData.gender)}
            </Text>
            )}
            {uData?.bloodGroup && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Blood Group:</Text>{" "}
              {formatVal(uData.bloodGroup)}
            </Text>
            )}
            {uData?.allergies && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Allergies:</Text>{" "}
              {Array.isArray(uData.allergies) && uData.allergies.length > 0
                ? uData.allergies.join(", ")
                : "Not Extracted"}
            </Text>
            )}
            {uData?.email && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Email:</Text>{" "}
              {formatVal(uData.email)}
            </Text>
            )}
          </View>
          <View style={styles.chipRow}>
            {(activeMsg.options || []).map((opt, index) => {
              let label =
                typeof opt === "string" ? opt : opt.label || opt.value;
              let value =
                typeof opt === "string" ? opt : opt.value || opt.label;
              if (typeof label === "object" && label !== null)
                label =
                  label.name ||
                  label.value ||
                  label.label ||
                  JSON.stringify(label);
              if (typeof value === "object" && value !== null)
                value =
                  value.value ||
                  value.name ||
                  value.label ||
                  JSON.stringify(value);
              const strLabel = String(label);
              const strValue = String(value);

              return (
                <TouchableOpacity
                  key={strValue || index.toString()}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => sendMessage(strValue, state, strLabel)}
                >
                  <Text style={styles.chipText}>{strLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (activeMsg.action === "CONFIRM_MEDICINE") {
      const summaryTitleLabel = activeMsg.content || "Medication Summary";
      return (
        <View style={styles.summaryContainer}>
          <Text
            style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}
          >
            {summaryTitleLabel}
          </Text>
          {(state.medicinesToAdd || []).map((med, index) => (
            <View
              key={index}
              style={[
                styles.medCard,
                { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                {med.medicationName || "Unknown"}
              </Text>

              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Type:</Text>{" "}
                {med.medicationType}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Dose:</Text>{" "}
                {med.dosePerIntake}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Frequency:</Text>{" "}
                {med.frequency?.replace(/_/g, " ")}
              </Text>

              {med.medicationSchedule &&
                Object.keys(med.medicationSchedule).length > 0 && (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontWeight: "600" }}>Time:</Text>{" "}
                    {Object.entries(med.medicationSchedule)
                      .map(([k, v]) => `${k} (${v})`)
                      .join(", ")}
                  </Text>
                )}

              {med.foodFrequency && (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>Food Info:</Text>{" "}
                  {med.foodFrequency.replace(/_/g, " ")}
                </Text>
              )}

              {med.startDate && (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>Start Date:</Text>{" "}
                  {med.startDate}
                </Text>
              )}

              {med.totalQuantity !== undefined && (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>Total Quantity:</Text>{" "}
                  {med.totalQuantity}
                </Text>
              )}

              {med.ongoing !== undefined && (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>Ongoing:</Text>{" "}
                  {med.ongoing ? "Yes" : "No"}
                </Text>
              )}
            </View>
          ))}
          <View style={styles.chipRow}>
            {(activeMsg.options || []).map((opt, index) => {
              let label =
                typeof opt === "string" ? opt : opt.label || opt.value;
              let value =
                typeof opt === "string" ? opt : opt.value || opt.label;
              if (typeof label === "object" && label !== null)
                label =
                  label.name ||
                  label.value ||
                  label.label ||
                  JSON.stringify(label);
              if (typeof value === "object" && value !== null)
                value =
                  value.value ||
                  value.name ||
                  value.label ||
                  JSON.stringify(value);
              const strLabel = String(label);
              const strValue = String(value);

              return (
                <TouchableOpacity
                  key={strValue || index.toString()}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => sendMessage(strValue, state, strLabel)}
                >
                  <Text style={styles.chipText}>{strLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (
      activeMsg.action === "COMPLETE" ||
      activeMsg.action === "POST_ONBOARDING"
    ) {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt, index) => {
            let label = typeof opt === "string" ? opt : opt.label || opt.value;
            let value = typeof opt === "string" ? opt : opt.value || opt.label;
            if (typeof label === "object" && label !== null)
              label =
                label.name ||
                label.value ||
                label.label ||
                JSON.stringify(label);
            if (typeof value === "object" && value !== null)
              value =
                value.value ||
                value.name ||
                value.label ||
                JSON.stringify(value);
            const strLabel = String(label);
            const strValue = String(value);

            return (
              <TouchableOpacity
                key={strValue || index.toString()}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  if (strValue === "GO_TO_DASHBOARD") {
                    queryClient.invalidateQueries({ queryKey: ["profile"] });
                  } else if (strValue === "VIEW_MEDICINES") {
                    handleViewMedicines();
                  } else if (strValue === "LOGOUT") {
                    setShowLogoutModal(true);
                  } else {
                    sendMessage(strValue, state, strLabel);
                  }
                }}
              >
                <Text style={styles.chipText}>{strLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.options && activeMsg.options.length > 0) {
      return (
        <View style={styles.chipRow}>
          {activeMsg.options.map((opt, index) => {
            let label = typeof opt === "string" ? opt : opt.label || opt.value;
            let value = typeof opt === "string" ? opt : opt.value || opt.label;
            if (typeof label === "object" && label !== null)
              label =
                label.name ||
                label.value ||
                label.label ||
                JSON.stringify(label);
            if (typeof value === "object" && value !== null)
              value =
                value.value ||
                value.name ||
                value.label ||
                JSON.stringify(value);
            const strLabel = String(label);
            const strValue = String(value);

            return (
              <TouchableOpacity
                key={strValue || index.toString()}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  if (strValue === "VIEW_MEDICINES") {
                    handleViewMedicines();
                  } else if (strValue === "LOGOUT") {
                    setShowLogoutModal(true);
                  } else {
                    sendMessage(strValue, state, strLabel);
                  }
                }}
              >
                <Text style={styles.chipText}>{strLabel}</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
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
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
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
            activeAction !== "ASK_BLOOD_GROUP" &&
            activeAction !== "ASK_ON_MEDICINES" &&
            activeAction !== "ASK_MEDICINE_START_DATE" &&
            activeAction !== "ASK_MEDICINE_SCHEDULE" &&
            activeAction !== "REVIEW_MEDICINES_LIST" &&
            activeAction !== "CONFIRM_MEDICINE" &&
            activeAction !== "CONFIRM_DOCUMENT_DETAILS" &&
            activeAction !== "COMPLETE" &&
            activeAction !== "ASK_DOSE_PER_INTAKE" &&
            activeAction !== "EDIT_MEDICINE" && (
              <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isSending={loading}
                isDark={isDark}
                keyboardType={
                  activeAction === "ASK_MEDICINE_QUANTITY"
                    ? "numeric"
                    : "default"
                }
              />
            )}
        </View>

        {/* Modal Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          maximumDate={datePickerMode === "date" ? new Date() : undefined}
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
});
