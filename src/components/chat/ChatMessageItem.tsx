import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatUTCDateTime, getRelativeDateLabel } from "../../utils/dateFormatter";
import { MessageBubble } from "./MessageBubble";
import { ChatDateHeader } from "./ChatDateHeader";
import { ResolveProfileSourceCard } from "./widgets/ResolveProfileSourceCard";
import { AskUploadOrSkipCard } from "./widgets/AskUploadOrSkipCard";
import { AskAllergiesCard } from "./widgets/AskAllergiesCard";
import { AddMedicineCard, deduplicateDrafts } from "./widgets/AddMedicineCard";
import { widgetStyles } from "./widgets/WidgetStyles";
import { ReviewMedicinesListCard } from "./widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "./widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "./widgets/MedicineOptionsPanel";
import {
  findHistoricalUserReply,
  HistoricalChips,
} from "./widgets/HistoricalChips";
import { parseChosenJson } from "./widgets/MedicineHelpers";
import {
  ExtractedMedicinesCard,
  ConflictCarouselCard,
  ConfirmMedicinesCard,
  SuccessCard,
  MedicineExtractionSummaryCard,
  MedicineDocumentAccordionCard,
} from "./widgets/ConversationalExtractionWidgets";
import { I18N_ONBOARDING_UI } from "./widgets/OnboardingI18n";
import {
  ReportSummaryChatCard,
  DocumentSummaryStats,
} from "./widgets/ReportSummaryChatCard";
import { StructuredReportSummaryCard } from "./widgets/StructuredReportSummaryCard";
import { StructuredMedicationListCard } from "./widgets/StructuredMedicationListCard";
import { StructuredReportListCard } from "./widgets/StructuredReportListCard";
import { DocumentProgressSummaryContainer } from "./widgets/DocumentProgressSummaryContainer";
import { SUGGESTED_QUESTIONS_I18N } from "../../constants/chatConstants";
import { ChatMessage } from "../../types/chat";
import { extractMedicationsFromDocuments, normalizeDocumentsList } from "../../utils/documentNormalizer";
import { normalizeMedicationItem } from "../../utils/medicationListNormalizer";
import { normalizeReportItem } from "../../utils/reportListNormalizer";
export type { ChatMessage };

