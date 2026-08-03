import { ProcessedDocument, ExtractedMedicine } from "../types/medicationReview";
import { MedicationExtractionService } from "./medicationExtractionService";

export interface DuplicateGroup {
  name: string;
  hasDifference: boolean;
  medicineIds: string[];
  documents: string[];
}

export const MedicationReviewService = {
  fetchExtractedMedicines: async (
    jobIds: string[],
    filesInfo?: any[]
  ): Promise<ProcessedDocument[]> => {
    return MedicationExtractionService.getExtractedMedicines(jobIds, filesInfo);
  },

  submitMedications: async (medicines: ExtractedMedicine[]): Promise<void> => {
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
};
