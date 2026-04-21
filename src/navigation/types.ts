import { MedicalDocument } from "../components/Documents/DocumentCard";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  DocumentList: undefined;
  SummaryScreen: { document: MedicalDocument };
};