interface ChatMessageItemProps {
  item: ChatMessage;
  index: number;
  mergedMessages: ChatMessage[];
  isDark: boolean;
  theme: any;
  preferredLang: string;
  speakingMessageId: string | null;
  speakMessage: (id: string, text: string, lang: string) => void;
  onboardingSessionId: string | null;
  chatWizardState: {
    step: string;
    jobIds: string[];
    filesInfo: any[];
    extractedMedicines: any[];
    conflicts: any[];
    currentConflictIndex: number;
    resolvedMedicines: any[];
    replaceList: any[];
    mergeList: any[];
    summaries: any[];
    hasViewedCompletedOcr?: boolean;
  };
  isLoadingResults: boolean;
  isConfirmingMeds: boolean;
  setMedicineToEdit: (med: any) => void;
  editSheetRef: React.RefObject<any>;
  uploadSheetRef?: React.RefObject<any>;
  handleConfirmSelection: (
    checkedMedIds?: string[],
    formattedMeds?: any[],
    messageId?: string
  ) => Promise<void>;
  resolveCurrentConflict: (resolution: "keep" | "replace" | "merge" | "remove_new", mergedPayload?: any) => void;
  navigateConflict: (direction: "prev" | "next") => void;
  handleContinueAnyway: () => void;
  handleReviewMedicines: () => void;
  handleConfirmAndAddMeds: (retryOnly?: boolean) => Promise<void>;
  handleGenericOptionPress: (option: any, optLabel?: string) => Promise<void>;
  navigation: any;
  setChatWizardState: React.Dispatch<React.SetStateAction<any>>;
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onViewFullReport?: (doc: any) => void;
  onRetryDocument?: (fileKey: string, batchId?: string) => Promise<void> | void;
  isOnboardingCompleted?: boolean;
  onAllergyCardExpand?: () => void;
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  item,
  index,
  mergedMessages,
  isDark,
  theme,
  preferredLang,
  speakingMessageId,
  speakMessage,
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
  onViewFullReport,
  onRetryDocument,
  isOnboardingCompleted,
  onAllergyCardExpand,
}) => {
  const [clientMedId, setClientMedId] = React.useState<string | null>(null);
  const [localDrafts, setLocalDrafts] = React.useState<any[]>([]);
  const [activeMedicineToEdit, setActiveMedicineToEdit] = React.useState<any | null>(null);
  const [medicineCardMode, setMedicineCardMode] = React.useState<"review" | "edit">("review");
  const tOnboarding = (key: string, replacements?: Record<string, string | number>) => {
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

  const isLatestActiveMessage = (msgId: string) => {
    const aiMessages = mergedMessages.filter(
      (m) =>
        (m.role === "ai") &&
        m.action !== "ONBOARDING_COMPLETED_NOTICE"
    );
    const latestNonNotice = aiMessages[aiMessages.length - 1];
    return latestNonNotice?.id === msgId;
  };

  const prevItem = mergedMessages[index - 1];
  let showDateHeader = false;
  if (!prevItem) {
    showDateHeader = true;
  } else if (item.createdAt && prevItem.createdAt) {
    const currentDate = formatUTCDateTime(item.createdAt, "dd-MMM-yyyy", true);
    const prevDate = formatUTCDateTime(prevItem.createdAt, "dd-MMM-yyyy", true);
    if (currentDate !== prevDate) {
      showDateHeader = true;
    }
  } else if (item.createdAt && !prevItem.createdAt) {
    showDateHeader = true;
  }

  const dateHeader =
    showDateHeader && item.createdAt ? (
      <ChatDateHeader
        dateLabel={getRelativeDateLabel(item.createdAt, true)}
        isDark={isDark}
      />
    ) : null;

  const { chosenVal, chosenLabel } = findHistoricalUserReply(mergedMessages, item.id, false);
  const isAnswered = chosenVal !== null || chosenLabel !== null;
  const isLatest = isLatestActiveMessage(item.id);
  const isHistorical = isAnswered || !isLatest;
  const isConfirmAction =
    item.action === "CONFIRM_MEDICINES" ||
    (item as any).actionType === "CONFIRM_MEDICINES" ||
    Boolean((item as any).isConfirmed);
  const isReadOnly = isHistorical || isConfirmAction;

  const isComplexStep =
    item.action === "RESOLVE_PROFILE_SOURCE" ||
    item.action === "ASK_UPLOAD_OR_SKIP" ||
    item.action === "ASK_ALLERGIES" ||
    item.action === "MEDICINE_OPTIONS" ||
    item.action === "ADD_MEDICINE" ||
    item.action === "EDIT_MEDICINE" ||
    item.action === "REVIEW_MEDICINES_LIST" ||
    item.action === "ADD_DOCUMENT" ||
    item.action === "ACTION" ||
    (item as any).mode === "ACTION" ||
    item.action === "CONFIRM_MEDICINE" ||
    item.action === "CONFIRM_MEDICINES" ||
    (item as any).actionType === "CONFIRM_MEDICINES" ||
    item.action === "EXTRACTED_MEDICINES" ||
    item.action === "EXTRACTED_MEDICINES_CONFLICTS" ||
    item.action === "EXTRACTED_MEDICINES_CONFIRM" ||
    item.action === "EXTRACTED_MEDICINES_SUCCESS" ||
    item.action === "MEDICINE_SUMMARY" ||
    item.action === "MEDICINE_REVIEW_ACCORDION" ||
    item.action === "EXTRACTED_MEDICINES_PARTIAL_FAILURE" ||
    item.action === "ASK_REPORT" ||
    item.action === "MEDICATION_LIST" ||
    item.task === "MEDICATION_LIST" ||
    item.action === "REPORT_LIST" ||
    item.task === "REPORT_LIST" ||
    item.action === "DOCUMENT_LIST" ||
    item.task === "DOCUMENT_LIST" ||
    (item as any).mode === "STRUCTURED_LIST";

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
        {dateHeader}
        {hasText && (
          <MessageBubble
            message={item as any}
            isDark={isDark}
            onSpeak={() => speakMessage(item.id, item.text, preferredLang)}
            isSpeaking={speakingMessageId === item.id}
          />
        )}
        <View style={styles.optionsWrapper}>{card}</View>
      </View>
    );
  };

  // User-role messages are strictly user speech bubbles (with attachments if present)
  // and must never mount assistant cards, wizards, or action prompts.
  if (item.role === "user") {
    return (
      <View style={{ width: "100%" }}>
        {dateHeader}
        <MessageBubble
          message={item as any}
          isDark={isDark}
          onSpeak={() => speakMessage(item.id, item.text, preferredLang)}
          isSpeaking={speakingMessageId === item.id}
        />
      </View>
    );
  }

  if (isComplexStep) {
    if (item.action === "ASK_REPORT") {
      const doc = item.document;
      const hasDoc = Boolean(
        doc &&
        !Array.isArray(doc) &&
        (doc.id ||
          doc.summary ||
          (doc.keyFindings && doc.keyFindings.length > 0) ||
          doc.extractedStructuredData ||
          doc.fileName ||
          doc.s3Key),
      );

      if (hasDoc) {
        const questions =
          item.suggestedQuestions && item.suggestedQuestions.length > 0
            ? item.suggestedQuestions
            : SUGGESTED_QUESTIONS_I18N.english.document;

        const isStructured = Boolean(
          doc.patientDetails ||
          (Array.isArray(doc.abnormalResults) && doc.abnormalResults.length > 0) ||
          (Array.isArray(doc.normalResults) && doc.normalResults.length > 0) ||
          doc.whatThisMayMean ||
          doc.isLabReport
        );

        if (isStructured) {
          return renderAssistantPrompt(
            <StructuredReportSummaryCard
              document={doc}
              suggestedQuestions={questions}
              isDark={isDark}
              theme={theme}
              preferredLang={preferredLang}
              onQuestionPress={(q) =>
                handleGenericOptionPress({
                  label: q,
                  value: q,
                  actionType: "NORMAL_CHAT",
                })
              }
              onViewFullReport={
                onViewFullReport ? () => onViewFullReport(doc) : undefined
              }
              readOnly={chosenVal !== null}
            />,
          );
        }

        return renderAssistantPrompt(
          <ReportSummaryChatCard
            document={doc}
            documentSummary={item.documentSummary}
            suggestedQuestions={questions}
            isDark={isDark}
            theme={theme}
            preferredLang={preferredLang}
            onQuestionPress={(q) =>
              handleGenericOptionPress({
                label: q,
                value: q,
                actionType: "NORMAL_CHAT",
              })
            }
            onViewFullReport={
              onViewFullReport ? () => onViewFullReport(doc) : undefined
            }
            readOnly={chosenVal !== null}
          />,
        );
      }

      const msgDocs = normalizeDocumentsList(item.documents || item.document || item);
      if (msgDocs.length > 0) {
        return renderAssistantPrompt(
          <DocumentProgressSummaryContainer
            documents={msgDocs}
            preferredLang={preferredLang}
            isDark={isDark}
            theme={theme}
            onRetry={onRetryDocument}
            canRetry={isLatest && !isReadOnly}
            readOnly={isReadOnly}
          />,
        );
      }
      return renderAssistantPrompt(null);
    }
    if (item.action === "RESOLVE_PROFILE_SOURCE") {
      return renderAssistantPrompt(
        <ResolveProfileSourceCard
          activeMsg={item}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          sendMessage={(userText, updatedState, displayLabel, actionType) => {
            if (handleGenericOptionPress) {
              let parsedActionData: any = undefined;
              if (typeof userText === "string") {
                try {
                  parsedActionData = JSON.parse(userText);
                } catch {
                  parsedActionData = { confirmed: true };
                }
              } else if (typeof userText === "object") {
                parsedActionData = userText;
              }
              handleGenericOptionPress(
                {
                  key: typeof userText === "string" ? userText : JSON.stringify(userText),
                  value: typeof userText === "string" ? userText : JSON.stringify(userText),
                  label: displayLabel || "Confirm & Continue",
                  actionType: actionType || "RESOLVE_PROFILE_SOURCE",
                  actionData: parsedActionData,
                  state: updatedState,
                },
                displayLabel || "Confirm & Continue",
              );
            }
          }}
          state={chatWizardState || {}}
          isHistorical={isHistorical}
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
          setState={() => { }}
          sendMessage={() => { }}
          handleDocumentUpload={() => {
            uploadSheetRef?.current?.present();
          }}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />,
      );
    }
    if (item.action === "ASK_ALLERGIES") {
      return renderAssistantPrompt(
        <AskAllergiesCard
          activeMsg={item}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onExpand={onAllergyCardExpand}
          sendMessage={(userText, updatedState, displayLabel) => {
            let cleanLabel = displayLabel;
            if (!cleanLabel || cleanLabel.startsWith("{")) {
              if (userText === "NO") {
                cleanLabel = "No Allergies";
              } else {
                try {
                  const p = JSON.parse(userText);
                  cleanLabel = Array.isArray(p.allergies) ? p.allergies.join(", ") : userText;
                } catch {
                  cleanLabel = userText;
                }
              }
            }
            handleGenericOptionPress(
              {
                key: userText,
                value: userText,
                label: cleanLabel,
                state: updatedState,
                actionType: "ASK_ALLERGIES",
              },
              cleanLabel
            );
          }}
          state={(item as any).onboardingState || (item as any).state || {}}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
          loading={isLoadingResults || isConfirmingMeds}
        />,
      );
    }
    if (
      item.action === "ADD_MEDICINE" ||
      item.action === "EDIT_MEDICINE"
    ) {
      let candidateMed =
        item.medicine ||
        (Array.isArray(item.medicines) && item.medicines.length > 0 ? item.medicines[0] : null);
      let candidateDrafts =
        Array.isArray(item.medicines) && item.medicines.length > 0 ? item.medicines : null;

      if (isHistorical && (!candidateMed || Object.keys(candidateMed).length === 0)) {
        const parsed = parseChosenJson(chosenVal);
        if (parsed) {
          const parsedMeds = Array.isArray(parsed?.medicines)
            ? parsed.medicines
            : (parsed?.medicine ? [parsed.medicine] : null);
          if (parsedMeds && parsedMeds.length > 0) {
            candidateMed = parsedMeds[0];
            candidateDrafts = parsedMeds;
          }
        }

        if (!candidateMed || Object.keys(candidateMed).length === 0) {
          // Look for adjacent review or confirm messages in mergedMessages (chronological)
          const currentIdx = mergedMessages.findIndex((m) => m.id === item.id);
          if (currentIdx !== -1) {
            for (let i = currentIdx + 1; i < mergedMessages.length; i++) {
              const m = mergedMessages[i];
              const meds = Array.isArray(m.medicines) && m.medicines.length > 0
                ? m.medicines
                : (m.medicine ? [m.medicine] : null);
              if (meds && meds.length > 0) {
                candidateMed = meds[0];
                candidateDrafts = meds;
                break;
              }
              const mRaw = parseChosenJson(m.rawValue);
              const rawMeds = Array.isArray(mRaw?.medicines) && mRaw.medicines.length > 0
                ? mRaw.medicines
                : (mRaw?.medicine ? [mRaw.medicine] : null);
              if (rawMeds && rawMeds.length > 0) {
                candidateMed = rawMeds[0];
                candidateDrafts = rawMeds;
                break;
              }
            }
          }
        }
      }

      const med = candidateMed || {};
      const activeDrafts =
        isHistorical && candidateDrafts && candidateDrafts.length > 0
          ? candidateDrafts
          : localDrafts;

      const handleSaveMedicines = (allDrafts: any[]) => {
        const rawArray = Array.isArray(allDrafts) ? allDrafts : (allDrafts ? [allDrafts] : []);
        const combined = [...localDrafts, ...rawArray];
        const uniqueDrafts = deduplicateDrafts(combined);
        const displayLabel = tOnboarding("saveMedicines") || "Save Medicines";
        const savePayload = {
          action: "SAVE_AND_REVIEW",
          saveAndReview: true,
          medicines: uniqueDrafts,
        };
        handleGenericOptionPress(
          {
            key: "SAVE_AND_REVIEW",
            value: savePayload,
            actionType: "SAVE_AND_REVIEW",
            label: displayLabel,
            state: {
              medicinesToAdd: uniqueDrafts,
              currentStep: "REVIEW_MEDICINES_LIST",
            },
          },
          displayLabel,
        );
      };

      const handleAddAndContinue = (newMed: any, allDrafts?: any[]) => {
        const updated = deduplicateDrafts(allDrafts || [...localDrafts, newMed]);
        setLocalDrafts(updated);
      };

      const handleDraftSync = (updatedDrafts: any[]) => {
        setLocalDrafts(deduplicateDrafts(updatedDrafts));
      };

      const handleExitToOptions = () => {
        const displayLabel = tOnboarding("cancel") || "Cancel";
        handleGenericOptionPress(
          {
            key: "CANCEL",
            value: "CANCEL",
            label: displayLabel,
            state: {
              currentStep: "MEDICINE_OPTIONS",
              cancellationNotice: true,
            },
          },
          displayLabel,
        );
      };

      return renderAssistantPrompt(
        <AddMedicineCard
          key={item.id}
          med={med}
          initialMedicines={activeDrafts}
          totalBuffered={activeDrafts.length}
          isEditingLocal={false}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          currentClientMedId={clientMedId}
          setCurrentClientMedId={setClientMedId}
          onSaveMedicines={!isHistorical ? handleSaveMedicines : undefined}
          onSave={!isHistorical ? (updatedMed) => handleSaveMedicines([updatedMed]) : () => { }}
          onAddAndContinue={!isHistorical ? handleAddAndContinue : undefined}
          onDraftSync={!isHistorical ? handleDraftSync : undefined}
          onExitToOptions={!isHistorical ? handleExitToOptions : undefined}
          onCancel={!isHistorical ? handleExitToOptions : undefined}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />,
      );
    }
    const isConfirmReceipt =
      item.action === "CONFIRM_MEDICINES" ||
      item.action === "CONFIRM_MEDICINE" ||
      (item as any).actionType === "CONFIRM_MEDICINES";
    if (isConfirmReceipt) {
      return renderAssistantPrompt(null);
    }

    if (
      item.action === "ACTION" ||
      (item as any).mode === "ACTION" ||
      item.action === "REVIEW_MEDICINES_LIST" ||
      item.action === "ADD_DOCUMENT"
    ) {
      const msgDocs = normalizeDocumentsList(item.documents || item.document || item);
      const rawMeds = item.medicines?.length
        ? item.medicines
        : (isReadOnly
          ? extractMedicationsFromDocuments(msgDocs)
          : (chatWizardState.extractedMedicines.length > 0
            ? chatWizardState.extractedMedicines
            : extractMedicationsFromDocuments(msgDocs)));

      const displayMeds = rawMeds.map((m: any, idx: number) => ({
        ...m,
        id: m.id || m.client_med_id || `med-${item.id}-${idx}`,
        selected: m.selected !== undefined ? m.selected : true,
      }));

      const handleConfirm = (checkedMeds: string[], formattedMeds?: any[]) => {
        if (isReadOnly) return;
        if (chatWizardState.extractedMedicines.length > 0 && !item.medicines?.length) {
          item.medicines = deduplicateDrafts(chatWizardState.extractedMedicines);
          (item as any).isConfirmed = true;
          handleConfirmSelection();
          return;
        }

        const selectedMedicineObjects =
          formattedMeds && formattedMeds.length > 0
            ? formattedMeds
            : displayMeds.filter(
              (m: any) =>
                checkedMeds.includes(m.client_med_id || m.id) ||
                checkedMeds.includes(m.id)
            );
        const uniqueSelected = deduplicateDrafts(selectedMedicineObjects);
        item.medicines = uniqueSelected.length > 0 ? uniqueSelected : displayMeds;
        (item as any).isConfirmed = true;
        const displayLabel = tOnboarding("confirmSelection") || "Continue";
        const confirmPayload = {
          selected: checkedMeds,
          medicines: uniqueSelected,
        };
        handleGenericOptionPress(
          {
            key: "CONFIRM_MEDICINES",
            value: confirmPayload,
            actionType: "CONFIRM_MEDICINES",
            label: displayLabel,
            state: {
              medicinesConfirmed: true,
              medicinesFlowStarted: true,
              medicinesToAdd: uniqueSelected.length > 0 ? uniqueSelected : displayMeds,
            },
          },
          displayLabel,
        );
      };

      const handleAddNew = () => {
        if (isReadOnly) return;
        const displayLabel = tOnboarding("addAnotherMedicine") || "Add New";
        handleGenericOptionPress(
          {
            key: "ADD",
            value: "ADD",
            actionType: "ADD_MEDICINE",
            label: displayLabel,
            state: {
              currentStep: "ADD_MEDICINE",
              cancellationNotice: false,
            },
          },
          displayLabel,
        );
      };

      const handleSkipAll = () => {
        if (isReadOnly) return;
        const displayLabel = tOnboarding("skipAll") || "Skip All";
        handleGenericOptionPress(
          {
            key: "SKIP_MEDICINES",
            value: { skipAll: true },
            actionType: "SKIP_MEDICINES",
            label: displayLabel,
            state: {
              medicinesFlowStarted: true,
              medicinesConfirmed: false,
            },
          },
          displayLabel,
        );
      };

      const handleCancelReview = () => {
        if (isReadOnly) return;
        const displayLabel = tOnboarding("cancel") || "Cancel";
        handleGenericOptionPress(
          {
            key: "CANCEL",
            value: "CANCEL",
            label: displayLabel,
            state: {
              currentStep: "MEDICINE_OPTIONS",
              cancellationNotice: true,
            },
          },
          displayLabel,
        );
      };

      const handleEdit = (med: any) => {
        if (isReadOnly) return;
        setActiveMedicineToEdit(med);
        setMedicineCardMode("edit");
      };

      const setLocalMedicinesWrapper = (updater: any) => {
        if (setMessages) {
          setMessages((prev: any) =>
            prev.map((msg: any) => {
              if (msg.id === item.id) {
                const currentMeds = (msg.medicines && msg.medicines.length > 0) ? msg.medicines : displayMeds;
                const updatedMeds =
                  typeof updater === "function"
                    ? updater(currentMeds)
                    : updater;
                return {
                  ...msg,
                  medicines: updatedMeds,
                };
              }
              return msg;
            })
          );
        }
        if (typeof updater === "function") {
          setChatWizardState((prev: any) => ({
            ...prev,
            extractedMedicines: updater(prev.extractedMedicines?.length ? prev.extractedMedicines : displayMeds),
          }));
        } else {
          setChatWizardState((prev: any) => ({
            ...prev,
            extractedMedicines: updater,
          }));
        }
      };

      if (medicineCardMode === "edit" && activeMedicineToEdit) {
        return renderAssistantPrompt(
          <AddMedicineCard
            key={`edit-${activeMedicineToEdit.client_med_id || activeMedicineToEdit.id || item.id}`}
            med={activeMedicineToEdit}
            initialMedicines={displayMeds}
            totalBuffered={displayMeds.length}
            isEditingLocal={true}
            preferredLang={preferredLang}
            isDark={isDark}
            theme={theme}
            currentClientMedId={activeMedicineToEdit.client_med_id || activeMedicineToEdit.id}
            setCurrentClientMedId={() => { }}
            onSaveMedicines={(allDrafts) => {
              const uniqueDrafts = deduplicateDrafts(allDrafts);
              setLocalMedicinesWrapper(uniqueDrafts);
              setActiveMedicineToEdit(null);
              setMedicineCardMode("review");
            }}
            onSave={(updatedMed) => {
              const updatedList = displayMeds.map((m: any) =>
                (m.client_med_id === updatedMed.client_med_id || m.id === updatedMed.id) ? updatedMed : m
              );
              setLocalMedicinesWrapper(deduplicateDrafts(updatedList));
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
          />,
        );
      }

      if (displayMeds.length > 0) {
        return renderAssistantPrompt(
          <ReviewMedicinesListCard
            localMedicines={displayMeds}
            setLocalMedicines={setLocalMedicinesWrapper}
            preferredLang={preferredLang}
            isDark={isDark}
            theme={theme}
            onConfirm={handleConfirm}
            onAddNew={handleAddNew}
            onSkipAll={handleSkipAll}
            onEdit={handleEdit}
            onCancel={handleCancelReview}
            readOnly={isReadOnly}
            chosenVal={chosenVal}
            chosenLabel={chosenLabel}
            documents={msgDocs}
            showDocumentSummary={true}
            onRetryDocument={onRetryDocument}
            canRetry={isLatest && !isReadOnly}
          />,
        );
      }

      if (msgDocs.length > 0) {
        return renderAssistantPrompt(
          <View style={{ width: "100%" }}>
            <DocumentProgressSummaryContainer
              documents={msgDocs}
              preferredLang={preferredLang}
              isDark={isDark}
              theme={theme}
              onRetry={onRetryDocument}
              canRetry={isLatest && !isReadOnly}
              readOnly={isReadOnly}
            />
            {item.options && item.options.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <MedicineOptionsPanel
                  optionsList={item.options}
                  isDark={isDark}
                  theme={theme}
                  onOptionPress={(opt) => handleGenericOptionPress(opt)}
                  readOnly={isReadOnly}
                  disableDashboardOption={isLatest && !isReadOnly}
                  chosenVal={chosenVal}
                  chosenLabel={chosenLabel}
                  preferredLang={preferredLang}
                />
              </View>
            )}
          </View>,
        );
      }

      return renderAssistantPrompt(null);
    }
    if (item.action === "CONFIRM_MEDICINE") {
      return renderAssistantPrompt(
        <ConfirmMedicineCard
          summary={item.medicines || item.summary || {}}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={() => { }}
          onEdit={() => { }}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />,
      );
    }
    if (item.action === "MEDICINE_OPTIONS") {
      const isHistoricalMsg = isHistorical || isReadOnly;
      return renderAssistantPrompt(
        <MedicineOptionsPanel
          optionsList={item.options || []}
          isDark={isDark}
          theme={theme}
          onOptionPress={(optKey, label) => handleGenericOptionPress(optKey, label)}
          readOnly={isHistoricalMsg}
          disableDashboardOption={isLatest && !isHistoricalMsg}
          loading={isLoadingResults || isConfirmingMeds}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
          preferredLang={preferredLang}
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
        />
      );
    }

    if (item.action === "EXTRACTED_MEDICINES_CONFLICTS") {
      const isLatest = isLatestActiveMessage(item.id);
      return renderAssistantPrompt(
        <ConflictCarouselCard
          conflicts={chatWizardState.conflicts || []}
          currentIndex={chatWizardState.currentConflictIndex}
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
          documents={item.documents}
        />
      );
    }

    if (item.action === "EXTRACTED_MEDICINES_CONFIRM") {
      const isLatest = isLatestActiveMessage(item.id);
      return renderAssistantPrompt(
        <ConfirmMedicinesCard
          docsCount={item.docsCount || chatWizardState.filesInfo.length}
          extractedCount={chatWizardState.extractedMedicines.length}
          conflictsResolvedCount={chatWizardState.conflicts.length}
          toBeAddedCount={item.medicinesCount !== undefined ? item.medicinesCount : (
            chatWizardState.resolvedMedicines.length +
            chatWizardState.replaceList.length +
            chatWizardState.mergeList.length
          )}
          isDark={isDark}
          isLatest={isLatest}
          onConfirm={handleConfirmAndAddMeds}
          isLoading={isConfirmingMeds}
          preferredLang={preferredLang}
        />
      );
    }

    if (item.action === "EXTRACTED_MEDICINES_SUCCESS") {
      return renderAssistantPrompt(
        <SuccessCard
          count={item.medicinesCount || 0}
          isDark={isDark}
          onViewMedicines={() => navigation.navigate("MEDICATION")}
          preferredLang={preferredLang}
        />
      );
    }

    if (item.action === "MEDICINE_SUMMARY") {
      const isLatest = isLatestActiveMessage(item.id);
      return renderAssistantPrompt(
        <MedicineExtractionSummaryCard
          documents={(item.documents || []).map(d => ({ ...d, medicinesCount: d.medicinesCount || 0 }))}
          isDark={isDark}
          isLatest={isLatest}
          onReview={handleReviewMedicines}
        />
      );
    }

    if (item.action === "MEDICINE_REVIEW_ACCORDION") {
      const isLatest = isLatestActiveMessage(item.id);
      return renderAssistantPrompt(
        <MedicineDocumentAccordionCard
          documents={(item.documents || []).map(d => ({ ...d, medicinesCount: d.medicinesCount || 0 }))}
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
        />
      );
    }

    if (item.action === "EXTRACTED_MEDICINES_PARTIAL_FAILURE") {
      const isLatest = isLatestActiveMessage(item.id);
      return renderAssistantPrompt(
        <View style={[styles.partialFailureContainer, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
          <View style={styles.partialFailureHeader}>
            <Ionicons name="warning" size={24} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b" }}>
              Some Additions Failed
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 16 }}>
            Successfully added {item.successCount || 0} medicine(s), but {item.failedCount || 0} failed due to a network error.
          </Text>
          {isLatest && (
            <TouchableOpacity
              onPress={() => handleConfirmAndAddMeds(true)}
              disabled={isConfirmingMeds}
              style={styles.retryBtn}
            >
              {isConfirmingMeds ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Retry Failed</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (
      item.action === "REPORT_LIST" ||
      item.task === "REPORT_LIST" ||
      item.action === "DOCUMENT_LIST" ||
      item.task === "DOCUMENT_LIST"
    ) {
      const rawReports = (item as any).reports?.length
        ? (item as any).reports
        : (item.documents?.length
          ? item.documents
          : (item.items?.length ? item.items : []));

      const normalizedList = rawReports.map((r: any, idx: number) =>
        normalizeReportItem(r, idx)
      );

      return renderAssistantPrompt(
        <StructuredReportListCard
          reports={normalizedList}
          pagination={item.pagination}
          isDark={isDark}
          theme={theme}
          preferredLang={preferredLang}
          onViewAllReports={() => {
            try {
              navigation.navigate("DocumentStack", { screen: "DocumentList" });
            } catch {
              try {
                navigation.navigate("DocumentList");
              } catch {
                try {
                  navigation.navigate("Home");
                } catch (e) {
                  console.warn("[ChatMessageItem] View all documents navigation error:", e);
                }
              }
            }
          }}
          onViewReport={(rep) => {
            if (onViewFullReport) {
              onViewFullReport(rep.raw || rep);
            } else {
              try {
                navigation.navigate("DocumentStack", {
                  screen: "DocumentSummary",
                  params: { document: rep.raw || rep },
                });
              } catch (e) {
                console.warn("[ChatMessageItem] View report navigation error:", e);
              }
            }
          }}
          onUploadReport={() => {
            uploadSheetRef?.current?.present();
          }}
          readOnly={isHistorical}
        />
      );
    }

    if (
      item.action === "MEDICATION_LIST" ||
      item.task === "MEDICATION_LIST" ||
      (item as any).mode === "STRUCTURED_LIST"
    ) {
      const rawItems = item.medicines?.length
        ? item.medicines
        : ((item as any).reports?.length
          ? (item as any).reports
          : (item.items?.length ? item.items : []));

      const isDocList =
        (item as any).reports?.length > 0 ||
        (item.documents?.length! > 0 && !item.medicines?.length) ||
        (rawItems.length > 0 &&
          rawItems.some((it: any) =>
            Boolean(
              it?.documentType ||
                it?.ocrStatus ||
                (it?.fileName && !it?.medicationName && !it?.dosage)
            )
          ));

      if (isDocList) {
        const normalizedReports = rawItems.map((r: any, idx: number) =>
          normalizeReportItem(r, idx)
        );
        return renderAssistantPrompt(
          <StructuredReportListCard
            reports={normalizedReports}
            pagination={item.pagination}
            isDark={isDark}
            theme={theme}
            preferredLang={preferredLang}
            onViewAllReports={() => {
              try {
                navigation.navigate("DocumentStack", { screen: "DocumentList" });
              } catch {
                try {
                  navigation.navigate("DocumentList");
                } catch {
                  try {
                    navigation.navigate("Home");
                  } catch {}
                }
              }
            }}
            onViewReport={(rep) => {
              if (onViewFullReport) {
                onViewFullReport(rep.raw || rep);
              } else {
                try {
                  navigation.navigate("DocumentStack", {
                    screen: "DocumentSummary",
                    params: { document: rep.raw || rep },
                  });
                } catch {}
              }
            }}
            onUploadReport={() => {
              uploadSheetRef?.current?.present();
            }}
            readOnly={isHistorical}
          />
        );
      }

      const normalizedList = rawItems.map((m: any) =>
        typeof m === "object" && m.name && m.medicationType
          ? m
          : normalizeMedicationItem(m)
      );

      return renderAssistantPrompt(
        <StructuredMedicationListCard
          medicines={normalizedList}
          pagination={item.pagination}
          isDark={isDark}
          theme={theme}
          preferredLang={preferredLang}
          onViewAllMedications={() => navigation.navigate("MEDICATION")}
          onAddMedication={() => {
            handleGenericOptionPress({
              label: "Add Medicine",
              value: "ADD",
              actionType: "ADD_MEDICINE",
            });
          }}
          onUploadPrescription={() => {
            uploadSheetRef?.current?.present();
          }}
          readOnly={isHistorical}
        />
      );
    }
  }

  if (isHistorical && isChipStep) {
    return (
      <View style={{ width: "100%" }}>
        {dateHeader}
        <MessageBubble
          message={item as any}
          isDark={isDark}
          onSpeak={() => speakMessage(item.id, item.text, preferredLang)}
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
      {dateHeader}
      <MessageBubble
        message={item as any}
        isDark={isDark}
        onSpeak={() => speakMessage(item.id, item.text, preferredLang)}
        isSpeaking={speakingMessageId === item.id}
      />
      {showChips && (
        <View
          style={styles.optionsWrapper}
          pointerEvents={isHistorical || isLoadingResults || isConfirmingMeds ? "none" : "auto"}
        >
          <View style={widgetStyles.chipRow}>
            {item.options?.map((opt: any, idx: number) => {
              const label = typeof opt === "string" ? opt : opt.label;
              const value = typeof opt === "string" ? opt : opt.value;
              const key = typeof opt === "string" ? opt : (opt.key || opt.value);
              const isDashboard =
                String(key).toUpperCase() === "DASHBOARD" ||
                String(value).toUpperCase() === "DASHBOARD" ||
                String(label).toLowerCase().includes("dashboard");
              const isOptDisabled = isHistorical || isLoadingResults || isConfirmingMeds || (isLatest && isDashboard);

              return (
                <TouchableOpacity
                  key={value || idx}
                  disabled={isOptDisabled}
                  onPress={() => {
                    if (isOptDisabled) return;
                    handleGenericOptionPress(opt, typeof label === "string" ? label : undefined);
                  }}
                  style={[
                    widgetStyles.chip,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: isOptDisabled ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={styles.chipText}>
                    {opt.label || opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent, (prevProps, nextProps) => {
  const sameItem =
    prevProps.item === nextProps.item ||
    (prevProps.item.id === nextProps.item.id &&
      prevProps.item.text === nextProps.item.text &&
      prevProps.item.action === nextProps.item.action &&
      (prevProps.item as any).isConfirmed === (nextProps.item as any).isConfirmed &&
      prevProps.item.createdAt === nextProps.item.createdAt);

  if (!sameItem) return false;
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.isDark !== nextProps.isDark) return false;
  if (prevProps.preferredLang !== nextProps.preferredLang) return false;
  if (prevProps.isLoadingResults !== nextProps.isLoadingResults) return false;
  if (prevProps.isConfirmingMeds !== nextProps.isConfirmingMeds) return false;
  if (prevProps.chatWizardState !== nextProps.chatWizardState) return false;

  const prevSpeaking = prevProps.speakingMessageId === prevProps.item.id;
  const nextSpeaking = nextProps.speakingMessageId === nextProps.item.id;
  if (prevSpeaking !== nextSpeaking) return false;

  const prevIsLatest = prevProps.mergedMessages[prevProps.mergedMessages.length - 1]?.id === prevProps.item.id;
  const nextIsLatest = nextProps.mergedMessages[nextProps.mergedMessages.length - 1]?.id === nextProps.item.id;
  if (prevIsLatest !== nextIsLatest) return false;

  const prevPrevItem = prevProps.mergedMessages[prevProps.index - 1];
  const nextPrevItem = nextProps.mergedMessages[nextProps.index - 1];
  if (prevPrevItem?.createdAt !== nextPrevItem?.createdAt) return false;

  return true;
});

const styles = StyleSheet.create({
  optionsWrapper: {
    paddingLeft: 48,
    paddingRight: 16,
    marginTop: 2,
    marginBottom: 8,
  },
  partialFailureContainer: {
    borderColor: "#ef4444",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  partialFailureHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chipBtn: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
});
