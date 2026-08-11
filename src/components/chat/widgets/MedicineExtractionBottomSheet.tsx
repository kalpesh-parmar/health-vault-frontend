import React, { useState, useEffect, useMemo, forwardRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useOcrJobPolling } from "../../../hooks/useOcrJobPolling";
import { useDocumentUpload } from "../../../context/DocumentUploadContext";
import { MedicationReviewService } from "../../../services/medicationReviewService";
import { listMedications, updateMedication } from "../../../services/medicationservice";
import { ExtractedMedicine } from "../../../types/medicationReview";
import { AddOrEditMedication } from "../../../types";
import { queryClient } from "../../../config/queryClient";
import BottomSheet from "../../shared/BottomSheet";
import { useMedicationFormState, MedicationFormFields } from "../../shared/MedicationFormFields";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";

interface MedicineExtractionBottomSheetProps {
  preferredLang: string;
  isDark: boolean;
}

interface EditMedicineModalProps {
  medicine: ExtractedMedicine | null;
  preferredLang: string;
  isDark: boolean;
  onClose: () => void;
  onSave: (updated: ExtractedMedicine) => void;
}

const EditMedicineModal = ({ medicine, preferredLang, isDark, onClose, onSave }: EditMedicineModalProps) => {
  if (!medicine) return null;

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
      startDate: medicine.startDate || new Date().toISOString().split("T")[0],
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

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    onSave({
      ...medicine,
      name: formName.trim(),
      medicineType: formType,
      dosage: formType === "TABLET" || formType === "CAPSULE" ? String(formCount) : String(formVal),
      dosageUnit: formType === "TABLET" || formType === "CAPSULE" ? (formType === "TABLET" ? "tablet" : "capsule") : formUnit,
      frequency: formFreq,
      foodFrequency: formFoodFreq,
      timing: formFoodFreq === "BEFORE_FOOD" ? "Before Food" : "After Food",
      prescribedBy: formPrescribed.trim(),
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
      refillAlert: formRefill,
      refillAlertEnabled: formRefill,
      medicationSchedule: selectedSlots,
      startDate: startDate ? (startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate) : new Date().toISOString().split("T")[0],
    });
  };

  return (
    <ModalContainer>
      <ModalBackdrop onPress={onClose} />
      <ModalContentCard isDark={isDark}>
        <ModalHeader>
          <ModalTitle isDark={isDark}>Edit Medicine</ModalTitle>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
        </ModalHeader>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          <MedicationFormFields formState={formState} isDark={isDark} theme={{}} preferredLang={preferredLang} />
          {localErrors.length > 0 && (
            <ErrorWrapper>
              {localErrors.map((err, idx) => (
                <Text key={idx} style={{ color: "#ef4444", fontSize: 12 }}>
                  • {err}
                </Text>
              ))}
            </ErrorWrapper>
          )}
        </ScrollView>
        <SaveButton onPress={handleSave}>
          <SaveButtonText>Save Changes</SaveButtonText>
        </SaveButton>
      </ModalContentCard>
    </ModalContainer>
  );
};

