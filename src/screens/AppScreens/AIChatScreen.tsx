import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";
import { formatUTCDateTime, getRelativeDateLabel } from "../../utils/dateFormatter";
import { ChatDateHeader } from "../../components/chat/ChatDateHeader";

import { useDocumentUpload } from "../../context/DocumentUploadContext";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import { queryClient } from "../../config/queryClient";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import {
  ErrorScreen,
  LoadingScreen,
} from "../../components/shared/DefensiveStates";
import { listDocument } from "../../services/documentService";
import {
  useMedicationFormState,
  MedicationFormFields,
} from "../../components/shared/MedicationFormFields";
import { MedicationReviewService } from "../../services/medicationReviewService";
import {
  listMedications,
  updateMedication,
  checkMedicationDuplicate,
  addMedication,
} from "../../services/medicationservice";
import { ExtractedMedicine } from "../../types/medicationReview";
import { AddOrEditMedication } from "../../types";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  ExtractedMedicinesCard,
  ConflictCarouselCard,
  ConfirmMedicinesCard,
  SuccessCard,
  MedicineExtractionSummaryCard,
  MedicineDocumentAccordionCard,
} from "../../components/chat/widgets/ConversationalExtractionWidgets";
import MedicineExtractionBottomSheet from "../../components/chat/widgets/MedicineExtractionBottomSheet";
import { useOcrJobPolling } from "../../hooks/useOcrJobPolling";
import type { MedicalDocument } from "../../types";
import { safeFilter } from "../../utils/arrayUtils";
import apiClient from "../../services/apiClient";
import { ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

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
import {
  findHistoricalUserReply,
  HistoricalChips,
} from "../../components/chat/widgets/HistoricalChips";
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
  medicinesCount?: number;
  failedCount?: number;
  successCount?: number;
  docsCount?: number;
  summary?: any;
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string;
  loginProvider?: string;
  documents?: { id: string; fileName: string; medicinesCount?: number }[];
  conflicts?: any[];
  createdAt?: string | Date;
};

const I18N_CHAT_UI: Record<string, Record<string, string>> = {
  english: {
    selectModeOrReport: "Select Mode or Report",
    chooseGeneralOrDiscuss:
      "Choose general health mode or discuss a specific medical report",
    generalHealthChatNoDoc: "General Health Chat (No Document)",
    recentConversations: "Recent Conversations",
    onboardingSessionReadOnly: "Onboarding Session (Read-Only)",
    untitledSession: "Untitled Session",
    noReportsUploaded: "You haven't uploaded any medical reports yet.",
    uploadMedicalReport: "Upload Medical Report",
    seekImmediateAttention: "Seek immediate medical attention",
    emergencyWarning:
      "This may require urgent medical attention. Please contact emergency services or visit the nearest emergency department immediately.",
    onboardingArchive: "Onboarding Session (Read-Only Archive)",
    documentPrefix: "Document: ",
  },
  gujarati: {
    selectModeOrReport: "મોડ અથવા રિપોર્ટ પસંદ કરો",
    chooseGeneralOrDiscuss:
      "સામાન્ય સ્વાસ્થ્ય મોડ પસંદ કરો અથવા ચોક્કસ તબીબી અહેવાલ વિશે ચર્ચા કરો",
    generalHealthChatNoDoc: "સામાન્ય સ્વાસ્થ્ય ચર્ચા (કોઈ દસ્તાવેજ નથી)",
    recentConversations: "તાજેતરની વાતચીતો",
    onboardingSessionReadOnly: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટે)",
    untitledSession: "શીર્ષક વગરનું સત્ર",
    noReportsUploaded: "તમે હજી સુધી કોઈ તબીબી અહેવાલો અપલોડ કર્યા નથી.",
    uploadMedicalReport: "તબીબી અહેવાલ અપલોડ કરો",
    seekImmediateAttention: "તાત્કાલિક તબીબી સારવાર મેળવો",
    emergencyWarning:
      "આ માટે તાત્કાલિક તબીબી સારવારની જરૂર પડી શકે છે. કૃપા કરીને તાત્કાલિક કટોકટી સેવાઓનો સંપર્ક કરો અથવા નજીકના કટોકટી વિભાગની મુલાકાત લો.",
    onboardingArchive: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટેનું આર્કાઇવ)",
    documentPrefix: "દસ્તાવેજ: ",
  },
  hindi: {
    selectModeOrReport: "मोड या रिपोर्ट चुनें",
    chooseGeneralOrDiscuss:
      "सामान्य स्वास्थ्य मोड चुनें या किसी विशिष्ट मेडिकल रिपोर्ट पर चर्चा करें",
    generalHealthChatNoDoc: "सामान्य स्वास्थ्य चैट (कोई दस्तावेज़ नहीं)",
    recentConversations: "हाल की बातचीत",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए)",
    untitledSession: "बिना शीर्षक का सत्र",
    noReportsUploaded: "आपने अभी तक कोई मेडिकल रिपोर्ट अपलोड नहीं की है।",
    uploadMedicalReport: "मेडिकल रिपोर्ट अपलोड करें",
    seekImmediateAttention: "तुरंत चिकित्सा सहायता लें",
    emergencyWarning:
      "इसके लिए तत्काल चिकित्सा सहायता की आवश्यकता हो सकती है। कृपया तुरंत आपातकालीन सेवाओं से संपर्क करें या निकटतम आपातकालीन विभाग में जाएं।",
    onboardingArchive: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए पुरालेख)",
    documentPrefix: "दस्तावेज़: ",
  },
  marathi: {
    selectModeOrReport: "मोड किंवा अहवाल निवडा",
    chooseGeneralOrDiscuss:
      "सामान्य आरोग्य मोड निवडा किंवा विशिष्ट वैद्यकीय अहवालावर चर्चा करा",
    generalHealthChatNoDoc: "सामान्य आरोग्य चॅट (कोणताही दस्तऐवज नाही)",
    recentConversations: "अलीकडील संभाषणे",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठी)",
    untitledSession: "शीर्षक नसलेले सत्र",
    noReportsUploaded:
      "तुम्ही अद्याप कोणतेही वैद्यकीय अहवाल अपलोड केलेले नाहीत.",
    uploadMedicalReport: "वैद्यकीय अहवाल अपलोड करा",
    seekImmediateAttention: "त्वरित वैद्यकीय मदत घ्या",
    emergencyWarning:
      "यासाठी त्वरित वैद्यकीय लक्ष देण्याची आवश्यकता असू शकते. कृपया त्वरित आपत्कालीन सेवांशी संपर्क साधा किंवा जवळच्या आपत्कालीन विभागात जा.",
    onboardingArchive: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठीचे संग्रहण)",
    documentPrefix: "दस्तऐवज: ",
  },
  tamil: {
    selectModeOrReport: "முறை அல்லது அறிக்கையைத் தேர்ந்தெடுக்கவும்",
    chooseGeneralOrDiscuss:
      "பொது சுகாதார முறையைத் தேர்ந்தெடுக்கவும் அல்லது குறிப்பிட்ட மருத்துவ அறிக்கையைப் பற்றி விவாதிக்கவும்",
    generalHealthChatNoDoc: "பொது சுகாதார அரட்டை (ஆவணம் இல்லை)",
    recentConversations: "சமீபத்திய உரையாடல்கள்",
    onboardingSessionReadOnly: "உள்வாங்கல் அமர்வு (படிக்க மட்டும்)",
    untitledSession: "தலைப்பில்லா அமர்வு",
    noReportsUploaded:
      "நீங்கள் இன்னும் மருத்துவ அறிக்கைகள் எதையும் பதிவேற்றவில்லை.",
    uploadMedicalReport: "மருத்துவ அறிக்கையைப் பதிவேற்றவும்",
    seekImmediateAttention: "உடனடி மருத்துவ உதவியை நாடுங்கள்",
    emergencyWarning:
      "இதற்கு அவசர மருத்துவ உதவி தேவைப்படலாம். அவசர சேவைகளைத் தொடர்பு கொள்ளவும் அல்லது உடனடியாக அருகிலுள்ள அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும்.",
    onboardingArchive: "உள்வாங்கல் அமர்வு (படிக்க மட்டும் காப்பகம்)",
    documentPrefix: "ஆவணம்: ",
  },
};

const SUGGESTED_QUESTIONS_I18N: Record<
  string,
  { general: string[]; document: string[] }
