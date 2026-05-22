import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "../config/queryClient";
import { refreshToken as refreshApiToken } from "../services/authService";

interface AuthContextType {
  userId: string | null;
  setUserId: (user: string | null) => void;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  login: (data: { accessToken: string; refreshToken: string; userId: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedRefreshToken = await SecureStore.getItemAsync("authToken");
        const storedUserId = await SecureStore.getItemAsync("userId");

        if (storedRefreshToken) {
          try {
            // Attempt to refresh the token on app load
            const refreshResult = await refreshApiToken({ refreshToken: storedRefreshToken });
            
            const newAccessToken = refreshResult.data?.accessToken || refreshResult.accessToken;
            const newRefreshToken = refreshResult.data?.refreshToken || refreshResult.refreshToken;

            if (newAccessToken && newRefreshToken) {
              await SecureStore.setItemAsync("accessToken", String(newAccessToken));
              await SecureStore.setItemAsync("authToken", String(newRefreshToken));
              
              setAccessToken(newAccessToken);
              setRefreshToken(newRefreshToken);
              setIsAuthenticated(true);
            }
          } catch (refreshError) {
            console.error("Token refresh failed on app load:", refreshError);
            // Optionally, we could clear the tokens here if they are invalid
            await SecureStore.deleteItemAsync("authToken");
            await SecureStore.deleteItemAsync("accessToken");
          }
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

  const login = async (data: { accessToken: string; refreshToken: string; userId: string }) => {
    try {
      setUserId(data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);

      await SecureStore.setItemAsync("userId", String(data.userId));
      await SecureStore.setItemAsync("accessToken", String(data.accessToken));
      await SecureStore.setItemAsync("authToken", String(data.refreshToken));
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("userId");
      
      setIsAuthenticated(false);
      setAccessToken(null);
      setRefreshToken(null);
      setUserId(null);
      
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
