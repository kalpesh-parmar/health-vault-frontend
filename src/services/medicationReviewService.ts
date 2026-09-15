import { ProcessedDocument, ExtractedMedicine } from "../types/medicationReview";
import { MedicationExtractionService } from "./medicationExtractionService";

export interface DuplicateGroup {
  name: string;
  hasDifference: boolean;
  medicineIds: string[];
  documents: string[];
}

export interface ProfileConflict {
  extractedMedicine: ExtractedMedicine;
  existingMedication: any;
  conflictType: "EXACT_DUPLICATE" | "SIMILAR_NAME" | "DIFF_DOSAGE";
  reason: string;
}

export const MedicationReviewService = {
  fetchExtractedMedicines: async (
    jobIds: string[],
    filesInfo?: any[]
  ): Promise<ProcessedDocument[]> => {
    return MedicationExtractionService.getExtractedMedicines(jobIds, filesInfo);
  },

  submitMedications: async (medicines: ExtractedMedicine[]): Promise<string[]> => {
    return MedicationExtractionService.confirmAndSaveMedicines(medicines);
  },

  /**
   * Identifies potential duplicate medicines across documents.
   * If dosage, unit, frequency, or timing differs, flags it as hasDifference = true.
   */
  findDuplicates: (medicines: ExtractedMedicine[]): DuplicateGroup[] => {
    const groups: Record<string, ExtractedMedicine[]> = {};

    medicines.forEach((med) => {
      const normalizedName = med.name.trim().toLowerCase();
      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(med);
    });

    const duplicateGroups: DuplicateGroup[] = [];

    Object.entries(groups).forEach(([nameKey, meds]) => {
      if (meds.length > 1) {
        // Compare first medicine with the rest
        const base = meds[0];
        let hasDifference = false;

        for (let i = 1; i < meds.length; i++) {
          const current = meds[i];
          if (
            base.dosage !== current.dosage ||
            base.dosageUnit !== current.dosageUnit ||
            base.frequency !== current.frequency ||
            base.timing !== current.timing
          ) {
            hasDifference = true;
            break;
          }
        }

        const documents = Array.from(new Set(meds.map((m) => m.documentName)));

        duplicateGroups.push({
          name: base.name,
          hasDifference,
          medicineIds: meds.map((m) => m.id),
          documents,
        });
      }
    });

    return duplicateGroups;
  },

  /**
   * Compares extracted medicines against existing medications in user's profile.
   */
  findProfileConflicts: (
    extractedMedicines: ExtractedMedicine[],
    existingMedications: any[]
  ): ProfileConflict[] => {
    if (!existingMedications || existingMedications.length === 0) return [];

    const conflicts: ProfileConflict[] = [];

    extractedMedicines.forEach((med) => {
      const cleanExtractedName = (med.name || "").trim().toLowerCase();
      if (!cleanExtractedName) return;

      const match = existingMedications.find((exist: any) => {
        const existName = (exist.medicationName || exist.name || "").trim().toLowerCase();
        if (!existName) return false;
        return (
          existName === cleanExtractedName ||
          existName.includes(cleanExtractedName) ||
          cleanExtractedName.includes(existName)
        );
      });

      if (match) {
        const existDose = String(match.dosePerIntake || match.dosage || "").trim();
        const medDose = String(med.dosage || "").trim();
        const existFreq = String(match.frequency || "").trim().toLowerCase();
        const medFreq = String(med.frequency || "").trim().toLowerCase();

        const isExact =
          (match.medicationName || match.name || "").trim().toLowerCase() === cleanExtractedName &&
          (!existDose || !medDose || existDose === medDose) &&
          (!existFreq || !medFreq || existFreq === medFreq);

        const isDiffDosage =
          (existDose && medDose && existDose !== medDose) ||
          (existFreq && medFreq && existFreq !== medFreq);

        const conflictType = isExact
          ? "EXACT_DUPLICATE"
          : isDiffDosage
            ? "DIFF_DOSAGE"
            : "SIMILAR_NAME";

        const reason = isExact
          ? "Exact duplicate with same medicine in your profile"
          : isDiffDosage
            ? "Medication already exists in profile with different dosage or frequency"
            : "Similar medicine already exists in your profile";

        conflicts.push({
          extractedMedicine: med,
          existingMedication: match,
          conflictType,
          reason,
        });
      }
    });

    return conflicts;
  },
};