> = {
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
      "इस मेडिकल रिपोर्ट का सारांश दें.",
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
interface EditMedicineFormWrapperProps {
  medicine: ExtractedMedicine;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onClose: () => void;
  onSave: (updated: ExtractedMedicine) => void;
}

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EditMedicineFormWrapper = ({
  medicine,
  preferredLang,
  isDark,
  theme,
  onClose,
  onSave,
}: EditMedicineFormWrapperProps) => {
  const initialData = useMemo(() => {
    return {
      id: medicine.id,
      medicationName: medicine.name,
      medicationType: medicine.medicineType || "TABLET",
      dose: {
        count: parseFloat(medicine.dosage || "1") || 1,
        value: parseFloat(medicine.dosage || "1") || 1,
        unit: medicine.dosageUnit || "tablet",
      },
      frequency: medicine.frequency || "ONCE",
      notes: medicine.notes || "",
      prescribed_by: medicine.prescribedBy || "",
      refill_alert: medicine.refillAlert || false,
      total_quantity: medicine.totalQuantity || 10,
      foodContext: medicine.foodFrequency || medicine.timing || "AFTER_FOOD",
      startDate: medicine.startDate && medicine.startDate !== "None" ? medicine.startDate : getTodayDateString(),
      medicationSchedule: medicine.medicationSchedule || ["08:00"],
    };
  }, [medicine]);

  const formState = useMedicationFormState(initialData, preferredLang);
  const {
    formName,
    formType,
    formFreq,
    formNotes,
    formPrescribed,
    formRefill,
    formQty,
    formFoodFreq,
    startDate,
    formCount,
    formVal,
    formUnit,
    selectedSlots,
  } = formState;

  const [localErrors, setLocalErrors] = useState<string[]>([]);

  useEffect(() => {
    if (localErrors.length > 0) {
      setLocalErrors([]);
    }
  }, [
    formName,
    formType,
    formFreq,
    formNotes,
    formPrescribed,
    formRefill,
    formQty,
    formFoodFreq,
    startDate,
    formCount,
    formVal,
    formUnit,
    selectedSlots,
  ]);

  const handleSave = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push("Name is required");
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.push(`Please select exactly ${N} reminder times`);
    }
    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push("Total Quantity is required");
    }

    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (sDate < today) {
        errors.push(
          preferredLang === "gujarati"
            ? "શરૂઆતની તારીખ ભૂતકાળમાં હોઈ શકતી નથી"
            : preferredLang === "hindi"
              ? "आरंभ तिथि भूतकाल में नहीं हो सकती"
              : preferredLang === "marathi"
                ? "सुरू होण्याची तारीख भूतकाळात असू शकत नाही"
                : preferredLang === "tamil"
                  ? "தொடக்க தேதி கடந்த காலத்தில் இருக்க முடியாது"
                  : "Start Date cannot be in the past"
        );
      }
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    onSave({
      ...medicine,
      name: formName.trim(),
      medicineType: formType,
      dosage:
        formType === "TABLET" || formType === "CAPSULE"
          ? String(formCount)
          : String(formVal),
      dosageUnit:
        formType === "TABLET" || formType === "CAPSULE"
          ? formType === "TABLET"
            ? "tablet"
            : "capsule"
          : formUnit,
      frequency: formFreq,
      foodFrequency: formFoodFreq,
      timing: formFoodFreq === "BEFORE_FOOD" ? "Before Food" : "After Food",
      prescribedBy: formPrescribed.trim(),
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
      refillAlert: formRefill,
      refillAlertEnabled: formRefill,
      medicationSchedule: selectedSlots,
      startDate: startDate
        ? startDate instanceof Date
          ? formatLocalDate(startDate)
          : startDate
        : getTodayDateString(),
    });
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: isDark ? "#f8fafc" : "#1e293b",
          }}
        >
          Edit Medicine
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons
            name="close"
            size={24}
            color={isDark ? "#cbd5e1" : "#475569"}
          />
        </TouchableOpacity>
      </View>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <MedicationFormFields
          formState={formState}
          isDark={isDark}
          theme={theme}
          preferredLang={preferredLang}
          isInBottomSheet={true}
        />
        {localErrors.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            {localErrors.map((err, idx) => (
              <Text key={idx} style={{ color: "#ef4444", fontSize: 12 }}>
                • {err}
              </Text>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: "#0f766e",
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 16,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
          Save Changes
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Floating Progress Panel Component
const FloatingProgressPanel = ({ onOpenSheet, isDark }: any) => {
  const { uploadingDocs, isUploading } = useDocumentUpload();

  const avgProgress = useMemo(() => {
    if (!uploadingDocs || uploadingDocs.length === 0) return 0;
    const sum = uploadingDocs.reduce(
      (acc, doc) => acc + (doc.progress || 0),
      0,
    );
    return Math.round(sum / uploadingDocs.length);
  }, [uploadingDocs]);

  const completedJobsCount = useMemo(() => {
    if (!uploadingDocs) return 0;
    return uploadingDocs.filter(
      (doc) =>
        doc.status === "COMPLETED" ||
        doc.status === "FAILED" ||
        doc.status === "CANCELLED" ||
        doc.status === "done" ||
        doc.status === "completed" ||
        doc.status === "success",
    ).length;
  }, [uploadingDocs]);

  const docCount = uploadingDocs?.length || 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 6,
        padding: 10,
        borderRadius: 14,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left side: Info */}
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
            color: isDark ? "#f1f5f9" : "#0f172a",
            fontWeight: "bold",
            fontSize: 13,
          }}
        >
          {isUploading
            ? "Uploading"
            : `Processing ${completedJobsCount} of ${docCount}`}
        </Text>
        <Text style={{ color: "#64748b", marginHorizontal: 6, fontSize: 13 }}>
          •
        </Text>
        <Text style={{ color: "#64748b", fontSize: 13 }} numberOfLines={1}>
          {isUploading ? "Uploading files" : "Analyzing"}
        </Text>
      </View>

      {/* Right side: Actions */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            color: "#0f766e",
            fontWeight: "bold",
            fontSize: 13,
            marginRight: 12,
          }}
        >
          {avgProgress}%
        </Text>

        <TouchableOpacity
          onPress={onOpenSheet}
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
              color: isDark ? "#f1f5f9" : "#0f172a",
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar at the very bottom edge */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: isDark ? "#334155" : "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${avgProgress}%`,
            backgroundColor: "#0f766e",
          }}
        />
      </View>
    </View>
  );
};

