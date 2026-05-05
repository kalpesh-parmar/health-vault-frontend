import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { MedicalDocument } from "../components/Documents/DocumentCard";

interface AuthContextType {
  userId: string | null;
  setUserId: (user: string | null) => void;
  documents: MedicalDocument[];
  setDocuments: (documents: MedicalDocument[]) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isLoading: boolean;
  login: (userId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AuthContextType | undefined>(undefined);
const DUMMY_DOCS: MedicalDocument[] = [
  {
    id: "1",
    fileName: "Blood Test Results",
    category: "Medical",
    createdAt: "2025-10-12",
    notes: "This is a blood test result.",
    AISummary: "This is an AI summary of the blood test result.",
  },
  {
    id: "2",
    fileName: "Dental X-Ray",
    category: "Medical",
    createdAt: "2025-10-12",
  },
  {
    id: "3",
    fileName: "Vaccination Record",
    category: "Medical",
    createdAt: "2025-10-12",
  },
  {
    id: "4",
    fileName: "MRI Scan - Knee",
    category: "Medical",
    createdAt: "2025-10-12",
  },
  {
    id: "5",
    fileName: "Prescription - Vitamins",
    category: "Medical",
    createdAt: "2025-10-12",
  },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<MedicalDocument[]>(DUMMY_DOCS);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        const storedUserId = await SecureStore.getItemAsync("userId");

        if (token) {
          setIsLoggedIn(true);
        }
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error("Failed to restore auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      if (userId) {
        setUserId(userId);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <Context.Provider
      value={{
        userId,
        setUserId,
        documents,
        setDocuments,
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
