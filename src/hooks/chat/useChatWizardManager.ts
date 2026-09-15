import { useState, useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import apiClient from "../../services/apiClient";
import { MedicationReviewService } from "../../services/medicationReviewService";
import {
  listMedications,
  checkMedicationDuplicate,
  addMedication,
  updateMedication,
} from "../../services/medicationservice";
import { ExtractedMedicine } from "../../types/medicationReview";
import { AddOrEditMedication } from "../../types";
import { ChatMessage, ChatWizardState, ConflictResolution } from "../../types/chat";
import { buildMedicationPayload, normalizeDocumentIds } from "../../utils/chatUtils";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import { sanitizeMedicineForPayload } from "../../components/chat/widgets/MedicineHelpers";
import { queryClient } from "../../config/queryClient";

interface UseChatWizardManagerProps {
  chatWizardState: ChatWizardState;
  setChatWizardState: React.Dispatch<React.SetStateAction<ChatWizardState>>;
  preferredLang: string;
  isAllTerminal: boolean;
  uploadingDocs: any[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  editSheetRef: React.RefObject<any>;
  extractionSheetRef: React.RefObject<any>;
  uploadSheetRef: React.RefObject<any>;
  activeSessionId: string | null;
  onboardingSessionId: string | null;
  navigation: any;
  messages: ChatMessage[];
  setIsSending: (val: boolean) => void;
  lastKnownStateRef: React.MutableRefObject<any>;
  setIsOnboardingCompleted: (val: boolean) => void;
  setPendingStep: (step: string | null) => void;
}

export const useChatWizardManager = ({
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
}: UseChatWizardManagerProps) => {
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isConfirmingMeds, setIsConfirmingMeds] = useState(false);
  const [medicineToEdit, setMedicineToEdit] = useState<ExtractedMedicine | null>(null);
  const isSendingRef = useRef<boolean>(false);

  const tOnboarding = (
    key: string,
    replacements?: Record<string, string | number>
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

  // Trigger results processing when all OCR jobs complete
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
            chatWizardState.filesInfo
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

          extractionSheetRef.current?.dismiss();

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

          const filesPayload = chatWizardState.filesInfo.map((f: any) => ({
            fileKey: f.fileKey || f.s3Key || "",
            fileName: f.fileName,
            mimeType: f.mimeType || "application/octet-stream",
          }));

          const payload = {
            actionType: "ADD_DOCUMENT",
            sessionId: activeSessionId || onboardingSessionId || undefined,
            documentId: normalizeDocumentIds(chatWizardState.filesInfo),
            actionData: { files: filesPayload },
          };

          try {
            const response = await apiClient.post("/v1/onboarding/chat", payload);
            const resData = response.data?.data || response.data;
            if (resData?.reply) {
              const incomingMeds =
                resData.medicines && resData.medicines.length > 0
                  ? resData.medicines
                  : flatMeds;
              const aiMsg: ChatMessage = {
                id: `ai-doc-res-${Date.now()}`,
                role: "ai",
                text: resData.reply,
                action: resData.actionType || resData.action || "REVIEW_MEDICINES_LIST",
                options: resData.options || [],
                medicines: incomingMeds,
                documentSummary: resData.documentSummary || null,
                documents: resData.documents || [],
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, aiMsg]);
              setChatWizardState((prev) => ({
                ...prev,
                extractedMedicines: incomingMeds,
              }));
            }
          } catch (apiErr) {
            console.warn("[AI_CHAT] /v1/onboarding/chat ADD_DOCUMENT error:", apiErr);
          }
        } catch (err) {
          console.error("[AI_CHAT] Error getting OCR extraction results:", err);
          Toast.show({
            type: "error",
            text1: "Extraction Failed",
            text2: "Unable to parse documents. Please try again.",
          });
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
    isLoadingResults,
  ]);

  const handleEditSave = (updated: ExtractedMedicine) => {
    const updatedExtracted = chatWizardState.extractedMedicines.map((m) =>
      m.id === updated.id ? { ...m, ...updated } : m
    );

    setChatWizardState((prev) => {
      const updatedConflicts = prev.conflicts.map((c) => {
        if (c.extractedMedicine.id === updated.id) {
          return {
            ...c,
            extractedMedicine: { ...c.extractedMedicine, ...updated },
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
                m.id === updated.id ? { ...m, ...updated } : m
              ),
            };
          }
          if (
            msg.action === "REVIEW_MEDICINES_LIST" ||
            msg.action === "ADD_DOCUMENT"
          ) {
            return {
              ...msg,
              medicines: updatedExtracted,
            };
          }
          return msg;
        })
    );

    editSheetRef.current?.dismiss();
    setMedicineToEdit(null);

    Toast.show({
      type: "success",
      text1: "Medicine Updated",
      text2: `${updated.name} has been updated in the list.`,
    });
  };

  const handleConfirmSelection = async (
    checkedMedIds?: string[],
    formattedMeds?: any[],
    messageId?: string
  ) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoadingResults(true);
    setIsSending(true);

    const selectedMeds =
      formattedMeds && formattedMeds.length > 0
        ? formattedMeds
        : (chatWizardState.extractedMedicines || []).filter((m) =>
            (checkedMedIds || []).includes(m.id || (m as any).client_med_id)
          );

    if (messageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isConfirmed: true,
                medicines: (msg.medicines || []).map((m: any) => ({
                  ...m,
                  selected: (checkedMedIds || []).includes(
                    m.id || m.client_med_id
                  ),
                })),
              }
            : msg
        )
      );
    }

    const userMsg: ChatMessage = {
      id: `user-confirm-${Date.now()}`,
      role: "user",
      text: tOnboarding("confirmSelection") || "Confirm Selection",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const payload: any = {
        actionType: "CONFIRM_MEDICINES",
        message: "CONFIRM_MEDICINES",
        sessionId: activeSessionId || onboardingSessionId || undefined,
        preferredLanguage: preferredLang,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
        state: lastKnownStateRef.current || {},
        actionData: {
          selected:
            checkedMedIds ||
            selectedMeds.map((m: any) => m.id || m.client_med_id),
          medicines: selectedMeds.map(sanitizeMedicineForPayload),
        },
      };

      const res = await apiClient.post("/v1/onboarding/chat", payload);
      const resData = res.data?.data || res.data;

      // Invalidate queries so dashboard & medications list update immediately
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["allMedications"] });
      queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });

      if (resData?.reply) {
        const aiMsg: ChatMessage = {
          id: `ai-confirm-res-${Date.now()}`,
          role: "ai",
          text: resData.reply,
          action: resData.actionType || resData.action || "NORMAL_CHAT",
          options: resData.options || [],
          medicines: resData.medicines || [],
          document: resData.document || null,
          documentSummary: resData.documentSummary || null,
          documents: resData.documents || [],
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

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
    } catch (err: any) {
      console.error("[AI_CHAT] Error confirming medicines:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          err?.message || "Failed to confirm medications. Please try again.",
      });
    } finally {
      isSendingRef.current = false;
      setIsLoadingResults(false);
      setIsSending(false);
    }
  };

  const resolveCurrentConflict = (
    resolution: ConflictResolution,
    mergedPayload?: AddOrEditMedication
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
                : m
            ),
          };
        }
        return msg;
      })
    );

    setChatWizardState((prev) => {
      const updatedConflicts = prev.conflicts.map((c, idx) =>
        idx === prev.currentConflictIndex
          ? { ...c, resolvedAction: resolution }
          : c
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
        (c) => c.resolvedAction !== undefined
      );
      const nextStep = allResolved ? "summary" : "conflicts";

      const nextExtractedMedicines = prev.extractedMedicines.map((m) => {
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
      let newIndex = prev.currentConflictIndex;
      if (direction === "prev" && newIndex > 0) newIndex--;
      if (direction === "next" && newIndex < prev.conflicts.length - 1)
        newIndex++;
      return { ...prev, currentConflictIndex: newIndex };
    });
  };

  const handleContinueAnyway = () => {
    setChatWizardState((prev) => ({ ...prev, step: "summary" }));
    const confirmMsg: ChatMessage = {
      id: `ai-confirm-${Date.now()}`,
      role: "ai",
      text: tOnboarding("aiConfirmIntro"),
      action: "EXTRACTED_MEDICINES_CONFIRM",
      medicinesCount: chatWizardState.extractedMedicines.length,
      docsCount: chatWizardState.filesInfo.length,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, confirmMsg]);
  };

  const handleReviewMedicines = () => {
    setChatWizardState((prev) => ({ ...prev, step: "results" }));
  };

  const handleConfirmAndAddMeds = async (retryOnly = false) => {
    setIsConfirmingMeds(true);
    try {
      // 1. Add resolved new medications
      for (const med of chatWizardState.resolvedMedicines) {
        const payload = buildMedicationPayload(med);
        await addMedication(payload);
      }

      // 2. Replace conflict medications
      for (const item of chatWizardState.replaceList) {
        const payload = buildMedicationPayload(item.extractedMedicine);
        await updateMedication({
          medicationId: item.existingId,
          data: payload,
        });
      }

      // 3. Merge conflict medications
      for (const item of chatWizardState.mergeList) {
        await updateMedication({
          medicationId: item.existingId,
          data: item.mergedMedication,
        });
      }

      // Invalidate queries so dashboard & medications list update immediately
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["allMedications"] });
      queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "All medications have been added to your schedule.",
      });

      const successMsg: ChatMessage = {
        id: `ai-success-${Date.now()}`,
        role: "ai",
        text: "Medications confirmed and saved successfully!",
        action: "SUCCESS_CARD",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (err) {
      console.error("[AI_CHAT] Error saving medications:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save medications. Please retry.",
      });
    } finally {
      setIsConfirmingMeds(false);
    }
  };

  const handleGenericOptionPress = async (option: any, optLabel?: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    let optKey: string = "";
    if (typeof option === "string") {
      optKey = option.trim();
    } else if (option && typeof option === "object") {
      optKey = String(option.key ?? option.value ?? option.action ?? option.id ?? "").trim();
    }

    // Invalid option guard: Never create "Option" user bubbles or send undefined/empty payloads
    if (!optKey || optKey === "Option" || optKey.toUpperCase() === "UNDEFINED") {
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    let normalizedKey = optKey;
    if (optKey === "ASK_ABOUT_REPORT") normalizedKey = "ASK_REPORT";
    else if (optKey === "ADD_MORE_MEDICINES" || optKey.toUpperCase() === "ADD ANOTHER MEDICINE") normalizedKey = "ADD";
    else if (optKey === "GO_TO_DASHBOARD") normalizedKey = "DASHBOARD";

    let optionLabel: string = "";
    if (option && typeof option === "object" && typeof option.label === "string" && option.label.trim()) {
      optionLabel = option.label.trim();
    } else if (typeof optLabel === "string" && optLabel.trim() && optLabel.trim() !== "Option") {
      optionLabel = optLabel.trim();
    } else {
      optionLabel = normalizedKey;
    }

    if (optionLabel === "Option") {
      optionLabel = normalizedKey;
    }

    const userMsg: ChatMessage = {
      id: `user-opt-${Date.now()}`,
      role: "user",
      text: optionLabel,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (
      option?.actionType === "ADD_DOCUMENT" ||
      normalizedKey === "ADD_DOCUMENT" ||
      option?.value === "ADD_DOCUMENT"
    ) {
      uploadSheetRef.current?.present();
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    // If saving a medicine from AddMedicineCard
    if (option?.value?.medicine || (option?.actionType === "ADD_MEDICINE" && option?.value?.medicine)) {
      try {
        const medData = option.value.medicine;
        const payload: AddOrEditMedication = {
          medicationName: (medData.medicationName || medData.name || "").trim(),
          medicationType: (medData.medicationType || medData.type || "TABLET").toUpperCase(),
          prescribedBy: medData.prescribedBy || medData.prescribed_by || "",
          dosePerIntake: typeof medData.dosePerIntake === "number" ? medData.dosePerIntake : parseFloat(String(medData.dose?.count || medData.dose?.value || medData.dosePerIntake || "1")) || 1,
          frequency: medData.frequency || "Once Daily",
          foodFrequency: medData.foodFrequency || medData.foodContext || "AFTER_FOOD",
          startDate: medData.startDate || new Date().toISOString().split("T")[0],
          ongoing: medData.ongoing !== undefined ? medData.ongoing : true,
          medicationSchedule: Array.isArray(medData.medicationSchedule)
            ? medData.medicationSchedule.reduce((acc: any, t: string) => {
                let key = "CUSTOM";
                if (t === "08:00") key = "MORNING";
                else if (t === "14:00") key = "NOON";
                else if (t === "20:00") key = "NIGHT";
                acc[key] = `${t}:00`;
                return acc;
              }, {})
            : (medData.medicationSchedule || { MORNING: "08:00:00" }),
          totalQuantity: medData.totalQuantity || medData.total_quantity || 1,
          notes: medData.notes || "",
        };

        await addMedication(payload);

        // Invalidate react-query cache so it appears immediately on Dashboard and Medication list
        queryClient.invalidateQueries({ queryKey: ["medications"] });
        queryClient.invalidateQueries({ queryKey: ["allMedications"] });
        queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
        queryClient.invalidateQueries({ queryKey: ["reminders"] });
        queryClient.invalidateQueries({ queryKey: ["allReminders"] });
        queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });

        Toast.show({
          type: "success",
          text1: "Medicine Saved",
          text2: `${payload.medicationName} added successfully`,
        });

        const confirmationMsg: ChatMessage = {
          id: `ai-med-saved-${Date.now()}`,
          role: "ai",
          text: `Added ${payload.medicationName} to your medications successfully.`,
          action: "NORMAL_CHAT",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmationMsg]);
      } catch (err: any) {
        console.error("[AI_CHAT] Error saving medicine:", err);
        Toast.show({
          type: "error",
          text1: "Save Failed",
          text2: err?.message || "Could not save medicine",
        });
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
      return;
    }

    // If cancelling the Add Medicine form
    if (option?.actionType === "CANCEL" || normalizedKey === "CANCEL" || option?.value === "cancel") {
      const cancelMsg: ChatMessage = {
        id: `ai-cancel-${Date.now()}`,
        role: "ai",
        text: "Medicine addition cancelled.",
        action: "NORMAL_CHAT",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, cancelMsg]);
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    // If opening the Add Medicine form in Chatbot (stay in chat!)
    if (
      (option?.actionType === "ADD_MEDICINE" ||
        normalizedKey === "ADD_MEDICINE" ||
        option?.value === "ADD_MEDICINE" ||
        normalizedKey === "ADD" ||
        option?.value === "ADD") &&
      !option?.value?.medicine
    ) {
      const addMedPromptMsg: ChatMessage = {
        id: `ai-add-med-${Date.now()}`,
        role: "ai",
        text: "Please fill out the medicine details below:",
        action: "ADD_MEDICINE",
        medicine: {},
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, addMedPromptMsg]);
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    try {
      const payload: any = {
        sessionId: activeSessionId || onboardingSessionId || undefined,
        preferredLanguage: preferredLang,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
        state: lastKnownStateRef.current || {},
      };

      if (option?.actionType === "CONFIRM_MEDICINES") {
        payload.actionType = "CONFIRM_MEDICINES";
        let sanitizedData = option.value;
        if (Array.isArray(option.value)) {
          sanitizedData = option.value.map(sanitizeMedicineForPayload);
        } else if (option.value && Array.isArray(option.value.medicines)) {
          sanitizedData = {
            ...option.value,
            medicines: option.value.medicines.map(sanitizeMedicineForPayload),
          };
        }
        payload.actionData = sanitizedData;
        payload.message = "CONFIRM_MEDICINES";
      } else {
        payload.message = normalizedKey;
        if (normalizedKey === "ASK_REPORT") {
          payload.actionType = "ASK_REPORT";
        }
      }

      const res = await apiClient.post("/v1/onboarding/chat", payload);
      const resData = res.data?.data;
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
          return [...prev, aiMsg];
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
            (nextPendingStep === "POST_ONBOARDING" || nextPendingStep === "COMPLETE")
        );
        setIsOnboardingCompleted(isNowCompleted);
        setPendingStep(isNowCompleted ? null : nextPendingStep);
      }
    } catch (err) {
      console.warn("[AI_CHAT] Error handling generic option:", err);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  return {
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
    tOnboarding,
  };
};
