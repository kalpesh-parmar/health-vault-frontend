import { NavigatorScreenParams, RouteProp, useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AddOrEditMedication, MedicalDocument } from "./index";

// ─── Auth Stack ────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string };
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

// ─── App Stack (Home Stack) ────────────────────────────────────

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  Medication: undefined;
  MedicationOperation: {operation: string, medication?: AddOrEditMedication};
  ImagePreview: ImagePreviewParams;
  SaveDocument: SaveDocumentParams;
  DocumentStack: NavigatorScreenParams<DocumentsStackParamList>;
  Notifications: undefined;
  AIChat: undefined;
};

// ─── Profile Stack ─────────────────────────────────────────────

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: {
    formData: {
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      age: number;
      gender: string;
    };
  };
  ProfileDocuments: undefined;
  Settings: undefined;
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