export const MedicineExtractionBottomSheet = forwardRef<any, MedicineExtractionBottomSheetProps>(
  ({ preferredLang, isDark }, ref) => {
    const { chatWizardState, setChatWizardState, resetChatWizard, uploadingDocs, isUploading } = useDocumentUpload();
    const bottomPadding = useBottomBarPadding(16, 8);

    const t = (key: string, replacements?: Record<string, string | number>) => {
      const lang = preferredLang || "english";
      const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
      let str = dict[key] || I18N_ONBOARDING_UI.english[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    };

    // OCR Job Polling Hook
    const { jobList, isAllTerminal } = useOcrJobPolling(chatWizardState.jobIds);

    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [medicineToEdit, setMedicineToEdit] = useState<ExtractedMedicine | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (isAllTerminal && chatWizardState.step === "results" && chatWizardState.jobIds.length > 0 && !chatWizardState.hasViewedCompletedOcr) {
        setChatWizardState((prev) => ({
          ...prev,
          hasViewedCompletedOcr: true,
        }));
      }
    }, [isAllTerminal, chatWizardState.step, chatWizardState.jobIds, chatWizardState.hasViewedCompletedOcr]);

    // Conversational transitions are handled by AIChatScreen.tsx

    const handleContinueToConflicts = async () => {
      try {
        setIsLoadingResults(true);
        const existingRes = await listMedications();
        const existingMeds = existingRes.data || existingRes || [];

        const conflictsList: any[] = [];
        const newMedsList: ExtractedMedicine[] = [];

        chatWizardState.extractedMedicines.forEach((extracted) => {
          const duplicate = existingMeds.find((existing) => 
            existing.medicationName.trim().toLowerCase() === extracted.name.trim().toLowerCase()
          );
          if (duplicate) {
            conflictsList.push({
              extractedMedicine: extracted,
              existingMedication: duplicate,
            });
          } else {
            newMedsList.push(extracted);
          }
        });

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
        } else {
          setChatWizardState((prev) => ({
            ...prev,
            step: "summary",
            conflicts: [],
            currentConflictIndex: 0,
            resolvedMedicines: chatWizardState.extractedMedicines,
            replaceList: [],
            mergeList: [],
          }));
        }
      } catch (err) {
        console.error("Failed to search duplicates:", err);
        setChatWizardState((prev) => ({
          ...prev,
          step: "summary",
          resolvedMedicines: chatWizardState.extractedMedicines,
        }));
      } finally {
        setIsLoadingResults(false);
      }
    };

    const resolveCurrentConflict = (
      resolution: "keep" | "replace" | "merge" | "remove_new",
      mergedPayload?: AddOrEditMedication
    ) => {
      setChatWizardState((prev) => {
        const nextIndex = prev.currentConflictIndex + 1;
        const nextStep = nextIndex === prev.conflicts.length ? "summary" : "conflicts";

        let nextResolved = [...prev.resolvedMedicines];
        let nextReplaceList = [...prev.replaceList];
        let nextMergeList = [...prev.mergeList];

        const currentConflict = prev.conflicts[prev.currentConflictIndex];

        if (resolution === "replace") {
          nextReplaceList.push({
            existingId: currentConflict.existingMedication.id!,
            extractedMedicine: currentConflict.extractedMedicine,
          });
        } else if (resolution === "merge" && mergedPayload) {
          nextMergeList.push({
            existingId: currentConflict.existingMedication.id!,
            mergedMedication: mergedPayload,
          });
        }

        return {
          ...prev,
          currentConflictIndex: nextIndex,
          step: nextStep,
          resolvedMedicines: nextResolved,
          replaceList: nextReplaceList,
          mergeList: nextMergeList,
        };
      });
    };

    const buildMedicationPayload = (med: ExtractedMedicine): AddOrEditMedication => {
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
      if (med.frequency === "TWICE" || med.frequency === "Twice Daily") freqLabel = "Twice Daily";
      else if (med.frequency === "THRICE" || med.frequency === "3x Daily") freqLabel = "3x Daily";

      let normalizedFoodFreq = "AFTER_FOOD";
      const rawFood = (med.foodFrequency || med.timing || "AFTER_FOOD").toUpperCase();
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
        startDate: med.startDate ? med.startDate : new Date().toISOString().split("T")[0],
        ongoing: true,
        medicationSchedule: scheduleObj,
        totalQuantity: med.totalQuantity || 10,
        notes: med.notes || "",
      };
    };

    const handleConfirmAndAdd = async () => {
      setIsSubmitting(true);
      try {
        // 1. Add all new non-conflict medicines (calls addMedication and createMedicationReminder)
        const newMeds = chatWizardState.resolvedMedicines;
        if (newMeds.length > 0) {
          await MedicationReviewService.submitMedications(newMeds);
        }

        // 2. Perform Replace updates & create reminder
        for (const replaceItem of chatWizardState.replaceList) {
          const payload = buildMedicationPayload(replaceItem.extractedMedicine);
          await updateMedication({
            medicationId: replaceItem.existingId,
            data: payload,
          });
        }

        // 3. Perform Merge updates & create reminder
        for (const mergeItem of chatWizardState.mergeList) {
          await updateMedication({
            medicationId: mergeItem.existingId,
            data: mergeItem.mergedMedication,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["medications"] });
        queryClient.invalidateQueries({ queryKey: ["allMedications"] });
        queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
        queryClient.invalidateQueries({ queryKey: ["todayReminders"] });

        setChatWizardState((prev) => ({
          ...prev,
          step: "completed",
        }));
      } catch (err) {
        console.error("Failed to confirm and add medicines:", err);
        Alert.alert("Error", "Failed to save medications. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleEditSave = (updated: ExtractedMedicine) => {
      setChatWizardState((prev) => {
        const updatedExtracted = prev.extractedMedicines.map((m) =>
          m.id === updated.id ? updated : m
        );

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
      setMedicineToEdit(null);
    };

    const handleDismissSuccess = () => {
      resetChatWizard();
      (ref as any).current?.dismiss();
    };

    // STEP RENDERING LOGIC
    const renderProcessingStep = () => {
      return (
        <StepWrapper style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <StepTitle isDark={isDark}>{isUploading ? "Uploading Documents" : t("processingDocs")}</StepTitle>
          <StepSubtitle>{isUploading ? "Uploading your files to our secure servers..." : t("processingSub")}</StepSubtitle>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {uploadingDocs.map((doc) => {
              const isFailed = doc.status === "FAILED" || doc.status === "CANCELLED" || doc.status === "failed";
              const isDone = doc.status === "COMPLETED" || doc.status === "completed" || doc.status === "done" || doc.status === "success";
              const progress = doc.progress || 0;

              let stepLabel = "Queued";
              if (doc.status === "UPLOADING") {
                stepLabel = "Uploading...";
              } else if (doc.status === "RUNNING") {
                stepLabel = progress <= 50 ? "OCR Processing" : "Medicine Extraction";
              } else if (isDone) {
                stepLabel = "Completed";
              } else if (isFailed) {
                stepLabel = "Failed";
              }

              return (
                <DocProgressRow key={doc.id} isDark={isDark}>
                  <DocHeaderRow>
                    <Ionicons name="document-text-outline" size={18} color="#0f766e" style={{ marginRight: 8 }} />
                    <DocName numberOfLines={1} isDark={isDark}>
                      {doc.name}
                    </DocName>
                    <ProgressPercentage isFailed={isFailed} isDone={isDone}>
                      {isFailed ? "Failed" : isDone ? "Completed" : `${progress}%`}
                    </ProgressPercentage>
                  </DocHeaderRow>
                  <ProgressSubtext>{stepLabel}</ProgressSubtext>
                  <ProgressBarContainer isDark={isDark}>
                    <ProgressBarFill progress={progress} isFailed={isFailed} />
                  </ProgressBarContainer>
                </DocProgressRow>
              );
            })}
          </ScrollView>
        </StepWrapper>
      );
    };

    const renderResultsStep = () => {
      const meds = chatWizardState.extractedMedicines;
      const hasMeds = meds.length > 0;

      if (isLoadingResults) {
        return (
          <LoadingWrapper>
            <ActivityIndicator size="small" color="#0f766e" />
            <LoadingText>Analyzing extraction results...</LoadingText>
          </LoadingWrapper>
        );
      }

      if (!hasMeds) {
        return (
          <EmptyWrapper>
            <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
            <EmptyText>No medicines were found in the uploaded documents.</EmptyText>
            <ActionButton onPress={handleDismissSuccess}>
              <ActionButtonText>Close</ActionButtonText>
            </ActionButton>
          </EmptyWrapper>
        );
      }

      return (
        <StepWrapper style={{ paddingHorizontal: 16 }}>
          <StepTitle isDark={isDark}>{t("medicinesExtracted", { count: meds.length })}</StepTitle>
          <StepSubtitle>{t("reviewExtractedSub")}</StepSubtitle>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {meds.map((med) => {
              const confidence = med.confidence ? Math.round(med.confidence * 100) : 85;
              const isHighConfidence = confidence >= 80;

              return (
                <MedicineResultCard key={med.id} isDark={isDark}>
                  <MedicineResultHeader>
                    <View style={{ flex: 1 }}>
                      <MedicineNameText isDark={isDark} numberOfLines={1}>
                        {med.name}
                      </MedicineNameText>
                      {(med as any).genericName ? (
                        <MedicineGenericText numberOfLines={1}>{(med as any).genericName}</MedicineGenericText>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => setMedicineToEdit(med)}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color="#64748b" />
                    </TouchableOpacity>
                  </MedicineResultHeader>
                  <MedicineMetaRow>
                    <MetaItem>
                      <MetaLabel>Dosage</MetaLabel>
                      <MetaVal isDark={isDark}>
                        {med.dosage || "1"} {med.dosageUnit || "tablet"}
                      </MetaVal>
                    </MetaItem>
                    <MetaItem>
                      <MetaLabel>Frequency</MetaLabel>
                      <MetaVal isDark={isDark}>
                        {med.frequency === "ONCE" ? t("frequency.ONCE") : med.frequency === "TWICE" ? t("frequency.TWICE") : med.frequency === "THRICE" ? t("frequency.THRICE") : med.frequency}
                      </MetaVal>
                    </MetaItem>
                    <MetaItem>
                      <MetaLabel>Confidence</MetaLabel>
                      <ConfidenceBadge isHigh={isHighConfidence}>{confidence}%</ConfidenceBadge>
                    </MetaItem>
                  </MedicineMetaRow>
                </MedicineResultCard>
              );
            })}
          </ScrollView>
          <ActionButton onPress={handleContinueToConflicts}>
            <ActionButtonText>{t("confirmSelection")}</ActionButtonText>
          </ActionButton>
        </StepWrapper>
      );
    };

    const renderConflictsStep = () => {
      const conflict = chatWizardState.conflicts[chatWizardState.currentConflictIndex];
      if (!conflict) return null;

      const ext = conflict.extractedMedicine;
      const exist = conflict.existingMedication;

      const mergedNotes = `${exist.notes || ""}\n${ext.notes || ""}`.trim();
      const extPayload = buildMedicationPayload(ext);
      const mergedPayload: AddOrEditMedication = {
        ...exist,
        notes: mergedNotes,
        medicationSchedule: extPayload.medicationSchedule,
      };

      return (
        <StepWrapper style={{ paddingHorizontal: 16 }}>
          <StepTitle isDark={isDark}>
            {t("conflictResolution", { current: chatWizardState.currentConflictIndex + 1, total: chatWizardState.conflicts.length })}
          </StepTitle>
          <StepSubtitle>
            {t("duplicateDetectedSub", { name: ext.name })}
          </StepSubtitle>

          <ComparisonGrid>
            <CompareColumn isDark={isDark}>
              <ColumnTitle>Existing Medication</ColumnTitle>
              <CompareValName isDark={isDark}>{exist.medicationName}</CompareValName>
              <CompareMeta>Dose: {exist.dosePerIntake} {exist.unit || "unit"}</CompareMeta>
              <CompareMeta>Freq: {exist.frequency}</CompareMeta>
              {exist.notes ? <CompareNotes numberOfLines={2}>Notes: {exist.notes}</CompareNotes> : null}
            </CompareColumn>
            <CompareColumn isDark={isDark}>
              <ColumnTitle>New Extracted</ColumnTitle>
              <CompareValName isDark={isDark}>{ext.name}</CompareValName>
              <CompareMeta>Dose: {ext.dosage} {ext.dosageUnit}</CompareMeta>
              <CompareMeta>Freq: {ext.frequency === "ONCE" ? t("frequency.ONCE") : ext.frequency === "TWICE" ? t("frequency.TWICE") : ext.frequency === "THRICE" ? t("frequency.THRICE") : ext.frequency}</CompareMeta>
              {ext.notes ? <CompareNotes numberOfLines={2}>Notes: {ext.notes}</CompareNotes> : null}
            </CompareColumn>
          </ComparisonGrid>

          <ActionButtonsRow>
            <OptionButton onPress={() => resolveCurrentConflict("keep")} isDark={isDark}>
              <OptionButtonText isDark={isDark}>{t("keepExisting")}</OptionButtonText>
            </OptionButton>
            <OptionButton onPress={() => resolveCurrentConflict("replace")} isDark={isDark}>
              <OptionButtonText isDark={isDark}>{t("replace")}</OptionButtonText>
            </OptionButton>
          </ActionButtonsRow>
          <ActionButtonsRow style={{ marginTop: 8 }}>
            <OptionButton onPress={() => resolveCurrentConflict("merge", mergedPayload)} isDark={isDark}>
              <OptionButtonText isDark={isDark}>{t("merge")}</OptionButtonText>
            </OptionButton>
            <OptionButton onPress={() => setMedicineToEdit(ext)} isDark={isDark}>
              <OptionButtonText isDark={isDark}>{t("editDetails")}</OptionButtonText>
            </OptionButton>
          </ActionButtonsRow>
          <CancelLinkRow>
            <TouchableOpacity onPress={() => resolveCurrentConflict("remove_new")}>
              <CancelLinkText>{t("discardNewMedicine")}</CancelLinkText>
            </TouchableOpacity>
          </CancelLinkRow>
        </StepWrapper>
      );
    };

    const renderSummaryStep = () => {
      const docsCount = chatWizardState.filesInfo.length;
      const medsCount = chatWizardState.extractedMedicines.length;
      const conflictsCount = chatWizardState.conflicts.length;
      const readyCount = chatWizardState.resolvedMedicines.length + chatWizardState.replaceList.length + chatWizardState.mergeList.length;

      return (
        <StepWrapper style={{ paddingHorizontal: 16 }}>
          <StepTitle isDark={isDark}>{t("finalConfirmation")}</StepTitle>
          <StepSubtitle>{t("verifySummarySub")}</StepSubtitle>

          <SummaryRowItem>
            <SummaryLabel>{t("docsProcessed")}</SummaryLabel>
            <SummaryValue isDark={isDark}>{docsCount}</SummaryValue>
          </SummaryRowItem>
          <SummaryRowItem>
            <SummaryLabel>{t("medsExtractedLabel")}</SummaryLabel>
            <SummaryValue isDark={isDark}>{medsCount}</SummaryValue>
          </SummaryRowItem>
          {conflictsCount > 0 && (
            <SummaryRowItem>
              <SummaryLabel>{t("duplicateConflictsResolved")}</SummaryLabel>
              <SummaryValue isDark={isDark}>{conflictsCount}</SummaryValue>
            </SummaryRowItem>
          )}
          <SummaryRowItem>
            <SummaryLabel>{t("medsReadyToAdd")}</SummaryLabel>
            <SummaryValue isDark={isDark} style={{ fontWeight: "800", color: "#10b981" }}>
              {readyCount}
            </SummaryValue>
          </SummaryRowItem>

          <ActionButton onPress={handleConfirmAndAdd} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ActionButtonText>{t("confirmAndAddMeds")}</ActionButtonText>
            )}
          </ActionButton>
        </StepWrapper>
      );
    };

    const renderCompletedStep = () => {
      return (
        <SuccessWrapper style={{ paddingHorizontal: 16 }}>
          <Ionicons name="checkmark-circle" size={56} color="#10b981" />
          <SuccessTitle isDark={isDark}>{t("medicinesAddedSuccess")}</SuccessTitle>
          <SuccessSubtitle>{t("successSubtitle")}</SuccessSubtitle>

          {chatWizardState.summaries && chatWizardState.summaries.length > 0 && (
            <SummaryCardContainer isDark={isDark}>
              <SummaryHeaderRow>
                <Ionicons name="document-text" size={16} color="#0f766e" />
                <SummaryHeaderText isDark={isDark}>Document Summary</SummaryHeaderText>
              </SummaryHeaderRow>
              {chatWizardState.summaries.map((sumItem, idx) => (
                <SummaryTextGroup key={idx}>
                  <DocLabelText isDark={isDark}>{sumItem.docName}</DocLabelText>
                  <DocSummaryText isDark={isDark}>{sumItem.summary}</DocSummaryText>
                </SummaryTextGroup>
              ))}
            </SummaryCardContainer>
          )}

          <ActionButton onPress={handleDismissSuccess} style={{ width: "100%", marginTop: 16 }}>
            <ActionButtonText>Awesome</ActionButtonText>
          </ActionButton>
        </SuccessWrapper>
      );
    };

    if (chatWizardState.step !== "processing" && !isUploading) return null;

    return (
      <BottomSheet ref={ref}>
        <View style={{ paddingBottom: bottomPadding }}>
          {renderProcessingStep()}
        </View>
      </BottomSheet>
    );
  }
);

export default MedicineExtractionBottomSheet;

/* --- Styled Components --- */

const StepWrapper = styled.View`
  width: 100%;
`;

const StepTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#0f172a")};
`;

const StepSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  margin-bottom: 16px;
`;

const DocProgressRow = styled.View<{ isDark: boolean }>`
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 14px;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.03)" : "#f8fafc")};
`;

const DocHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 6px;
`;

const DocName = styled.Text<{ isDark: boolean }>`
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: ${(props: any) => (props.isDark ? "#e2e8f0" : "#334155")};
`;

const ProgressPercentage = styled.Text<{ isFailed: boolean; isDone: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props: any) => (props.isFailed ? "#ef4444" : props.isDone ? "#10b981" : "#0ea5e9")};
`;

const ProgressSubtext = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-left: 26px;
  margin-bottom: 6px;
`;

const ProgressBarContainer = styled.View<{ isDark: boolean }>`
  height: 6px;
  border-radius: 3px;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0")};
  overflow: hidden;
  margin-left: 26px;
`;

const ProgressBarFill = styled.View<{ progress: number; isFailed: boolean }>`
  height: 100%;
  width: ${(props: any) => `${props.progress}%`};
  border-radius: 3px;
  background-color: ${(props: any) => (props.isFailed ? "#ef4444" : "#0f766e")};
`;

const LoadingWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const LoadingText = styled.Text`
  margin-top: 12px;
  font-size: 14px;
  color: #64748b;
`;

const EmptyWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const EmptyText = styled.Text`
  text-align: center;
  margin-vertical: 16px;
  font-size: 14px;
  color: #64748b;
`;

const MedicineResultCard = styled.View<{ isDark: boolean }>`
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.03)" : "#f8fafc")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0")};
`;

const MedicineResultHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const MedicineNameText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f1f5f9" : "#1e293b")};
`;

const MedicineGenericText = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 1px;
`;

const MedicineMetaRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const MetaItem = styled.View`
  flex: 1;
`;

const MetaLabel = styled.Text`
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
`;

const MetaVal = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
  margin-top: 1px;
`;

const ConfidenceBadge = styled.Text<{ isHigh: boolean }>`
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  color: ${(props: any) => (props.isHigh ? "#10b981" : "#f59e0b")};
  margin-top: 1px;
`;

const ActionButton = styled.TouchableOpacity`
  background-color: #0f766e;
  border-radius: 14px;
  padding: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
`;

const ActionButtonText = styled.Text`
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
`;

const ComparisonGrid = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 10px;
`;

const CompareColumn = styled.View<{ isDark: boolean }>`
  flex: 1;
  border-radius: 14px;
  padding: 12px;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.03)" : "#f8fafc")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0")};
