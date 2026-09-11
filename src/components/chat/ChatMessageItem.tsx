import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatUTCDateTime } from "../../utils/dateFormatter";
import { MessageBubble } from "./MessageBubble";
import { ResolveProfileSourceCard } from "./widgets/ResolveProfileSourceCard";
import { AskUploadOrSkipCard } from "./widgets/AskUploadOrSkipCard";
import { AddMedicineCard } from "./widgets/AddMedicineCard";
import { ReviewMedicinesListCard } from "./widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "./widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "./widgets/MedicineOptionsPanel";
import {
  findHistoricalUserReply,
  HistoricalChips,
} from "./widgets/HistoricalChips";
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
import { DocumentProgressSummaryContainer } from "./widgets/DocumentProgressSummaryContainer";
import { SUGGESTED_QUESTIONS_I18N } from "../../constants/chatConstants";
import { normalizeDocumentsList, extractMedicationsFromDocuments, DocumentSummaryItem } from "../../utils/documentNormalizer";

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  mode?: any;
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
  document?: any;
  suggestedQuestions?: string[];
  keyFindings?: any[];
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string | DocumentSummaryStats;
  loginProvider?: string;
  documents?: DocumentSummaryItem[] | any[];
  createdAt?: string | Date;
  sessionId?: string;
  isOnboardingMessage?: boolean;
}

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
  handleConfirmSelection: () => Promise<void>;
  resolveCurrentConflict: (resolution: "keep" | "replace" | "merge" | "remove_new", mergedPayload?: any) => void;
  navigateConflict: (direction: "prev" | "next") => void;
  handleContinueAnyway: () => void;
  handleReviewMedicines: () => void;
  handleConfirmAndAddMeds: (retryOnly?: boolean) => Promise<void>;
  handleGenericOptionPress: (option: any) => Promise<void>;
  navigation: any;
  setChatWizardState: React.Dispatch<React.SetStateAction<any>>;
  onViewFullReport?: (doc: any) => void;
  onRetryDocument?: (fileKey: string, batchId?: string) => Promise<void> | void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  item,
  index,
  mergedMessages,
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
  handleConfirmSelection,
  resolveCurrentConflict,
  navigateConflict,
  handleContinueAnyway,
  handleReviewMedicines,
  handleConfirmAndAddMeds,
  handleGenericOptionPress,
  navigation,
  setChatWizardState,
  onViewFullReport,
  onRetryDocument,
}) => {
  const [clientMedId, setClientMedId] = React.useState<string | null>(null);
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
    return mergedMessages[0]?.id === msgId;
  };

  const nextItem = mergedMessages[index + 1];
  let showDateHeader = false;
  if (!nextItem) {
    showDateHeader = true;
  } else if (item.createdAt && nextItem.createdAt) {
    const currentDate = formatUTCDateTime(item.createdAt, "dd-MMM-yyyy", true);
    const prevDate = formatUTCDateTime(nextItem.createdAt, "dd-MMM-yyyy", true);
    if (currentDate !== prevDate) {
      showDateHeader = true;
    }
  } else if (item.createdAt && !nextItem.createdAt) {
    showDateHeader = true;
  }

  const dateHeader =
    showDateHeader && item.createdAt ? (
      <View style={styles.dateHeaderContainer}>
        <View
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isDark ? "#cbd5e1" : "#64748b",
            }}
          >
            {formatUTCDateTime(item.createdAt, "dd-MMM-yyyy", true)}
          </Text>
        </View>
      </View>
    ) : null;

  const { chosenVal, chosenLabel } = findHistoricalUserReply(mergedMessages, item.id, true);
  const isAnswered = chosenVal !== null || chosenLabel !== null;
  const isLatest = isLatestActiveMessage(item.id);
  const isHistorical = isAnswered || !isLatest;
  const isReadOnly = isHistorical || Boolean((item as any).isConfirmed);

  const isComplexStep =
    item.action === "RESOLVE_PROFILE_SOURCE" ||
    item.action === "ASK_UPLOAD_OR_SKIP" ||
    item.action === "MEDICINE_OPTIONS" ||
    item.action === "ADD_MEDICINE" ||
    item.action === "EDIT_MEDICINE" ||
    item.action === "REVIEW_MEDICINES_LIST" ||
    item.action === "ADD_DOCUMENT" ||
    item.action === "ACTION" ||
    (item as any).mode === "ACTION" ||
    item.action === "CONFIRM_MEDICINE" ||
    item.action === "EXTRACTED_MEDICINES" ||
    item.action === "EXTRACTED_MEDICINES_CONFLICTS" ||
    item.action === "EXTRACTED_MEDICINES_CONFIRM" ||
    item.action === "EXTRACTED_MEDICINES_SUCCESS" ||
    item.action === "MEDICINE_SUMMARY" ||
    item.action === "MEDICINE_REVIEW_ACCORDION" ||
    item.action === "EXTRACTED_MEDICINES_PARTIAL_FAILURE" ||
    item.action === "ASK_REPORT";

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
            : (SUGGESTED_QUESTIONS_I18N[preferredLang] || SUGGESTED_QUESTIONS_I18N.english).document;

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
          sendMessage={() => { }}
          state={{}}
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
          handleDocumentUpload={() => { }}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />,
      );
    }
    if (
      item.action === "ADD_MEDICINE" ||
      item.action === "EDIT_MEDICINE"
    ) {
      const med = item.medicine || {};
      return renderAssistantPrompt(
        <AddMedicineCard
          key={item.id}
          med={med}
          isEditingLocal={false}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          currentClientMedId={clientMedId}
          setCurrentClientMedId={setClientMedId}
          onSave={(updatedMed) => {
            handleGenericOptionPress({
              label: `Add medicine: ${updatedMed.name}`,
              value: { medicine: updatedMed },
              actionType: "ADD_MEDICINE",
            });
          }}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />,
      );
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
        handleConfirmSelection();
      };

      const handleAddNew = () => {
        handleGenericOptionPress({ value: "ADD", actionType: "ADD_MEDICINE", label: "Add New" });
      };

      const handleSkipAll = () => {
        handleGenericOptionPress({ value: "SKIP", actionType: "SKIP_MEDICINES", label: "Skip All" });
      };

      const handleEdit = (med: any) => {
        setMedicineToEdit(med);
        setTimeout(() => {
          editSheetRef.current?.present();
        }, 100);
      };

      const setLocalMedicinesWrapper = (updater: any) => {
        if (typeof updater === "function") {
          setChatWizardState((prev: any) => ({
            ...prev,
            extractedMedicines: updater(prev.extractedMedicines || []),
          }));
        } else {
          setChatWizardState((prev: any) => ({
            ...prev,
            extractedMedicines: updater,
          }));
        }
      };

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
                  chosenVal={chosenVal}
                  chosenLabel={chosenLabel}
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
      return renderAssistantPrompt(
        <MedicineOptionsPanel
          optionsList={item.options || []}
          isDark={isDark}
          theme={theme}
          onOptionPress={(opt) => handleGenericOptionPress(opt)}
          readOnly={isHistorical}
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
        <View style={styles.optionsWrapper}>
          <View style={styles.chipsContainer}>
            {item.options?.map((opt: any, idx: number) => {
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={isHistorical}
                  onPress={() => handleGenericOptionPress(opt)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isDark ? "#1e2d2f" : "#ccfbf1",
                      borderColor: isDark ? "#2d4d4f" : "#99f6e4",
                      opacity: isHistorical ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isDark ? "#2dd4bf" : "#0f766e" }]}>
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
};

const styles = StyleSheet.create({
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
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
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipText: {
    fontWeight: "600",
    fontSize: 13,
  },
});
