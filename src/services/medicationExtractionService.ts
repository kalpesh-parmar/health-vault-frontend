import { getOcrStatus } from "./documentService";
import { mapApiDocumentToProcessedDocument } from "../utils/medicationMappers";
import { ProcessedDocument, ExtractedMedicine } from "../types/medicationReview";

import { addMedication } from "./medicationservice";
import { queryClient } from "../config/queryClient";
import { format } from "date-fns";
import { AddOrEditMedication } from "../types";

export const MedicationExtractionService = {
  getExtractedMedicines: async (
    jobIds: string[],
    filesInfo?: { jobId: string; fileName: string; fileKey: string }[]
  ): Promise<ProcessedDocument[]> => {
    const results = await Promise.all(
      jobIds.map(async (jobId): Promise<ProcessedDocument> => {
        const fileInfo = filesInfo?.find((f) => f.jobId === jobId || f.fileKey === jobId) || {
          jobId,
          fileName: `Document_${jobId.slice(0, 6)}.png`,
          fileKey: jobId,
        };

        const targetKey = fileInfo.fileKey || jobId;
        try {
          const response = await getOcrStatus(targetKey);
          const data = response?.data || response;
          return mapApiDocumentToProcessedDocument(data, fileInfo);
        } catch (error) {
          console.warn(`[MedicationExtractionService] Failed to load extraction for ${targetKey}:`, error);
          return {
            id: jobId,
            name: fileInfo.fileName,
            type: "Document",
            status: "FAILED",
            medicines: [],
            summaryEnglish: "",
            summaryPreferred: "",
          };
        }
      })
    );

    return results;
  },

  confirmAndSaveMedicines: async (medicines: ExtractedMedicine[]): Promise<string[]> => {
    console.log("[MedicationExtractionService] Confirming & saving medicines in bulk:", medicines);
    const duplicateIds: string[] = [];

    // Run creation for each medicine sequentially to avoid concurrent database conflicts
    for (const med of medicines) {
      try {
        // Build scheduleObj from medicationSchedule times array
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

        // Build frequency label
        let freqLabel = "Once Daily";
        if (med.frequency === "TWICE" || med.frequency === "Twice Daily") freqLabel = "Twice Daily";
        else if (med.frequency === "THRICE" || med.frequency === "3x Daily") freqLabel = "3x Daily";

        let normalizedFoodFreq = "AFTER_FOOD";
        const rawFood = (med.foodFrequency || med.timing || "AFTER_FOOD").toUpperCase();
        if (rawFood.includes("BEFORE") || rawFood.includes("PRE")) {
          normalizedFoodFreq = "BEFORE_FOOD";
        } else if (rawFood.includes("AFTER") || rawFood.includes("POST")) {
          normalizedFoodFreq = "AFTER_FOOD";
        }

        const payload: AddOrEditMedication = {
          medicationName: med.name.trim(),
          medicationType: (med.medicineType || "TABLET").toUpperCase(),
          prescribedBy: med.prescribedBy || "",
          dosePerIntake: parseFloat(med.dosage || "1") || 1,
          frequency: freqLabel,
          foodFrequency: normalizedFoodFreq,
          startDate: med.startDate ? format(new Date(med.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          ongoing: true,
          medicationSchedule: scheduleObj,
          totalQuantity: med.totalQuantity || 10,
          notes: med.notes || "",
          resolution: med.resolution,
          replaceMedicationId: med.replaceMedicationId,
        };

        await addMedication(payload);
      } catch (medErr: any) {
        if (medErr?.isDuplicate) {
          duplicateIds.push(med.id);
        }
        console.error(`[MedicationExtractionService] Failed to add medicine ${med.name}:`, medErr);
      }
    }

    // Invalidate react-query cache to refresh medications and reminders list
    queryClient.invalidateQueries({ queryKey: ["medications"] });
    queryClient.invalidateQueries({ queryKey: ["allMedications"] });
    queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    queryClient.invalidateQueries({ queryKey: ["allReminders"] });
    queryClient.invalidateQueries({ queryKey: ["todayOccurrences"] });

    return duplicateIds;
  },
};
