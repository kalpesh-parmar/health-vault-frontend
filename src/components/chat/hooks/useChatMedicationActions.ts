import { useState, useCallback } from "react";
import Toast from "react-native-toast-message";
import {
  checkMedicationDuplicate,
  listMedications,
  addMedication,
  updateMedication,
} from "../../../services/medicationservice";
import { ExtractedMedicine } from "../../../types/medicationReview";
import { AddOrEditMedication } from "../../../types";
import { getTodayDateString } from "../ChatDateUtils";

export interface ChatWizardState {
  step:
    | "idle"
    | "upload"
    | "processing"
    | "results"
    | "conflicts"
    | "summary"
    | "done";
  filesInfo: any[];
  jobIds: string[];
  extractedMedicines: ExtractedMedicine[];
  conflicts: any[];
  currentConflictIndex: number;
  resolvedMedicines: ExtractedMedicine[];
  replaceList: { existingId: string; extractedMedicine: ExtractedMedicine }[];
  mergeList: { existingId: string; mergedMedication: AddOrEditMedication }[];
  summaries: any[];
}

export const buildMedicationPayload = (
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
    startDate:
      med.startDate && med.startDate !== "None"
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

export interface UseChatMedicationActionsProps {
  preferredLang: string;
  queryClient: any;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  editSheetRef: React.RefObject<any>;
  setMedicineToEdit: (med: ExtractedMedicine | null) => void;
}

export const useChatMedicationActions = ({
  preferredLang,
  queryClient,
  setMessages,
  editSheetRef,
  setMedicineToEdit,
}: UseChatMedicationActionsProps) => {
  const [chatWizardState, setChatWizardState] = useState<ChatWizardState>({
    step: "idle",
    filesInfo: [],
    jobIds: [],
    extractedMedicines: [],
    conflicts: [],
    currentConflictIndex: 0,
    resolvedMedicines: [],
    replaceList: [],
    mergeList: [],
    summaries: [],
  });

  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isConfirmingMeds, setIsConfirmingMeds] = useState(false);
  const [failedSubmissions, setFailedSubmissions] = useState<any[]>([]);

  const handleEditSave = useCallback(
    (updated: ExtractedMedicine) => {
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
          .filter((msg: any) => msg.action !== "EDIT_MEDICINE")
          .map((msg: any) => {
            if (msg.medicines?.length) {
              return {
                ...msg,
                medicines: msg.medicines.map((m: any) =>
                  m.id === updated.id ? updated : m,
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
          }),
      );

      editSheetRef.current?.dismiss();
      setMedicineToEdit(null);

      Toast.show({
        type: "success",
        text1: "Medicine Updated",
        text2: `${updated.name} has been updated in the list.`,
      });
    },
    [chatWizardState.extractedMedicines, editSheetRef, setMedicineToEdit, setMessages],
  );

  const navigateConflict = useCallback((direction: "prev" | "next") => {
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
  }, []);

  return {
    chatWizardState,
    setChatWizardState,
    isLoadingResults,
    setIsLoadingResults,
    isConfirmingMeds,
    setIsConfirmingMeds,
    failedSubmissions,
    setFailedSubmissions,
    handleEditSave,
    navigateConflict,
    buildMedicationPayload,
  };
};