`;

const ColumnTitle = styled.Text`
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const CompareValName = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f1f5f9" : "#1e293b")};
  margin-bottom: 6px;
`;

const CompareMeta = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-bottom: 3px;
`;

const CompareNotes = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
`;

const ActionButtonsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
`;

const OptionButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex: 1;
  border-radius: 12px;
  padding: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0")};
`;

const OptionButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
`;

const CancelLinkRow = styled.View`
  align-items: center;
  margin-top: 16px;
`;

const CancelLinkText = styled.Text`
  font-size: 13px;
  color: #ef4444;
  font-weight: 600;
`;

const SummaryRowItem = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(0,0,0,0.04);
`;

const SummaryLabel = styled.Text`
  font-size: 14px;
  color: #64748b;
`;

const SummaryValue = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#1e293b")};
`;

const SuccessWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const SuccessTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#0f172a")};
  margin-top: 12px;
`;

const SuccessSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  text-align: center;
  margin-top: 6px;
  margin-bottom: 16px;
`;

const SummaryCardContainer = styled.View<{ isDark: boolean }>`
  width: 100%;
  border-radius: 16px;
  padding: 14px;
  margin-top: 8px;
  background-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.02)" : "#f8fafc")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0")};
`;

const SummaryHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(15, 118, 110, 0.15);
  padding-bottom: 8px;
`;

const SummaryHeaderText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#0f766e")};
  margin-left: 6px;
  text-transform: uppercase;
`;

const SummaryTextGroup = styled.View`
  margin-bottom: 12px;
`;

const DocLabelText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#475569")};
  margin-bottom: 2px;
`;

const DocSummaryText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  line-height: 18px;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#334155")};
`;

// Inline edit modal components

const ModalContainer = styled.View`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalBackdrop = styled.TouchableOpacity`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.4);
`;

const ModalContentCard = styled.View<{ isDark: boolean }>`
  width: 92%;
  border-radius: 24px;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#ffffff")};
  padding: 16px;
  shadow-color: #000;
  shadow-opacity: 0.15;
  shadow-radius: 12px;
  elevation: 5;
  z-index: 1001;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#1e293b")};
`;

const ErrorWrapper = styled.View`
  margin-top: 8px;
  margin-bottom: 12px;
`;

const SaveButton = styled.TouchableOpacity`
  background-color: #0f766e;
  border-radius: 14px;
  padding: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
`;

const SaveButtonText = styled.Text`
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
`;
