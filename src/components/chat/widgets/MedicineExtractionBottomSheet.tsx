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
    const { isAllTerminal } = useOcrJobPolling(chatWizardState.jobIds);

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
      const completedCount = uploadingDocs.filter(
        (d) => d.status === "COMPLETED" || d.status === "completed" || d.status === "done" || d.status === "success"
      ).length;
      const inProgressCount = uploadingDocs.filter(
        (d) => d.status === "RUNNING" || d.status === "running" || d.status === "UPLOADING" || d.status === "uploading"
      ).length;
      const queuedCount = uploadingDocs.filter(
        (d) => d.status === "PENDING" || d.status === "pending" || d.status === "queued" || d.status === "QUEUED" || !d.status
      ).length;
      const failedCount = uploadingDocs.filter(
        (d) => d.status === "FAILED" || d.status === "failed" || d.status === "cancelled" || d.status === "CANCELLED"
      ).length;
      const totalCount = uploadingDocs.length;

      return (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* Header Row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: isDark ? "#f8fafc" : "#0f172a" }}>
              Processing Documents
            </Text>
          </View>

          {/* Status Badge Pills Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#064e3b" : "#ecfdf5", borderColor: "#10b981", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#10b981" }}>Completed {completedCount}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#1e3a8a" : "#eff6ff", borderColor: "#3b82f6", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#3b82f6" }}>In progress {inProgressCount}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#334155" : "#f1f5f9", borderColor: "#94a3b8", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="time" size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748b" }}>Queued {queuedCount}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#7f1d1d" : "#fef2f2", borderColor: "#ef4444", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#ef4444" }}>Failed {failedCount}</Text>
              </View>
            </View>
          </ScrollView>

          {/* List of document process rows */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280, marginBottom: 20 }}>
            {uploadingDocs.map((doc, index) => {
              const isFailed = doc.status === "FAILED" || doc.status === "CANCELLED" || doc.status === "failed";
              const isDone = doc.status === "COMPLETED" || doc.status === "completed" || doc.status === "done" || doc.status === "success";
              const progress = doc.progress || 0;

              let stepLabel = "Queued";
              let statusIcon = <Ionicons name="time" size={18} color="#64748b" />;
              let barColor = isDark ? "#475569" : "#cbd5e1";
              let statusTextColor = "#64748b";

              if (doc.status === "UPLOADING" || doc.status === "uploading") {
                stepLabel = "Uploading";
                statusIcon = <ActivityIndicator size="small" color="#3b82f6" style={{ transform: [{ scale: 0.8 }] }} />;
                barColor = "#3b82f6";
                statusTextColor = "#3b82f6";
              } else if (doc.status === "RUNNING" || doc.status === "running") {
                stepLabel = progress <= 50 ? "OCR Extraction" : "Medicine Extraction";
                statusIcon = <ActivityIndicator size="small" color="#3b82f6" style={{ transform: [{ scale: 0.8 }] }} />;
                barColor = "#3b82f6";
                statusTextColor = "#3b82f6";
              } else if (isDone) {
                stepLabel = "Completed";
                statusIcon = <Ionicons name="checkmark-circle" size={18} color="#10b981" />;
                barColor = "#10b981";
                statusTextColor = "#10b981";
              } else if (isFailed) {
                stepLabel = "Failed";
                statusIcon = <Ionicons name="alert-circle" size={18} color="#ef4444" />;
                barColor = "#ef4444";
                statusTextColor = "#ef4444";
              }

              return (
                <View key={doc.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#64748b", width: 22 }}>
                    {index + 1}.
                  </Text>
                  
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#334155" }}>
                      {doc.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: statusTextColor, marginTop: 2, fontWeight: "500" }}>
                      {stepLabel}
                    </Text>
                  </View>

                  <View style={{ marginRight: 12 }}>
                    {statusIcon}
                  </View>

                  <View style={{ flex: 0.6, height: 4, backgroundColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 2, overflow: "hidden", marginRight: 12 }}>
                    <View style={{ height: "100%", width: `${progress}%`, backgroundColor: barColor }} />
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#334155", width: 35, textAlign: "right" }}>
                    {isFailed ? "-" : isDone ? "100%" : `${progress}%`}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
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

      const getExistingDosage = () => {
        return `${exist.dosePerIntake || "1"} ${exist.medicationType?.toLowerCase() || "tablet"}(s)`;
      };

      const getExtractedDosage = () => {
        return `${ext.dosage || "1"} ${ext.dosageUnit || "tablet"}`;
      };

      const currentIndex = chatWizardState.currentConflictIndex;
      const totalConflicts = chatWizardState.conflicts.length;

      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Header Info */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#b91c1c" }}>
              Conflict {currentIndex + 1} of {totalConflicts}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginTop: 4 }}>
              {ext.name}
            </Text>
          </View>

          {/* Grid Comparison */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            {/* Left: Existing */}
            <View style={{ flex: 1, marginRight: 8, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
                Existing in your profile
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
                {exist.medicationName}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {getExistingDosage()}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {exist.frequency || "Once Daily"}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {(exist as any).duration || (exist.totalQuantity ? `${exist.totalQuantity} Days` : "Ongoing")}
              </Text>
            </View>

            {/* Right: New Extracted */}
            <View style={{ flex: 1, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
                Newly extracted
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
                {ext.name}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {getExtractedDosage()}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {(() => {
                  const freq = ext.frequency || "ONCE";
                  if (freq === "ONCE") return "Once Daily";
                  if (freq === "TWICE") return "Twice Daily";
                  if (freq === "THRICE") return "3x Daily";
                  return freq;
                })()}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {(ext as any).duration || "30 Days"}
              </Text>
            </View>
          </View>

          {/* Reason */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginBottom: 4 }}>
              Reason
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#475569", fontStyle: "italic" }}>
              Duplicate medicine with same strength and frequency
            </Text>
          </View>

          {/* Resolution Choice Buttons */}
          <View style={{ marginBottom: 16 }}>
            {/* Row 1: Solid blue buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => resolveCurrentConflict("keep")}
                style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                  Keep Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resolveCurrentConflict("replace")}
                style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                  Replace
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Outlined buttons */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                onPress={() => setMedicineToEdit(ext)}
                style={{ flex: 1, borderColor: "#2563eb", borderWidth: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#2563eb", fontWeight: "bold", fontSize: 12 }}>
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resolveCurrentConflict("remove_new")}
                style={{ flex: 1.2, borderColor: "#fca5a5", borderWidth: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 12 }}>
                  Remove New
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Pager */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, marginBottom: 12 }}>
            <TouchableOpacity
              disabled={currentIndex === 0}
              onPress={() => {
                setChatWizardState(prev => ({
                  ...prev,
                  currentConflictIndex: Math.max(0, prev.currentConflictIndex - 1)
                }));
              }}
              style={{ opacity: currentIndex === 0 ? 0.3 : 1, padding: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
            </TouchableOpacity>

            <Text style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#475569" }}>
              {currentIndex + 1} of {totalConflicts}
            </Text>

            <TouchableOpacity
              disabled={currentIndex === totalConflicts - 1}
              onPress={() => {
                setChatWizardState(prev => ({
                  ...prev,
                  currentConflictIndex: Math.min(totalConflicts - 1, prev.currentConflictIndex + 1)
                }));
              }}
              style={{ opacity: currentIndex === totalConflicts - 1 ? 0.3 : 1, padding: 8 }}
            >
              <Ionicons name="chevron-forward" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
            </TouchableOpacity>
          </View>
        </View>
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

    const renderStepContent = () => {
      switch (chatWizardState.step) {
        case "processing":
          return renderProcessingStep();
        case "results":
          return renderResultsStep();
        case "conflicts":
          return renderConflictsStep();
        case "summary":
          return renderSummaryStep();
        case "completed":
          return renderCompletedStep();
        default:
          if (isUploading) return renderProcessingStep();
          return null;
      }
    };

    const hasContent = chatWizardState.step !== "idle" || isUploading;
    if (!hasContent) return null;

    return (
      <BottomSheet ref={ref}>
        <View style={{ paddingBottom: bottomPadding }}>
          {renderStepContent()}
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
