import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { queryClient } from "../config/queryClient";
import { registerForceLogoutHandler, resetForceLogout, getValidAccessToken } from "../services/apiClient";

interface AuthContextType {
  userId: string | null;
  setUserId: (user: string | null) => void;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  login: (data: { accessToken: string; refreshToken: string; userId: string; createdAt?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AuthContextType | undefined>(undefined);

const clearStoredAuth = async () => {
  await SecureStore.deleteItemAsync("authToken");
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshDate");
  await SecureStore.deleteItemAsync("userId");
};

const calculateRefreshDateString = (createdAt?: string): string => {
  let refreshDate = new Date();
  if (createdAt) {
    const datePart = createdAt.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (year && month && day) {
      refreshDate = new Date(year, month - 1, day);
    }
  }
  refreshDate.setDate(refreshDate.getDate() + 6);
  const yyyy = refreshDate.getFullYear();
  const mm = String(refreshDate.getMonth() + 1).padStart(2, "0");
  const dd = String(refreshDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearLocalAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = await SecureStore.getItemAsync("userId");

        // If user has just downloaded the app or no userId is found, skip checking/refreshing token
        if (!storedUserId) {
          clearLocalAuthState();
          return;
        }

        setUserId(storedUserId);

        const storedRefreshToken = await SecureStore.getItemAsync("authToken");
        if (storedRefreshToken) {
          try {
            // Proactively validate / refresh token via getValidAccessToken
            const validToken = await getValidAccessToken();
            if (validToken) {
              const latestRefreshToken = (await SecureStore.getItemAsync("authToken")) || storedRefreshToken;
              setAccessToken(validToken);
              setRefreshToken(latestRefreshToken);
              setIsAuthenticated(true);
            } else {
              // Refresh failed / invalid credentials
              await clearStoredAuth();
              clearLocalAuthState();
            }
          } catch (refreshError) {
            console.error("Token refresh failed on app load:", refreshError);
            await clearStoredAuth();
            clearLocalAuthState();
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Failed to restore auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [clearLocalAuthState]);

  // Proactively check and refresh token when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated) {
        try {
          const freshToken = await getValidAccessToken();
          if (freshToken) {
            setAccessToken(freshToken);
            const latestRefreshToken = await SecureStore.getItemAsync("authToken");
            if (latestRefreshToken) {
              setRefreshToken(latestRefreshToken);
            }
          }
        } catch (e) {
          // Handled internally by getValidAccessToken / triggerForceLogout
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    registerForceLogoutHandler(() => {
      clearLocalAuthState();
      queryClient.clear();
    });
  }, [clearLocalAuthState]);

  const login = async (data: { accessToken: string; refreshToken: string; userId: string; createdAt?: string }) => {
    try {
      resetForceLogout();

      await SecureStore.setItemAsync("userId", String(data.userId));
      await SecureStore.setItemAsync("accessToken", String(data.accessToken));
      await SecureStore.setItemAsync("authToken", String(data.refreshToken));
      await SecureStore.setItemAsync("refreshDate", calculateRefreshDateString(data.createdAt));

      setUserId(data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      // Sign out from Firebase client session
      await signOut(auth);

      // Clear all secure store session details
      await clearStoredAuth();
      clearLocalAuthState();
      
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
        accessToken,
        refreshToken,
        isAuthenticated,
        setIsAuthenticated,
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
