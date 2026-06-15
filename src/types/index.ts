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
  password?: string;
  deviceToken: string | null;
}

export interface SignupRequest {
  profileImageKey?: string;
  firstName: string;
  lastName: string;
  // userName: string;
  email: string;
  password: string;
  gender: string;
  dateOfBirth: string;
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
  profileImageKey?: string;
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

export interface FilterDocumentsRequest {
  filter: {
    search: string;
  },
  sort: {
    sortBy: string,
    orderBy: "asc" | "desc"
  }
}

// ─── Medication ────────────────────────────────────────
export interface AddOrEditMedication {
  id?: string;
  medicationName: string;
  medicationType?: string;
  prescribedBy: string;
  dosePerIntake: number;
  frequency: string;
  medicationSchedule: Record<string, string>;
  foodFrequency?: string;
  startDate?: string;
  ongoing: boolean;
  totalQuantity: number;
  isReminder?: boolean;
  unit?: string;
  reminderBeforeMinutes?: number | null;
  refillAlert?: boolean;
  notes: string;
}

export interface FilterMedicationsRequest {
  filter: {
    search: string;
  },
  sort: {
    sortBy: string,
    sortOrder: "asc" | "desc"
  }
}

// ─── Notification ────────────────────────────────────────

export interface ListNotificationRequest {
  filter: {
    userId: string;
    isRead?: boolean;
    search?: string;
  },
  page?: {
    pageNumber: number;
    pageLimit: number;
  },
  sort: {
    sortBy: string;
    orderBy: "asc" | "desc";
  }
}

// ─── Health Reminders ────────────────────────────────────────

export interface Reminder {
  id?: string;
  patientId?: string;
  medicationId?: string;
  medicationName?: string;
  medicationType?: string;
  type?: string;
  status?: string;
  beforeReminderTime?: string;
  afterReminderMinutes?: number;
  refillAlertBeforeDays: number;
  dosePerIntake: number;
  frequency: string;
  medicationTime: {
    time: string;
    period: string;
  }[];
  actualMedicationTime: string;
  completedAt?: string;
  isOverdue?: boolean;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  softDelete: boolean;
}

export interface CreateMedicationReminderRequest {
  medicationId: string;
}

export interface ListRemindersRequest {
  filter: {
    status?: string;
    startDate?: string;
    endDate?: string;
    medicationName?: string;
    medicationType?: string;
    date?: string;
    isOverdue?: boolean;
  },
  sort: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  }
  page?: {
    pageNumber: number;
    pageLimit: number;
  },
}

export interface MarkReminderCompletedRequest {
  medicationId: string;
  quantity: number;
}