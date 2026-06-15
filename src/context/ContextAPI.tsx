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
  login: (data: { accessToken: string; refreshToken: string; userId: string; createdAt?: string }) => Promise<void>;
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
        const refreshDateStr = await SecureStore.getItemAsync("refreshDate");

        if (storedRefreshToken) {
          try {
            let shouldRefresh = false;

            if (refreshDateStr) {
              const currentDate = new Date();
              const yyyy = currentDate.getFullYear();
              const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
              const dd = String(currentDate.getDate()).padStart(2, "0");
              const currentDateOnly = `${yyyy}-${mm}-${dd}`;
              
              // Check if current date is equal to or past the refreshDate
              if (currentDateOnly >= refreshDateStr) {
                shouldRefresh = true;
              }
            } else {
              // If there's no refreshDate stored, we might want to refresh to be safe
              shouldRefresh = true;
            }

            if (shouldRefresh) {
              // Attempt to refresh the token
              const refreshResult = await refreshApiToken({ refreshToken: storedRefreshToken });
              
              const newAccessToken = refreshResult.data?.accessToken || refreshResult.accessToken;
              const newRefreshToken = refreshResult.data?.refreshToken || refreshResult.refreshToken;

              if (newAccessToken && newRefreshToken) {
                await SecureStore.setItemAsync("accessToken", String(newAccessToken));
                await SecureStore.setItemAsync("authToken", String(newRefreshToken));
                
                setAccessToken(newAccessToken);
                setRefreshToken(newRefreshToken);
                setIsAuthenticated(true);

                // Delete the old refreshDate
                await SecureStore.deleteItemAsync("refreshDate");

                // Fetch current date, add 6 days, and store it
                const newRefreshDate = new Date();
                newRefreshDate.setDate(newRefreshDate.getDate() + 6);
                
                const yyyy = newRefreshDate.getFullYear();
                const mm = String(newRefreshDate.getMonth() + 1).padStart(2, "0");
                const dd = String(newRefreshDate.getDate()).padStart(2, "0");
                const newRefreshDateOnly = `${yyyy}-${mm}-${dd}`;
                
                await SecureStore.setItemAsync("refreshDate", newRefreshDateOnly);
              }
            } else {
              // Not time to refresh, use stored tokens
              const storedAccessToken = await SecureStore.getItemAsync("accessToken");
              setAccessToken(storedAccessToken);
              setRefreshToken(storedRefreshToken);
              setIsAuthenticated(true);
            }
          } catch (refreshError) {
            console.error("Token refresh failed on app load:", refreshError);
            // Optionally, we could clear the tokens here if they are invalid
            await SecureStore.deleteItemAsync("authToken");
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshDate");
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

  const login = async (data: { accessToken: string; refreshToken: string; userId: string; createdAt?: string }) => {
    try {
      setUserId(data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);

      await SecureStore.setItemAsync("userId", String(data.userId));
      await SecureStore.setItemAsync("accessToken", String(data.accessToken));
      await SecureStore.setItemAsync("authToken", String(data.refreshToken));

      // Calculate the 6th date from createdAt and store it
      let refreshDate = new Date();
      if (data.createdAt) {
        // Extract just the YYYY-MM-DD from the UTC ISO string
        const datePart = data.createdAt.split("T")[0];
        const [year, month, day] = datePart.split("-").map(Number);
        if (year && month && day) {
          refreshDate = new Date(year, month - 1, day);
        }
      }
      refreshDate.setDate(refreshDate.getDate() + 6);
      
      const yyyy = refreshDate.getFullYear();
      const mm = String(refreshDate.getMonth() + 1).padStart(2, "0");
      const dd = String(refreshDate.getDate()).padStart(2, "0");
      const formattedRefreshDate = `${yyyy}-${mm}-${dd}`;
      
      await SecureStore.setItemAsync("refreshDate", formattedRefreshDate);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("userId");
      await SecureStore.deleteItemAsync("refreshDate");
      
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