const AIChatScreen = ({ route }: any) => {
  const { isDark, theme } = useAppTheme();
  const { speakingMessageId, speakMessage } = useTextToSpeech();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [preferredLang, setPreferredLang] = useState("english");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboardingSessionId, setOnboardingSessionId] = useState<string | null>(
    null,
  );

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
  const hasInitializedHistory = useRef(false);
  const [activeDateLabel, setActiveDateLabel] = useState<string>("");

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      let topItem = viewableItems[0];
      for (const item of viewableItems) {
        if (item.index > topItem.index) {
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

  const {
    chatWizardState,
    setChatWizardState,
    resetChatWizard,
    startBackgroundOcr,
    isUploading,
  } = useDocumentUpload();

  const handleUploadSuccess = async (jobIds: string[], filesInfo: any[]) => {
    setChatWizardState({
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
    });

    startBackgroundOcr(jobIds, filesInfo, "AIChat");
  };

  const handleUploadStart = () => {
    uploadSheetRef.current?.dismiss();
    extractionSheetRef.current?.present();
  };

  const { isAllTerminal } = useOcrJobPolling(chatWizardState.jobIds);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [chatCurrentClientMedId, setChatCurrentClientMedId] = useState<string | null>(null);
  const [medicineToEdit, setMedicineToEdit] =
    useState<ExtractedMedicine | null>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [isConfirmingMeds, setIsConfirmingMeds] = useState(false);
  const [failedSubmissions, setFailedSubmissions] = useState<
    {
      type: "new" | "replace" | "merge";
      med: any;
      payload: any;
      existingId?: string;
    }[]
  >([]);

  const tOnboarding = (
    key: string,
    replacements?: Record<string, string | number>,
  ) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    let str = dict[key] || I18N_ONBOARDING_UI.english[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(String(v));
      });
    }
    return str;
  };

  useEffect(() => {
    if (
      chatWizardState.step === "processing" &&
      isAllTerminal &&
      chatWizardState.jobIds.length > 0 &&
      !isLoadingResults
    ) {
      const getResults = async () => {
        setIsLoadingResults(true);
        try {
          const data = await MedicationReviewService.fetchExtractedMedicines(
            chatWizardState.jobIds,
            chatWizardState.filesInfo,
          );
          const flatMeds: ExtractedMedicine[] = [];
          data.forEach((doc) => {
            const docMeds = doc.medicines || [];
            docMeds.forEach((m) => {
              flatMeds.push({
                ...m,
                documentName: doc.name || "Uploaded Report",
              });
            });
          });

          const summariesList = data.map((doc) => ({
            docName: doc.name || "Report",
            summary:
              doc.summaryPreferred ||
              doc.summaryEnglish ||
              "No summary generated.",
          }));

          setChatWizardState((prev) => ({
            ...prev,
            step: "results",
            extractedMedicines: flatMeds,
            summaries: summariesList,
          }));

          // Dismiss the progress bottom sheet if open
          extractionSheetRef.current?.dismiss();

          // 1. Show user message with file names in the chat only when all documents are processed successfully
          const docNames = chatWizardState.filesInfo
            .map((f) => f.fileName)
            .join(", ");
          const userMsg: ChatMessage = {
            id: `user-upload-${Date.now()}`,
            role: "user",
            text: `Document Uploaded: ${docNames}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMsg]);

          // 2. Call unified chatbot API /v1/onboarding/chat with new request body format
          const filesPayload = chatWizardState.filesInfo.map((f: any) => ({
            fileKey: f.fileKey || f.s3Key || "",
            fileName: f.fileName,
            mimeType: f.mimeType || "application/octet-stream",
          }));

          const payload = {
            actionType: "ADD_DOCUMENT",
            sessionId: activeSessionId || onboardingSessionId || undefined,
            actionData: {
              files: filesPayload,
            },
          };

          try {
            const response = await apiClient.post(
              "/v1/onboarding/chat",
              payload,
            );
            const resData = response.data?.data;
            if (resData?.reply) {
              const aiMsg: ChatMessage = {
                id: `ai-upload-response-${Date.now()}`,
                role: "ai",
                text: resData.reply,
                action: resData.actionType || resData.action || "NORMAL_CHAT",
                options: resData.options || [],
                medicines: resData.medicines || [],
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, aiMsg]);
            }

            if (resData?.sessionId && !activeSessionId) {
              setActiveSessionId(resData.sessionId);
              apiClient
                .get("/chat/session", { params: { limit: 50 } })
                .then((res) => {
                  setSessions(res.data?.data?.items || res.data?.items || []);
                })
                .catch(() => {});
            }
          } catch (err: any) {
            console.warn(
              "Failed to notify chatbot about document upload:",
              err,
            );
            Toast.show({
              type: "error",
              text1: "Chatbot Error",
              text2:
                err.message || "Failed to notify chatbot of document upload.",
            });
          }
        } catch (err) {
          console.error(
            "Failed to load extracted medicines in conversational chat:",
            err,
          );
          setChatWizardState((prev) => ({
            ...prev,
            step: "results",
            extractedMedicines: [],
            summaries: [],
          }));
        } finally {
          setIsLoadingResults(false);
        }
      };
      getResults();
    }
  }, [
    chatWizardState.step,
    isAllTerminal,
    chatWizardState.jobIds,
    activeSessionId,
    onboardingSessionId,
    preferredLang,
  ]);

  const handleEditSave = (updated: ExtractedMedicine) => {
    const updatedExtracted = chatWizardState.extractedMedicines.map((m) =>
      m.id === updated.id ? updated : m,
    );

    setChatWizardState((prev) => {
      const updatedConflicts = prev.conflicts.map((c) => {
        if (c.extractedMedicine.id === updated.id) {
          return {
            ...c,
            extractedMedicine: updated,
          };
        }
        return c;
      });

      return {
        ...prev,
        extractedMedicines: updatedExtracted,
        conflicts: updatedConflicts,
      };
    });

    setMessages((prev) =>
      prev
        .filter((msg) => msg.action !== "EDIT_MEDICINE")
        .map((msg) => {
          if (msg.medicines?.length) {
            return {
              ...msg,
              medicines: msg.medicines.map((m) =>
                m.id === updated.id ? updated : m,
              ),
            };
          }
          if (msg.action === "REVIEW_MEDICINES_LIST" || msg.action === "ADD_DOCUMENT") {
            return {
              ...msg,
              medicines: updatedExtracted,
            };
          }
          return msg;
        }),
    );

    editSheetRef.current?.dismiss();
    setMedicineToEdit(null);

    Toast.show({
      type: "success",
      text1: "Medicine Updated",
      text2: `${updated.name} has been updated in the list.`,
    });
  };

  const handleConfirmSelection = async () => {
    setIsLoadingResults(true);

    // Add user message "Continue"
    const userMsg: ChatMessage = {
      id: `user-continue-${Date.now()}`,
      role: "user",
      text: "Continue",
      createdAt: new Date().toISOString(),
    };

    // Add progress message in chat
    const checkingMsgId = `ai-checking-${Date.now()}`;
    const checkingMsg: ChatMessage = {
      id: checkingMsgId,
      role: "ai",
      text: `Checking your medicines for duplicates... 0 / ${chatWizardState.extractedMedicines.length} completed`,
      action: "CHECKING_DUPLICATES",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, checkingMsg]);

    try {
      const existingRes = await listMedications();
      const existingMeds = existingRes.data || existingRes || [];

      const conflictsList: any[] = [];
      const newMedsList: ExtractedMedicine[] = [];
      const total = chatWizardState.extractedMedicines.length;

      for (let i = 0; i < total; i++) {
        const med = chatWizardState.extractedMedicines[i];

        // Normalize medication type
        const typeStr = (med.medicineType || "TABLET").toUpperCase();
        const normalizedType = typeStr === "DROP" ? "DROPS" : typeStr;

        try {
          const duplicateRes = await checkMedicationDuplicate({
            medicationName: med.name,
            medicationType: normalizedType,
          });
          const dupData = duplicateRes?.data || duplicateRes || {};

          if (dupData.hasDuplicate) {
            const match =
              dupData.matchedMedication ||
              dupData.matchedMedications?.[0] ||
              existingMeds.find(
                (em: any) =>
                  em.medicationName.trim().toLowerCase() ===
                  med.name.trim().toLowerCase(),
              );
            conflictsList.push({
              extractedMedicine: med,
              existingMedication: match,
            });
          } else {
            newMedsList.push(med);
          }
        } catch (apiErr) {
          console.warn(
            `Duplicate check failed for ${med.name}, falling back to local check:`,
            apiErr,
          );
          const duplicateLocal = existingMeds.find(
            (existing: any) =>
              existing.medicationName.trim().toLowerCase() ===
              med.name.trim().toLowerCase(),
          );
          if (duplicateLocal) {
            conflictsList.push({
              extractedMedicine: med,
              existingMedication: duplicateLocal,
            });
          } else {
            newMedsList.push(med);
          }
        }

        // Update progress in chat
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === checkingMsgId
              ? {
                  ...msg,
                  text: `Checking your medicines for duplicates... ${i + 1} / ${total} completed`,
                }
              : msg,
          ),
        );
      }

      if (conflictsList.length > 0) {
        setChatWizardState((prev) => ({
          ...prev,
          step: "conflicts",
          conflicts: conflictsList,
          currentConflictIndex: 0,
          resolvedMedicines: newMedsList,
          replaceList: [],
          mergeList: [],
        }));

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === checkingMsgId
              ? {
                  ...msg,
                  text: `I detected duplicate conflicts with your existing medications. Let's resolve them.`,
                }
              : msg,
          ),
        );

        const conflictMsg: ChatMessage = {
          id: `ai-conflict-${Date.now()}`,
          role: "ai",
          text: tOnboarding("aiConflictIntro"),
          action: "EXTRACTED_MEDICINES_CONFLICTS",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, conflictMsg]);
      } else {
        setChatWizardState((prev) => ({
          ...prev,
          step: "summary",
          resolvedMedicines: newMedsList,
        }));

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === checkingMsgId
              ? {
                  ...msg,
                  text: `No duplicates found. All medicines are ready to be added.`,
                }
              : msg,
          ),
        );

        const confirmMsg: ChatMessage = {
          id: `ai-confirm-${Date.now()}`,
          role: "ai",
          text: tOnboarding("aiConfirmIntro"),
          action: "EXTRACTED_MEDICINES_CONFIRM",
          medicinesCount: newMedsList.length,
          docsCount: chatWizardState.filesInfo.length,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMsg]);
      }
    } catch (err: any) {
      console.error("Conflict checking failed:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === checkingMsgId
            ? {
                ...msg,
                text: `We couldn't check your medicines for duplicates. Please try again.`,
              }
            : msg,
        ),
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to perform duplicate check. Please try again.",
      });
    } finally {
      setIsLoadingResults(false);
    }
  };

  const resolveCurrentConflict = (
    resolution: "keep" | "replace" | "merge" | "remove_new",
    mergedPayload?: AddOrEditMedication,
  ) => {
    const currentConflict =
      chatWizardState.conflicts[chatWizardState.currentConflictIndex];
    if (!currentConflict) return;

    if (resolution === "keep") {
      Toast.show({
        type: "info",
        text1: `${currentConflict.extractedMedicine.name} already exists in your profile.`,
        text2: "Incoming duplicate removed.",
      });
    }

    // Update message history to deselect/remove the medication if Keep Existing or Remove New is chosen
    setMessages((prevMsg) =>
      prevMsg.map((msg) => {
        if (
          (msg.action === "EXTRACTED_MEDICINES" ||
            msg.action === "REVIEW_MEDICINES_LIST" ||
            msg.action === "MEDICINE_REVIEW_ACCORDION") &&
          msg.medicines
        ) {
          if (resolution === "keep" || resolution === "remove_new") {
            return {
              ...msg,
              medicines: msg.medicines.map((m) =>
                m.id === currentConflict.extractedMedicine.id
                  ? { ...m, selected: false, resolution: "REMOVE_NEW" }
                  : m
              ),
            };
          }
          return {
            ...msg,
            medicines: msg.medicines.map((m) =>
              m.id === currentConflict.extractedMedicine.id
                ? { ...m, selected: true, resolution: "REPLACE" }
                : m,
            ),
          };
        }
        return msg;
      }),
    );

    setChatWizardState((prev) => {
      const updatedConflicts = prev.conflicts.map((c, idx) =>
        idx === prev.currentConflictIndex
          ? { ...c, resolvedAction: resolution }
          : c,
      );

      const nextReplaceList: {
        existingId: string;
        extractedMedicine: ExtractedMedicine;
      }[] = [];
      const nextMergeList: {
        existingId: string;
        mergedMedication: AddOrEditMedication;
      }[] = [];
      const nextResolvedMedicines = prev.resolvedMedicines.filter(
        (m) => m.id !== currentConflict.extractedMedicine.id
      );

      updatedConflicts.forEach((c) => {
        if (c.resolvedAction === "replace") {
          nextReplaceList.push({
            existingId: c.existingMedication.id!,
            extractedMedicine: {
              ...c.extractedMedicine,
              resolution: "REPLACE",
              replaceMedicationId: c.existingMedication.id,
            },
          });
        } else if (c.resolvedAction === "merge") {
          // Use the merged payload if provided for the current conflict, or fall back to existing medication
          const payload =
            c.extractedMedicine.id === currentConflict.extractedMedicine.id &&
            mergedPayload
              ? mergedPayload
              : buildMedicationPayload(c.extractedMedicine);
          nextMergeList.push({
            existingId: c.existingMedication.id!,
            mergedMedication: payload,
          });
        }
      });

      const nextIndex = prev.currentConflictIndex + 1;
      const allResolved = updatedConflicts.every(
        (c) => c.resolvedAction !== undefined,
      );
      const nextStep = allResolved ? "summary" : "conflicts";

      const nextExtractedMedicines = prev.extractedMedicines
        .map((m) => {
          if (m.id === currentConflict.extractedMedicine.id) {
            if (resolution === "keep" || resolution === "remove_new") {
              return {
                ...m,
                selected: false,
                resolution: "REMOVE_NEW",
              };
            }
            return {
              ...m,
              selected: true,
              resolution: "REPLACE",
              replaceMedicationId: currentConflict.existingMedication.id,
            };
          }
          return m;
        });

      if (nextStep === "summary") {
        setTimeout(() => {
          const confirmMsg: ChatMessage = {
            id: `ai-confirm-${Date.now()}`,
            role: "ai",
            text: tOnboarding("aiConfirmIntro"),
            action: "EXTRACTED_MEDICINES_CONFIRM",
            medicinesCount:
              nextResolvedMedicines.length +
              nextReplaceList.length +
              nextMergeList.length,
            docsCount: chatWizardState.filesInfo.length,
            createdAt: new Date().toISOString(),
          };
          setMessages((prevMsg) => [...prevMsg, confirmMsg]);
        }, 100);
      }

      return {
        ...prev,
        conflicts: updatedConflicts,
        currentConflictIndex:
          nextIndex === prev.conflicts.length
            ? prev.currentConflictIndex
            : nextIndex,
        step: nextStep,
        replaceList: nextReplaceList,
        mergeList: nextMergeList,
        resolvedMedicines: nextResolvedMedicines,
        extractedMedicines: nextExtractedMedicines,
      };
    });
  };

  const navigateConflict = (direction: "prev" | "next") => {
    setChatWizardState((prev) => {
      let nextIdx = prev.currentConflictIndex;
      if (direction === "prev" && nextIdx > 0) nextIdx--;
      if (direction === "next" && nextIdx < prev.conflicts.length - 1)
        nextIdx++;
      return {
        ...prev,
        currentConflictIndex: nextIdx,
      };
    });
  };

  const handleContinueAnyway = () => {
    setChatWizardState((prev) => {
      const remainingNew = prev.conflicts
        .slice(prev.currentConflictIndex)
        .map((c) => c.extractedMedicine);
      const nextResolved = [...prev.resolvedMedicines, ...remainingNew];

      setTimeout(() => {
        const confirmMsg: ChatMessage = {
          id: `ai-confirm-${Date.now()}`,
          role: "ai",
          text: tOnboarding("aiConfirmIntro"),
          action: "EXTRACTED_MEDICINES_CONFIRM",
          medicinesCount: nextResolved.length,
          docsCount: prev.filesInfo.length,
          createdAt: new Date().toISOString(),
        };
        setMessages((prevMsg) => [...prevMsg, confirmMsg]);
      }, 100);

      return {
        ...prev,
        step: "summary",
        resolvedMedicines: nextResolved,
      };
    });
  };

  const handleReviewMedicines = () => {
    // Append user message: "Review Medicines"
    const userMsg: ChatMessage = {
      id: `user-review-${Date.now()}`,
      role: "user",
      text: "Review Medicines",
      createdAt: new Date().toISOString(),
    };

    // Append AI message for review:
    const aiReviewMsg: ChatMessage = {
      id: `ai-review-accordion-${Date.now()}`,
      role: "ai",
      text: "I've analyzed the medicines extracted from your documents. Please review them before I add them to your Health Vault.",
      action: "MEDICINE_REVIEW_ACCORDION",
      medicines: chatWizardState.extractedMedicines,
      documents: chatWizardState.filesInfo.map((f) => {
        const m = chatWizardState.extractedMedicines.filter(
          (x) => x.documentId === f.jobId,
        );
        return { id: f.jobId, fileName: f.fileName, medicinesCount: m.length };
      }),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, aiReviewMsg]);
    setChatWizardState((prev) => ({ ...prev, step: "results" }));

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const buildMedicationPayload = (
    med: ExtractedMedicine,
  ): AddOrEditMedication => {
    const scheduleObj: Record<string, any> = {};
    const times = med.medicationSchedule || [];
    times.forEach((timeStr) => {
      let key = "CUSTOM";
      if (timeStr === "08:00") key = "MORNING";
      else if (timeStr === "14:00") key = "NOON";
      else if (timeStr === "20:00") key = "NIGHT";

      const timeWithSec = `${timeStr}:00`;
      if (scheduleObj[key]) {
        if (Array.isArray(scheduleObj[key])) {
          scheduleObj[key].push(timeWithSec);
        } else {
          scheduleObj[key] = [scheduleObj[key], timeWithSec];
        }
      } else {
        scheduleObj[key] = key === "CUSTOM" ? [timeWithSec] : timeWithSec;
      }
    });

    let freqLabel = "Once Daily";
    if (med.frequency === "TWICE" || med.frequency === "Twice Daily")
      freqLabel = "Twice Daily";
    else if (med.frequency === "THRICE" || med.frequency === "3x Daily")
      freqLabel = "3x Daily";

    let normalizedFoodFreq = "AFTER_FOOD";
    const rawFood = (
      med.foodFrequency ||
      med.timing ||
      "AFTER_FOOD"
    ).toUpperCase();
    if (rawFood.includes("BEFORE") || rawFood.includes("PRE")) {
      normalizedFoodFreq = "BEFORE_FOOD";
    }

    return {
      medicationName: med.name.trim(),
      medicationType: (med.medicineType || "TABLET").toUpperCase(),
      prescribedBy: med.prescribedBy || "",
      dosePerIntake: parseFloat(med.dosage || "1") || 1,
      frequency: freqLabel,
      foodFrequency: normalizedFoodFreq,
      startDate: med.startDate && med.startDate !== "None"
        ? med.startDate
        : getTodayDateString(),
      ongoing: true,
      medicationSchedule: scheduleObj,
      totalQuantity: med.totalQuantity || 10,
      notes: med.notes || "",
      resolution: med.resolution,
      replaceMedicationId: med.replaceMedicationId,
    };
  };

  const handleConfirmAndAddMeds = async (retryOnly = false) => {
    setIsConfirmingMeds(true);

    if (!retryOnly) {
      setFailedSubmissions([]);
    }

    const itemsToSubmit: typeof failedSubmissions = [];

    if (retryOnly) {
      itemsToSubmit.push(...failedSubmissions);
    } else {
      chatWizardState.resolvedMedicines.forEach((med) => {
        itemsToSubmit.push({
          type: "new",
          med,
          payload: buildMedicationPayload(med),
        });
      });

      chatWizardState.replaceList.forEach((replaceItem) => {
        itemsToSubmit.push({
          type: "replace",
          med: replaceItem.extractedMedicine,
          payload: {
            ...buildMedicationPayload(replaceItem.extractedMedicine),
            resolution: "REPLACE",
            replaceMedicationId: replaceItem.existingId,
          },
          existingId: replaceItem.existingId,
        });
      });

      chatWizardState.mergeList.forEach((mergeItem) => {
        itemsToSubmit.push({
          type: "merge",
          med: mergeItem.mergedMedication,
          payload: mergeItem.mergedMedication,
          existingId: mergeItem.existingId,
        });
      });
    }

    const failed: typeof failedSubmissions = [];
    let successCount = 0;

    const addingProgressMap: Record<
      string,
      (done: number, total: number) => string
    > = {
      english: (done, total) =>
        `Adding medicines to your profile... ${done} / ${total} completed`,
      gujarati: (done, total) =>
        `તમારા પ્રોફાઇલમાં દવાઓ ઉમેરી રહ્યા છે... ${done} / ${total} પૂર્ણ થયું`,
      hindi: (done, total) =>
        `आपकी प्रोफाइल में दवाएं जोड़ी जा रही हैं... ${done} / ${total} पूर्ण`,
      marathi: (done, total) =>
        `तुमच्या प्रोफाइलमध्ये औषधे जोडत आहे... ${done} / ${total} પૂર્ણ झाले`,
      tamil: (done, total) =>
        `உங்கள் சுயவிவரத்தில் மருந்துகள் சேர்க்கப்படுகின்றன... ${done} / ${total} முடிந்தது`,
    };
    const getAddingProgressMsg = (done: number, total: number) => {
      const fn = addingProgressMap[preferredLang] || addingProgressMap.english;
      return fn(done, total);
    };

    const progressMsgId = `ai-adding-progress-${Date.now()}`;
    const progressMsg: ChatMessage = {
      id: progressMsgId,
      role: "ai",
      text: getAddingProgressMsg(0, itemsToSubmit.length),
      action: "ADDING_MEDICINES_PROGRESS",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, progressMsg]);

    for (let i = 0; i < itemsToSubmit.length; i++) {
      const task = itemsToSubmit[i];
      try {
        if (task.type === "new") {
          await addMedication(task.payload);
        } else if (task.type === "replace" && task.existingId) {
          await updateMedication({
            medicationId: task.existingId,
            data: task.payload,
          });
        } else if (task.type === "merge" && task.existingId) {
          await updateMedication({
            medicationId: task.existingId,
            data: task.payload,
          });
        }
        successCount++;
      } catch (err) {
        console.error(
          `Failed to submit item: ${task.med.name || task.med.medicationName || "Medication"}`,
          err,
        );
        failed.push(task);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === progressMsgId
            ? {
                ...msg,
                text: getAddingProgressMsg(i + 1, itemsToSubmit.length),
              }
            : msg,
        ),
      );
    }

    queryClient.invalidateQueries({ queryKey: ["medications"] });
    queryClient.invalidateQueries({ queryKey: ["allMedications"] });
    queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    queryClient.invalidateQueries({ queryKey: ["allReminders"] });
    queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });

    if (failed.length > 0) {
      setFailedSubmissions(failed);

      const partialFailureMap: Record<
        string,
        (success: number, fail: number) => string
      > = {
        english: (success, fail) =>
          `Operation partially failed. Successfully added ${success} medicines, but ${fail} failed. Please retry.`,
        gujarati: (success, fail) =>
          `પ્રક્રિયા અંશતઃ નિષ્ફળ રહી. ${success} દવાઓ સફળતાપૂર્વક ઉમેરાઈ, પરંતુ ${fail} નિષ્ફળ ગઈ. કૃપા કરીને ફરી પ્રયાસ કરો.`,
        hindi: (success, fail) =>
          `ऑपरेशन आंशिक रूप से विफल रहा। ${success} दवाएं सफलतापूर्वक जोड़ी गईं, लेकिन ${fail} विफल रहीं। कृपया पुनः प्रयास करें।`,
        marathi: (success, fail) =>
          `क्रिया अंशतः अपयशी ठरली. ${success} औषधे यशस्वीरित्या जोडली गेली, परंतु ${fail} अपयशी ठरली. कृपया पुन्हा प्रयत्न करा.`,
        tamil: (success, fail) =>
          `செயல்பாடு ஓரளவு தோல்வியடைந்தது. ${success} மருந்துகள் வெற்றிகரமாக சேர்க்கப்பட்டன, ஆனால் ${fail} தோல்வியடைந்தன. மீண்டும் முயற்சிக்கவும்.`,
      };
      const getPartialFailureMsg = (success: number, fail: number) => {
        const fn =
          partialFailureMap[preferredLang] || partialFailureMap.english;
        return fn(success, fail);
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === progressMsgId
            ? {
                ...msg,
                text: getPartialFailureMsg(successCount, failed.length),
              }
            : msg,
        ),
      );

      const errorSummaryMap: Record<string, string> = {
        english: "Some medicines could not be added to your profile.",
        gujarati: "કેટલીક દવાઓ તમારા પ્રોફાઇલમાં ઉમેરી શકાઈ નથી.",
        hindi: "कुछ दवाएं आपकी प्रोफाइल में नहीं जोड़ी जा सकीं।",
        marathi: "काही औषधे तुमच्या प्रोफाइलमध्ये जोडली जाऊ शकली नाहीत.",
        tamil: "சில மருந்துகளை உங்கள் சுயவிவரத்தில் சேர்க்க முடியவில்லை.",
      };
      const errorSummaryMsg =
        errorSummaryMap[preferredLang] || errorSummaryMap.english;

      const errorMsg: ChatMessage = {
        id: `ai-failure-summary-${Date.now()}`,
        role: "ai",
        text: errorSummaryMsg,
        action: "EXTRACTED_MEDICINES_PARTIAL_FAILURE",
        failedCount: failed.length,
        successCount: successCount,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } else {
      setChatWizardState((prev) => ({
        ...prev,
        step: "completed",
      }));

      const successProgressMap: Record<string, string> = {
        english: "All medicines have been successfully added to your profile!",
        gujarati: "બધી દવાઓ તમારા પ્રોફાઇલમાં સફળતાપૂર્વક ઉમેરવામાં આવી છે!",
        hindi: "सभी दवाएं आपकी प्रोफाइल में सफलतापूर्वक जोड़ दी गई हैं!",
        marathi:
          "सर्व औषधे तुमच्या प्रोफाइलमध्ये यशस्वीरित्या जोडली गेली आहेत!",
        tamil:
          "அனைத்து மருந்துகளும் உங்கள் சுயவிவரத்தில் வெற்றிகரமாக சேர்க்கப்பட்டன!",
      };
      const successProgressMsg =
        successProgressMap[preferredLang] || successProgressMap.english;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === progressMsgId ? { ...msg, text: successProgressMsg } : msg,
        ),
      );

      const totalAdded = retryOnly ? successCount : itemsToSubmit.length;
      const successIntro = tOnboarding("aiSuccessIntro");

      const successMsg: ChatMessage = {
        id: `ai-success-${Date.now()}`,
        role: "ai",
        text: successIntro,
        action: "EXTRACTED_MEDICINES_SUCCESS",
        medicinesCount: totalAdded,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMsg]);

      // Append follow-up question message 300ms later to show it AFTER the success card (View My Medicines button)
      setTimeout(() => {
        const helpNextMap: Record<string, string> = {
          english: "What would you like me to help you with next?",
          gujarati: "હવે હું તમારી બીજી કઈ મદદ કરી શકું?",
          hindi: "अब मैं आपकी आगे क्या मदद कर सकता हूँ?",
          marathi: "आता मी तुम्हाला पुढे काय मदत करू?",
          tamil: "அடுத்து நான் உங்களுக்கு எவ்வாறு உதவ வேண்டும்?",
        };
        const helpNextMsg = helpNextMap[preferredLang] || helpNextMap.english;
        const followUpMsg: ChatMessage = {
          id: `ai-followup-${Date.now()}`,
          role: "ai",
          text: helpNextMsg,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, followUpMsg]);
      }, 300);

      resetChatWizard();
      setFailedSubmissions([]);
    }

    setIsConfirmingMeds(false);
  };

  useEffect(() => {
    if (route?.params?.document) {
      setSelectedDocument(route.params.document);
    }
    if (route?.params?.initialQuestion) {
      setInput(route.params.initialQuestion);
    }
  }, [route?.params]);

  useEffect(() => {
    if (!isFocused) return;

    const onBackPress = () => {
      navigation.navigate("Home");
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [navigation, isFocused]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) =>
        setKeyboardPadding(Platform.OS === "ios" ? e.endCoordinates.height : 0),
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

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [onboardingMessages, setOnboardingMessages] = useState<any[]>([]);

  // Fetch onboarding history once on mount
  useEffect(() => {
    const fetchOnboardingHistory = async () => {
      try {
        console.log("[AI_CHAT] Fetching onboarding history...");
        const response = await apiClient.get("/v1/onboarding/history");
        const {
          chatSessionId,
          messages: historyItems,
          resumableState,
        } = response.data?.data || {};
        console.log("[CHAT SESSION ID] :- ", chatSessionId);
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
            createdAt: dbMsg.createdAt,
            action: (dbMsg.metadata || {}).action || (dbMsg.metadata || {}).actionType || "NORMAL_CHAT",
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

  const uploadSheetRef = useRef<BottomSheetModal>(null);
  const extractionSheetRef = useRef<BottomSheetModal>(null);
  const flatListRef = useRef<FlatList>(null);
  const bottomPadding = useBottomBarPadding(40, 20);

  const handleOpenProgressSheet = () => {
    extractionSheetRef.current?.present();
    if (isAllTerminal) {
      setChatWizardState((prev) => ({
        ...prev,
        hasViewedCompletedOcr: true,
      }));
    }
  };

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
    if (hasInitializedHistory.current) return;
    if (isLoadingDocs) return;

    const initChatHistory = async () => {
      hasInitializedHistory.current = true;
      setIsLoadingHistory(true);
      try {
        console.log("[AI_CHAT] Initializing sessions list...");
        const sessionsRes = await apiClient.get("/chat/session", {
          params: { limit: 50 },
        });
        const fetchedSessions =
          sessionsRes.data?.data?.items || sessionsRes.data?.items || [];
        setSessions(fetchedSessions);

        if (fetchedSessions.length > 0) {
          const mostRecent = fetchedSessions[0];
          console.log(
            "[AI_CHAT] Selecting most recent session on mount:",
            mostRecent.id,
          );
          setActiveSessionId(mostRecent.id);

          // Find corresponding document if any
          if (mostRecent.documentId) {
            const matchedDoc = documentsList.find(
              (d) => d.id === mostRecent.documentId,
            );
            setSelectedDocument(matchedDoc || null);
          } else {
            setSelectedDocument(null);
          }

          const messagesRes = await apiClient.get(
            `/chat/session/${mostRecent.id}/messages`,
            {
              params: { limit: 20 },
            },
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
              try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            } else {
              meta = meta || {};
            }
            return {
              ...meta,
              id: dbMsg.id,
              role: dbMsg.role === "assistant" ? "ai" : "user",
              text: dbMsg.content,
              mode: meta.mode as ChatMode,
              emergency: !!meta.emergency,
              createdAt: dbMsg.createdAt,
              action: meta.action || meta.actionType || "NORMAL_CHAT",
              medicines: meta.medicines || [],
              conflicts: meta.conflicts || [],
              documents: meta.documents || [],
              options: meta.options || [],
            };
          });

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
  }, [documentsList, isLoadingDocs]);

  // Infinite scroll pagination to load older messages
  const loadMoreMessages = async () => {
    if (isLoadingMore || !nextCursor || !activeSessionId) return;
    setIsLoadingMore(true);
    try {
      const response = await apiClient.get(
        `/chat/session/${activeSessionId}/messages`,
        {
          params: { limit: 20, cursor: nextCursor },
        },
      );
      const msgItems = response.data?.data?.items || response.data?.items || [];
      const newCursor =
        response.data?.data?.nextCursor || response.data?.nextCursor || null;

      const mapped: ChatMessage[] = msgItems.map((dbMsg: any) => {
        let meta = dbMsg.metadata;
        if (typeof meta === "string") {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        } else {
          meta = meta || {};
        }
        return {
          ...meta,
          id: dbMsg.id,
          role: dbMsg.role === "assistant" ? "ai" : "user",
          text: dbMsg.content,
          mode: meta.mode as ChatMode,
          emergency: !!meta.emergency,
          createdAt: dbMsg.createdAt,
          action: meta.action || meta.actionType || "NORMAL_CHAT",
          medicines: meta.medicines || [],
          conflicts: meta.conflicts || [],
          documents: meta.documents || [],
          options: meta.options || [],
        };
      });

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
        message: textToSubmit,
        sessionId: activeSessionId || onboardingSessionId || undefined,
        preferredLanguage: preferredLang,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
        documentId: selectedDocument?.s3Key
          ? [selectedDocument.s3Key]
          : undefined,
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload);
      const resData = response.data?.data;

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: resData?.reply || "No reply from AI",
        mode: resData?.mode as ChatMode,
        action: resData?.actionType || resData?.action || "NORMAL_CHAT",
        options: resData?.options || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (resData?.sessionId && !activeSessionId) {
        setActiveSessionId(resData.sessionId);
        apiClient
          .get("/chat/session", { params: { limit: 50 } })
          .then((res) => {
            setSessions(res.data?.data?.items || res.data?.items || []);
          })
          .catch(() => {});
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

  const handleGenericOptionPress = async (option: any) => {
    // 1. Show user reply in chat
    const userMsg: ChatMessage = {
      id: `user-opt-${Date.now()}`,
      role: "user",
      text: option.label,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Perform actions based on value/actionType
    if (
      option.actionType === "ADD_DOCUMENT" ||
      option.value === "ADD_DOCUMENT"
    ) {
      uploadSheetRef.current?.present();
      return;
    }

    if (
      option.actionType === "ADD_MEDICINE" ||
      option.value === "ADD_MEDICINE"
    ) {
      navigation.navigate("MEDICATION");
      return;
    }

    // 3. Otherwise, send the selected value to /v1/onboarding/chat
    setIsSending(true);
    try {
      const payload: any = {
        sessionId: activeSessionId || onboardingSessionId || undefined,
        preferredLanguage: preferredLang,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
      };

      if (option.actionType === "CONFIRM_MEDICINES") {
        payload.actionType = "CONFIRM_MEDICINES";
        payload.actionData = option.value;
      } else {
        payload.message =
          typeof option.value === "object"
            ? JSON.stringify(option.value)
            : option.value;
      }

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
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      console.warn("Failed to submit option click:", err);
    } finally {
      setIsSending(false);
    }
  };

  const hasEmergency = useMemo(() => {
    return messages.some((msg) => msg.emergency === true);
  }, [messages]);

  const suggestedQuestions = useMemo(() => {
    const langKey = preferredLang || "english";
    const questionSource =
      SUGGESTED_QUESTIONS_I18N[langKey] || SUGGESTED_QUESTIONS_I18N.english;
    return activeMode === ChatMode.DOCUMENT_RAG
      ? questionSource.document
      : questionSource.general;
  }, [activeMode, preferredLang]);

  // Merge live messages and onboarding history (rendered newest-first for inverted FlatList)
  const mergedMessages = useMemo(() => {
    const liveNewestFirst = [...messages].reverse();
    const onboardingNewestFirst = [...onboardingMessages].reverse();
    return [...liveNewestFirst, ...onboardingNewestFirst];
  }, [messages, onboardingMessages]);

  const displayMessages = useMemo(() => {
    const displayArr: any[] = [];

    for (let i = 0; i < mergedMessages.length; i++) {
       const item = mergedMessages[i];
       displayArr.push(item);

       const nextItem = mergedMessages[i + 1];
       let showDateHeader = false;
       if (!nextItem) {
         showDateHeader = true;
       } else if (item.createdAt && nextItem.createdAt) {
         const currentDate = formatUTCDateTime(item.createdAt, "dd-MMM-yyyy", true);
         const prevDate = formatUTCDateTime(nextItem.createdAt, "dd-MMM-yyyy", true);
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
    }

    return displayArr;
  }, [mergedMessages]);

  const isLatestActiveMessage = (msgId: string) => {
    return mergedMessages[0]?.id === msgId;
  };

  if (isLoadingDocs || isLoadingHistory) {
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
      <StatusBar barStyle={"dark-content"} />
      {/* Sticky Premium AI Header */}
      <ChatHeader
        onBack={() => navigation.navigate("Home")}
        isDark={isDark}
        theme={theme}
      />

      {/* Floating Background Progress Panel */}
      {(isUploading ||
        (chatWizardState.step !== "idle" &&
          !chatWizardState.hasViewedCompletedOcr)) && (
        <FloatingProgressPanel
          onOpenSheet={handleOpenProgressSheet}
          isDark={isDark}
        />
      )}

      <View
        style={[styles.keyboardContainer, { paddingBottom: keyboardPadding }]}
      >
        {/* Emergency Card Display */}
        {hasEmergency && (
          <EmergencyCard>
            <EmergencyTitleRow>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <EmergencyTitle>{t("seekImmediateAttention")}</EmergencyTitle>
            </EmergencyTitleRow>
            <EmergencyText>{t("emergencyWarning")}</EmergencyText>
          </EmergencyCard>
        )}

        {/* Messages List / Welcome Empty State */}
        <View style={styles.contentWrapper}>
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
          {isLoadingHistory ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#0f766e" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              keyExtractor={(item: any, index: number) =>
                item.id || String(index)
              }
              inverted
              onViewableItemsChanged={onViewableItemsChanged.current}
              viewabilityConfig={viewabilityConfig.current}
              renderItem={({ item }) => {
                if (item.isDateHeader) {
                  return (
                    <ChatDateHeader dateLabel={item.dateLabel} isDark={isDark} />
                  );
                }

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
                  item.action === "ADD_DOCUMENT" ||
                  item.action === "CONFIRM_MEDICINE" ||
                  item.action === "EXTRACTED_MEDICINES" ||
                  item.action === "EXTRACTED_MEDICINES_CONFLICTS" ||
                  item.action === "EXTRACTED_MEDICINES_CONFIRM" ||
                  item.action === "EXTRACTED_MEDICINES_SUCCESS" ||
                  item.action === "MEDICINE_SUMMARY" ||
                  item.action === "MEDICINE_REVIEW_ACCORDION" ||
                  item.action === "EXTRACTED_MEDICINES_PARTIAL_FAILURE";

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

                      {hasText && (
                        <MessageBubble
                          message={item}
                          isDark={isDark}
                          onSpeak={() =>
                            speakMessage(item.id, item.text, preferredLang)
                          }
                          isSpeaking={speakingMessageId === item.id}
                        />
                      )}
                      <View style={styles.optionsWrapper}>{card}</View>
                    </View>
                  );
                };

                if (isComplexStep) {
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
                      />,
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
                      />,
                    );
                  }
                  if (item.action === "ADD_MEDICINE") {
                    const isLatest = isLatestActiveMessage(item.id);
                    const med = item.medicine || {};
                    return renderAssistantPrompt(
                      <AddMedicineCard
                        key={item.id}
                        med={med}
                        isEditingLocal={false}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        currentClientMedId={chatCurrentClientMedId}
                        setCurrentClientMedId={setChatCurrentClientMedId}
                        onSave={(updatedMed) => {
                          handleGenericOptionPress({
                            label: `Add medicine: ${updatedMed.name}`,
                            value: { medicine: updatedMed },
                            actionType: "ADD_MEDICINE",
                          });
                        }}
                        readOnly={!isLatest}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />,
                    );
                  }
                  if (item.action === "EDIT_MEDICINE") {
                    const isLatest = isLatestActiveMessage(item.id);
                    const med = item.medicine || {};
                    return renderAssistantPrompt(
                      <View
                        style={{
                          backgroundColor: isDark ? "#1e293b" : "#ffffff",
                          borderRadius: 16,
                          padding: 16,
                          marginTop: 8,
                          borderWidth: 1,
                          borderColor: isDark ? "#334155" : "#e2e8f0",
                          opacity: !isLatest ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.textPrimary,
                            marginBottom: 12,
                          }}
                        >
                          {med.name || med.medicationName || "Unknown Medicine"}
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                color: isDark ? "#cbd5e1" : "#475569",
                              }}
                            >
                              {med.dosage
                                ? `${med.dosage} ${med.dosageUnit || ""}`.trim()
                                : "No dosage specified"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: isDark ? "#94a3b8" : "#64748b",
                                marginTop: 4,
                              }}
                            >
                              {med.frequency
                                ? med.frequency === "ONCE"
                                  ? t("frequency.ONCE")
                                  : med.frequency === "TWICE"
                                    ? t("frequency.TWICE")
                                    : med.frequency === "THRICE"
                                      ? t("frequency.THRICE")
                                      : med.frequency
                                : "No frequency specified"}
                            </Text>
                          </View>

                          <TouchableOpacity
                            disabled={!isLatest}
                            onPress={() => {
                              setMedicineToEdit(med);
                              setTimeout(() => {
                                editSheetRef.current?.present();
                              }, 100);
                            }}
                            style={{
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "#f1f5f9",
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Ionicons
                              name="pencil"
                              size={16}
                              color={theme.colors.primary}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={{
                                color: theme.colors.primary,
                                fontWeight: "600",
                                fontSize: 14,
                              }}
                            >
                              Edit
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>,
                    );
                  }
                  if (item.action === "REVIEW_MEDICINES_LIST" || item.action === "ADD_DOCUMENT") {
                    const isLatest = isLatestActiveMessage(item.id);
                    const isReadOnly = (isHistorical && chosenVal !== null) || !isLatest;
                    const displayMeds = item.medicines?.length
                      ? item.medicines
                      : (isLatest ? chatWizardState.extractedMedicines : []);

                    return renderAssistantPrompt(
                      <ReviewMedicinesListCard
                        localMedicines={displayMeds}
                        setLocalMedicines={(updater) => {
                          const nextMeds =
                            typeof updater === "function"
                              ? updater(displayMeds)
                              : updater;

                          if (isLatest) {
                            setChatWizardState((prev) => ({
                              ...prev,
                              extractedMedicines: nextMeds,
                            }));
                          }

                          setMessages((prev) =>
                            prev.map((msg) => {
                              if (msg.id === item.id) {
                                return {
                                  ...msg,
                                  medicines: nextMeds,
                                };
                              }
                              return msg;
                            }),
                          );
                        }}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        onConfirm={(formattedMeds) => {
                          const displayLabel =
                            preferredLang === "gujarati" ||
                            preferredLang === "gu"
                              ? "પસંદ કરેલ પુષ્ટિ કરો"
                              : preferredLang === "hindi" ||
                                  preferredLang === "hi"
                                ? "चयनित की पुष्टि करें"
                                : preferredLang === "marathi" ||
                                    preferredLang === "mr"
                                  ? "निवडलेले निश्चित करा"
                                  : preferredLang === "tamil" ||
                                      preferredLang === "ta"
                                    ? "தேர்ந்தெடுக்கப்பட்டதை உறுதிப்படுத்தவும்"
                                    : "Confirm Selection";

                          handleGenericOptionPress({
                            label: displayLabel,
                            value: { medicines: formattedMeds || [] },
                            actionType: "CONFIRM_MEDICINES",
                          });
                        }}
                        onAddNew={() => {
                          const displayLabel =
                            preferredLang === "gujarati" ||
                            preferredLang === "gu"
                              ? "નવું ઉમેરો"
                              : preferredLang === "hindi" ||
                                  preferredLang === "hi"
                                ? "नया जोड़ें"
                                : preferredLang === "marathi" ||
                                    preferredLang === "mr"
                                  ? "नवीन जोडा"
                                  : preferredLang === "tamil" ||
                                      preferredLang === "ta"
                                    ? "புதியதைச் சேர்க்கவும்"
                                    : "Add New";

                          handleGenericOptionPress({
                            label: displayLabel,
                            value: { addNew: true },
                            actionType: "ADD_MEDICINE",
                          });
                        }}
                        onSkipAll={() => {
                          const displayLabel =
                            preferredLang === "gujarati" ||
                            preferredLang === "gu"
                              ? "બધા છોડી દો"
                              : preferredLang === "hindi" ||
                                  preferredLang === "hi"
                                ? "सभी छोड़ें"
                                : preferredLang === "marathi" ||
                                    preferredLang === "mr"
                                  ? "सर्व वगळा"
                                  : preferredLang === "tamil" ||
                                      preferredLang === "ta"
                                    ? "அனைத்தையும் தவிர்க்கவும்"
                                    : "Skip All";

                          handleGenericOptionPress({
                            label: displayLabel,
                            value: { skipAll: true },
                            actionType: "SKIP_MEDICINES",
                          });
                        }}
                        onEdit={(med) => {
                          setMedicineToEdit(med);
                          setTimeout(() => {
                            editSheetRef.current?.present();
                          }, 100);
                        }}
                        readOnly={isReadOnly}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />,
                    );
                  }
                  if (item.action === "CONFIRM_MEDICINE") {
                    return renderAssistantPrompt(
                      <ConfirmMedicineCard
                        summary={item.medicines || item.summary || {}}
                        preferredLang={preferredLang}
                        isDark={isDark}
                        theme={theme}
                        onConfirm={() => {}}
                        onEdit={(med) => {
                          setMedicineToEdit(med);
                          setTimeout(() => {
                            editSheetRef.current?.present();
                          }, 100);
                        }}
                        readOnly={true}
                        chosenVal={chosenVal}
                        chosenLabel={chosenLabel}
                      />,
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
                      />,
                    );
                  }
                  if (item.action === "EXTRACTED_MEDICINES") {
                    const isLatest = isLatestActiveMessage(item.id);
                    return renderAssistantPrompt(
                      <ExtractedMedicinesCard
                        medicines={item.medicines || []}
                        documents={item.documents || []}
                        isDark={isDark}
                        isLatest={isLatest}
                        onEdit={(med) => {
                          setMedicineToEdit(med);
                          setTimeout(() => {
                            editSheetRef.current?.present();
                          }, 100);
                        }}
                        onConfirm={handleConfirmSelection}
                        isLoading={isLoadingResults}
                        preferredLang={preferredLang}
                      />,
                    );
                  }

                  if (item.action === "EXTRACTED_MEDICINES_CONFLICTS") {
                    const isLatest = isLatestActiveMessage(item.id);
                    const displayConflicts = item.conflicts?.length
                      ? item.conflicts
                      : (isLatest ? chatWizardState.conflicts : []);
                    return renderAssistantPrompt(
                      <ConflictCarouselCard
                        conflicts={displayConflicts}
                        currentIndex={isLatest ? chatWizardState.currentConflictIndex : 0}
                        isDark={isDark}
                        isLatest={isLatest}
                        onResolve={resolveCurrentConflict}
                        onNavigate={navigateConflict}
                        onContinueAnyway={handleContinueAnyway}
                        onReviewMedicines={handleReviewMedicines}
                        onEdit={(med) => {
                          setMedicineToEdit(med);
                          setTimeout(() => {
                            editSheetRef.current?.present();
                          }, 100);
                        }}
                        preferredLang={preferredLang}
                      />,
                    );
                  }

                  if (item.action === "EXTRACTED_MEDICINES_CONFIRM") {
                    const isLatest = isLatestActiveMessage(item.id);
                    return renderAssistantPrompt(
                      <ConfirmMedicinesCard
                        docsCount={
                          item.docsCount !== undefined
                            ? item.docsCount
                            : chatWizardState.filesInfo.length
                        }
                        extractedCount={
                          item.medicinesCount !== undefined
                            ? item.medicinesCount
                            : chatWizardState.extractedMedicines.length
                        }
                        conflictsResolvedCount={
                          chatWizardState.conflicts.length
                        }
                        toBeAddedCount={
                          item.medicinesCount !== undefined
                            ? item.medicinesCount
                            : chatWizardState.resolvedMedicines.length +
                              chatWizardState.replaceList.length +
                              chatWizardState.mergeList.length
                        }
                        isDark={isDark}
                        isLatest={isLatest}
                        onConfirm={handleConfirmAndAddMeds}
                        isLoading={isConfirmingMeds}
                        preferredLang={preferredLang}
                      />,
                    );
                  }

                  if (item.action === "EXTRACTED_MEDICINES_SUCCESS") {
                    return renderAssistantPrompt(
                      <SuccessCard
                        count={item.medicinesCount || 0}
                        isDark={isDark}
                        onViewMedicines={() =>
                          navigation.navigate("MEDICATION")
                        }
                        preferredLang={preferredLang}
                      />,
                    );
                  }

                  if (item.action === "MEDICINE_SUMMARY") {
                    const isLatest = isLatestActiveMessage(item.id);
                    return renderAssistantPrompt(
                      <MedicineExtractionSummaryCard
                        documents={item.documents || []}
                        isDark={isDark}
                        isLatest={isLatest}
                        onReview={handleReviewMedicines}
                      />,
                    );
                  }

                  if (item.action === "MEDICINE_REVIEW_ACCORDION") {
                    const isLatest = isLatestActiveMessage(item.id);
                    return renderAssistantPrompt(
                      <MedicineDocumentAccordionCard
                        documents={item.documents || []}
                        medicines={chatWizardState.extractedMedicines}
                        isDark={isDark}
                        isLatest={isLatest}
                        onEdit={(med) => {
                          setMedicineToEdit(med);
                          setTimeout(() => {
                            editSheetRef.current?.present();
                          }, 100);
                        }}
                        onContinue={handleConfirmSelection}
                        isLoading={isLoadingResults}
                        preferredLang={preferredLang}
                      />,
                    );
                  }

                  if (item.action === "EXTRACTED_MEDICINES_PARTIAL_FAILURE") {
                    const isLatest = isLatestActiveMessage(item.id);
                    return renderAssistantPrompt(
                      <View
                        style={{
                          backgroundColor: isDark ? "#1e293b" : "#ffffff",
                          borderColor: "#ef4444",
                          padding: 16,
                          borderRadius: 16,
                          borderWidth: 1,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <Ionicons
                            name="warning"
                            size={24}
                            color="#ef4444"
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: isDark ? "#f8fafc" : "#1e293b",
                            }}
                          >
                            Some Additions Failed
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 13,
                            color: isDark ? "#cbd5e1" : "#475569",
                            marginBottom: 16,
                          }}
                        >
                          Successfully added {item.successCount || 0}{" "}
                          medicine(s), but {item.failedCount || 0} failed due to
                          a network error.
                        </Text>
                        {isLatest && (
                          <TouchableOpacity
                            onPress={() => handleConfirmAndAddMeds(true)}
                            disabled={isConfirmingMeds}
                            style={{
                              backgroundColor: "#ef4444",
                              padding: 12,
                              borderRadius: 12,
                              alignItems: "center",
                            }}
                          >
                            {isConfirmingMeds ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text
                                style={{ color: "#ffffff", fontWeight: "700" }}
                              >
                                Retry Failed
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>,
                    );
                  }
                }

                if (isHistorical && isChipStep) {
                  return (
                    <View style={{ width: "100%" }}>
                      <MessageBubble
                        message={item}
                        isDark={isDark}
                        onSpeak={() =>
                          speakMessage(item.id, item.text, preferredLang)
                        }
                        isSpeaking={speakingMessageId === item.id}
                      />
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

                const showChips = item.options && item.options.length > 0;

                return (
                  <View style={{ width: "100%" }}>
                    <MessageBubble
                      message={item}
                      isDark={isDark}
                      onSpeak={() =>
                        speakMessage(item.id, item.text, preferredLang)
                      }
                      isSpeaking={speakingMessageId === item.id}
                    />
                    {showChips && (
                      <View style={styles.optionsWrapper}>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          {item.options.map((opt: any, idx: number) => {
                            const isLatest = isLatestActiveMessage(item.id);
                            return (
                              <TouchableOpacity
                                key={idx}
                                disabled={!isLatest}
                                onPress={() => handleGenericOptionPress(opt)}
                                style={{
                                  backgroundColor: isDark
                                    ? "#1e2d2f"
                                    : "#ccfbf1",
                                  borderColor: isDark ? "#2d4d4f" : "#99f6e4",
                                  borderWidth: 1,
                                  borderRadius: 12,
                                  paddingVertical: 8,
                                  paddingHorizontal: 16,
                                  opacity: isLatest ? 1 : 0.6,
                                }}
                              >
                                <Text
                                  style={{
                                    color: isDark ? "#2dd4bf" : "#0f766e",
                                    fontWeight: "600",
                                    fontSize: 13,
                                  }}
                                >
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignSelf: "flex-start",
                      paddingLeft: 12,
                      marginTop: 4,
                      marginBottom: 8,
                    }}
                  >
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
              preferredLanguage={preferredLang}
              onAttachPress={() => {
                uploadSheetRef.current?.present();
                Keyboard.dismiss();
              }}
            />
          </>
        )}
      </View>

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
