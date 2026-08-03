import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { ProcessedDocument, ExtractedMedicine } from "../types/medicationReview";
import { MedicationReviewService, DuplicateGroup } from "../services/medicationReviewService";

interface MedicationReviewContextType {
  documents: ProcessedDocument[];
  medicines: ExtractedMedicine[];
  selectedMedicineIds: string[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  duplicateGroups: DuplicateGroup[];
  initializeReview: (jobIds: string[], filesInfo?: any[]) => Promise<void>;
  toggleMedicineSelection: (id: string) => void;
  updateMedicineDraft: (medicine: ExtractedMedicine) => void;
  saveReview: () => Promise<void>;
  clearReviewState: () => void;
}

const MedicationReviewContext = createContext<MedicationReviewContextType | undefined>(undefined);

export const useMedicationReview = () => {
  const context = useContext(MedicationReviewContext);
  if (!context) {
    throw new Error("useMedicationReview must be used within a MedicationReviewProvider");
  }
  return context;
};

export const MedicationReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize review data from the service layer using job IDs
  const initializeReview = useCallback(async (jobIds: string[], filesInfo?: any[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await MedicationReviewService.fetchExtractedMedicines(jobIds, filesInfo);
      setDocuments(data);
      
      const flatMeds = data.reduce<ExtractedMedicine[]>((acc, doc) => {
        return [...acc, ...doc.medicines];
      }, []);
      
      setMedicines(flatMeds);
      
      // Auto-select medicines with >= 80% confidence
      const defaultSelected = flatMeds
        .filter((med) => med.selected)
        .map((med) => med.id);
      
      setSelectedMedicineIds(defaultSelected);
    } catch (err: any) {
      console.error("[MedicationReviewContext] Failed to initialize:", err);
      setError(err.message || "Failed to load extracted medicines.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Compute duplicate groups based on flat list of medicines
  const duplicateGroups = useMemo(() => {
    return MedicationReviewService.findDuplicates(medicines);
  }, [medicines]);

  // Toggle selection status
  const toggleMedicineSelection = useCallback((id: string) => {
    setMedicines((prevMeds) => {
      const targetMed = prevMeds.find((m) => m.id === id);
      if (!targetMed) return prevMeds;

      const newSelectedState = !targetMed.selected;

      // Find if this is an identical duplicate (same name, dosage, frequency, timing)
      const identicalMeds = prevMeds.filter(
        (m) =>
          m.name.trim().toLowerCase() === targetMed.name.trim().toLowerCase() &&
          m.dosage === targetMed.dosage &&
          m.dosageUnit === targetMed.dosageUnit &&
          m.frequency === targetMed.frequency &&
          m.timing === targetMed.timing
      );

      // Update the selection state of the medicine(s)
      const updatedMeds = prevMeds.map((m) => {
        const isIdentical = identicalMeds.some((im) => im.id === m.id);
        if (isIdentical) {
          return { ...m, selected: newSelectedState };
        }
        return m;
      });

      // Synchronize selectedMedicineIds array
      setSelectedMedicineIds((prevSelected) => {
        const otherSelected = prevSelected.filter(
          (sid) => !identicalMeds.some((im) => im.id === sid)
        );
        if (newSelectedState) {
          return [...otherSelected, ...identicalMeds.map((im) => im.id)];
        }
        return otherSelected;
      });

      // Keep documents list in sync
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => ({
          ...doc,
          medicines: doc.medicines.map((m) => {
            const isIdentical = identicalMeds.some((im) => im.id === m.id);
            if (isIdentical) {
              return { ...m, selected: newSelectedState };
            }
            return m;
          }),
        }))
      );

      return updatedMeds;
    });
  }, []);

  // Update a single medicine fields (Screen 7 edit save)
  const updateMedicineDraft = useCallback((updatedMedicine: ExtractedMedicine) => {
    setMedicines((prevMeds) => {
      const nextMeds = prevMeds.map((m) => {
        if (m.id === updatedMedicine.id) {
          return { ...updatedMedicine };
        }
        return m;
      });

      // Keep documents list in sync
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => {
          if (doc.id === updatedMedicine.documentId) {
            return {
              ...doc,
              medicines: doc.medicines.map((m) =>
                m.id === updatedMedicine.id ? { ...updatedMedicine } : m
              ),
            };
          }
          return doc;
        })
      );

      return nextMeds;
    });
  }, []);

  // Bulk confirm and save to backend
  const saveReview = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const activeMedicines = medicines.filter((m) => m.selected);
      
      // Deduplicate identical medicines for final submission to prevent double entry
      const uniqueMedicinesMap: Record<string, ExtractedMedicine> = {};
      activeMedicines.forEach((med) => {
        const key = `${med.name.trim().toLowerCase()}-${med.dosage}-${med.dosageUnit}-${med.frequency}-${med.timing}`;
        if (!uniqueMedicinesMap[key]) {
          uniqueMedicinesMap[key] = med;
        }
      });
      const uniqueMedsToSave = Object.values(uniqueMedicinesMap);

      await MedicationReviewService.submitMedications(uniqueMedsToSave);
    } catch (err: any) {
      console.error("[MedicationReviewContext] Failed to save review:", err);
      setError(err.message || "Failed to save medications.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [medicines]);

  // Reset context
  const clearReviewState = useCallback(() => {
    setDocuments([]);
    setMedicines([]);
    setSelectedMedicineIds([]);
    setIsLoading(false);
    setIsSaving(false);
    setError(null);
  }, []);

  return (
    <MedicationReviewContext.Provider
      value={{
        documents,
        medicines,
        selectedMedicineIds,
        isLoading,
        isSaving,
        error,
        duplicateGroups,
        initializeReview,
        toggleMedicineSelection,
        updateMedicineDraft,
        saveReview,
        clearReviewState,
      }}
    >
      {children}
    </MedicationReviewContext.Provider>
  );
};
