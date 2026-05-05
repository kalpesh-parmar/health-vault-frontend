import { NavigatorScreenParams } from "@react-navigation/native";
import { MedicalDocument } from "../components/Documents/DocumentCard";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string };
};

export type ImagePreviewParams = {
  images: string;
};

export type SaveDocumentParams = {
  images: string;     
  aiSummary: string;
};

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  DocumentSummary: { document: MedicalDocument };
  Medication: undefined;
  AddMedication: undefined;
  EditDocument: { document: MedicalDocument };
  ImagePreview: ImagePreviewParams;
  SaveDocument: SaveDocumentParams;
  DocumentStack: NavigatorScreenParams<DocumentsStackParamList>;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: {
    formData: {
      username: string;
      firstName: string;
      lastName: string;
    };
  };
  HomeStack: undefined;
};

export type DocumentsStackParamList = {
  DocumentList: { category: string };
  DocumentSummary: { document: MedicalDocument };
  EditDocument: { document: MedicalDocument };
};
