import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

interface AuthContextType {
  userId: string | null;
  setUserId: (user: string | null) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isLoading: boolean;
  login: (sessionId?: string, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        const storedSessionId = await SecureStore.getItemAsync("sessionId");
        const storedUserId = await SecureStore.getItemAsync("userId");

        if (token) {
          setIsLoggedIn(true);
        }
        if (storedSessionId) {
          setSessionId(storedSessionId);
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

  const login = async (sessionId?: string, userId?: string) => {
    try {
      setIsLoggedIn(true);

      if (sessionId) {
        await SecureStore.setItemAsync("sessionId", sessionId);
        console.log("Session Id Stored successfully.");
        setSessionId(sessionId);
      }
      if (userId) {
        await SecureStore.setItemAsync("userId", userId);
        console.log("User Id Stored successfully.");
        setUserId(userId);
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("sessionId");
      await SecureStore.deleteItemAsync("userId");
      setIsLoggedIn(false);
      setSessionId(null);
      setUserId(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        setUserId,
        sessionId,
        setSessionId,
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
