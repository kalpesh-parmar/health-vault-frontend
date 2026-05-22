import { NavigatorScreenParams } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AddOrEditMedication, MedicalDocument } from "./index";

// ─── Auth Stack ────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Signup: {email: string, verified: boolean};
  ForgotPassword: undefined;
  VerifyOTP: { email: string, fromSignup?: boolean };
  ResetPassword: { email: string };
  Home: NavigatorScreenParams<AppStackParamList>; 
};

// ─── Image Preview Params ──────────────────────────────────────

export type ImagePreviewParams = {
  images: string;
};

// ─── Save Document Params ──────────────────────────────────────

export type SaveDocumentParams = {
  images: string;
  aiSummary: string;
};

// ─── Documents Stack ───────────────────────────────────────────

export type DocumentsStackParamList = {
  DocumentsCategories: undefined;
  DocumentList: { category: string };
  DocumentSummary: { document: MedicalDocument };
  EditDocument: { document: MedicalDocument };
};

// ─── Medication Stack ──────────────────────────────────────────

export type MedicationStackParamList = {
  MedicationList: undefined;
  MedicationOperation: {operation?: string, medication?: AddOrEditMedication};
};

// ─── App Stack (Home Stack) ────────────────────────────────────

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  MedicationStack: NavigatorScreenParams<MedicationStackParamList>;
  ImagePreview: ImagePreviewParams;
  SaveDocument: SaveDocumentParams;
  DocumentStack: NavigatorScreenParams<DocumentsStackParamList>;
  Notifications: undefined;
  AIChat: undefined;
  Reminders: { filter?: "All" | "Overdue" | "Upcoming" | "Completed" } | undefined;
  UploadSuccess: {
    documentName: string;
    fileSize: string;
    fileType: string;
    uploadedAt: string;
    category: string;
  };
};

// ─── Profile Stack ─────────────────────────────────────────────

export type ProfileStackParamList = {
  EditProfile: undefined
};

// ─── Tab Navigator ─────────────────────────────────────────────

export type TabParamList = {
  Home: undefined;
  Profile: undefined;
  AIChatScreen: undefined;
  Settings: undefined;
};

// ─── Typed Navigation Hooks ────────────────────────────────────

export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<AppStackParamList>>();

export const useAuthNavigation = () =>
  useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

export const useProfileNavigation = () =>
  useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
