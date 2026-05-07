import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "../config/queryClient";

interface AuthContextType {
  userId: string | null;
  setUserId: (user: string | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      queryClient.clear();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <Context.Provider
      value={{
        userId,
        setUserId,
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
