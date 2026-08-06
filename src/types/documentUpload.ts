export interface SelectedDocument {
  id: string;
  uri: string;
  originalName: string;
  displayName: string;
  documentType: string;
  mimeType: string;
  size: number;
}

export type DocumentUploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "processing"
  | "ocr_processing"
  | "completed"
  | "rejected"
  | "failed";

export const DOCUMENT_TYPE_OPTIONS = [
  "Prescription",
  "Lab Report",
  "Imaging Report",
  "Discharge Summary",
  "Consultation Report",
  "Surgery Report",
  "Vaccination Report",
  "Medical Certificate",
  "Other Medical Document",
] as const;

export type DocumentType = typeof DOCUMENT_TYPE_OPTIONS[number];
