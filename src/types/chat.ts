import { DocumentSummaryStats } from "../components/chat/widgets/ReportSummaryChatCard";
import {
  ChatWizardState,
  DuplicateConflict,
} from "../context/DocumentUploadContext";

export enum ChatMode {
  GENERAL_HEALTH = "GENERAL_HEALTH",
  DOCUMENT_RAG = "DOCUMENT_RAG",
}

export type ConflictResolution = "keep" | "replace" | "merge" | "remove_new";

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  sessionId?: string;
  mode?: ChatMode | string;
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
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string | DocumentSummaryStats;
  loginProvider?: string;
  documents?: { id: string; fileName: string; medicinesCount?: number }[];
  documentIds?: string[];
  conflicts?: any[];
  createdAt?: string | Date;
  document?: any;
  suggestedQuestions?: string[];
  keyFindings?: any[];
  isOnboardingMessage?: boolean;
}

export type { ChatWizardState, DuplicateConflict };
