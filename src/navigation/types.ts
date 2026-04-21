import { MedicalDocument } from "../components/shared/Documents/DocumentCard";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  DocumentList: undefined;
  SummaryScreen: { document: MedicalDocument };
  Medication: undefined;
};
