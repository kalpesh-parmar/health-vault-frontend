// ─── Domain Types ──────────────────────────────────────────────

export interface MedicalDocument {
  id: string;
  fileName: string;
  category: string;
  createdAt: string;
  imageUri?: string;
  documentId?: string;
  documentType?: string;
  s3Key?: string;
  AISummary?: string;
  notes?: string;
  title?: string;
}

export type DocumentCategory =
  | "family"
  | "medical_document"
  | "insurance"
  | "medication"
  | "other";

// ─── Auth Request/Response Types ───────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  deviceToken: string | null;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  gender: string;
  age: number;
  phone: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
}

// ─── User Types ────────────────────────────────────────────────

export interface UpdateUserRequest {
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
}

// ─── Document Types ────────────────────────────────────────────

export interface PaginatedDocumentRequest {
  activeCategory: string;
  page: number;
  pageLimit: number;
}

// ─── API Response Wrapper ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  status?: {
    code: number;
    description: string;
  };
  message?: string;
}
