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

// ─── Request/Response Types ───────────────────────────────

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

// ─── Medication Types ────────────────────────────────────────
export interface AddOrEditMedication {
  id?: string;
  medicationName: string;
  medicationType: string;
  prescribedBy: string;
  dosePerIntake: number;
  frequency: string;
  bestTaken: string[];
  medicationTime: {
    time: string;
    period: string;
  }[];
  withFood: string;
  startDate: string;
  ongoing: boolean;
  totalPills: number;
  doseReminders: boolean;
  refillAlert: boolean;
  notes: string;
}