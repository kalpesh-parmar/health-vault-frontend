// ─── Shared Types ──────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  status: ApiStatus;
}

export type ApiStatus = {
  statusCode: number;
  success: boolean;
  description: string;
};

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
  fileSize?: number;
}

// ─── Request/Response Types ───────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  deviceToken: string | null;
}

export interface SignupRequest {
  profilePicture?: {
    uri: string;
    name: string;
    type: string;
  };
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

// ─── Signup Response ────────────────────────────────────────────────

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  userName: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  patientCode?: string;
  profileImageKey?: string | null;
  isVerified?: boolean;
  status?: string;
  softDelete?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// ─── Update User Request ────────────────────────────────────────────────

export interface UpdateUserRequest {
  profilePicture?: {
    uri: string;
    name: string;
    type: string;
  };
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
}

// ─── Document Request ────────────────────────────────────────────

export interface PaginatedDocumentRequest {
  activeCategory: string;
  page: number;
  pageLimit: number;
}

export interface PaginatedDocumentResponse {
  data: MedicalDocument[];
  total: number;
}

// ─── Medication ────────────────────────────────────────
export interface AddOrEditMedication {
  id?: string;
  medicationName: string;
  medicationType: string;
  prescribedBy: string;
  dosePerIntake: number;
  frequency: string;
  medicationTime: {
    time: string;
    period: string;
  }[];
  bestTaken: string[];
  foodFrequency: string;
  startDate: string;
  ongoing: boolean;
  totalQuantity: number;
  doseReminders: boolean;
  unit: string;
  reminderBeforeMinutes?: number;
  refillAlert: boolean;
  notes: string;
}

// ─── Notification ────────────────────────────────────────

export interface ListNotificationRequest {
  filter: {
    userId: string;
    isRead: boolean;
  },
  page: {
    pageNumber: number;
    pageLimit: number;
  },
  sort: {
    sortBy: string;
    orderBy: "asc" | "desc";
  }
}
