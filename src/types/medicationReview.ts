export interface ProcessedDocument {
  id: string;
  name: string;
  type: string;
  status: "completed" | "processing" | "failed" | "COMPLETED" | "FAILED" | "RUNNING" | "QUEUED";
  medicines: ExtractedMedicine[];
  summaryEnglish?: string;
  summaryPreferred?: string;
}

export interface ExtractedMedicine {
  id: string;
  documentId: string;
  documentName: string;

  name: string;
  medicineType?: string; // e.g. "Tablet", "Capsule", "Syrup", etc.

  dosage?: string;
  dosageUnit?: string;

  frequency?: string;
  timing?: string;

  prescribedBy?: string;

  totalQuantity?: number;
  quantityUnit?: string;

  reminderEnabled?: boolean;
  reminderTime?: string;

  refillAlertEnabled?: boolean;
  refillAlertDays?: number;

  notes?: string;

  confidence?: number; // e.g. 0.98

  selected: boolean;

  // Unified form fields support
  refillAlert?: boolean;
  foodFrequency?: string;
  startDate?: string;
  medicationSchedule?: string[];
  dosageDetails?: { value?: number; unit?: string; count?: number };
  resolution?: string;
  replaceMedicationId?: string;
  isBackendDuplicate?: boolean;
}

export interface MedicationReviewState {
  documents: ProcessedDocument[];
  medicines: ExtractedMedicine[];
  selectedMedicineIds: string[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}
