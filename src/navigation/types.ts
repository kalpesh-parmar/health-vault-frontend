import { MedicalDocument } from "../components/Documents/DocumentCard";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  "About Us": undefined;
  DocumentList: undefined;
  DocumentSummary: { document: MedicalDocument };
  Medication: undefined;
  EditDocument: { document: MedicalDocument };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: {
    formData: {
      username: string;
      fullname: string;
      email: string;
      password: string;
      dob: Date;
      phone: string;
      gender: "Male" | "Female" | "Other";
    };
  };
};
