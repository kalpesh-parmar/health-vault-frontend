import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import NetworkErrorScreen from "../components/shared/NetworkErrorScreen";

interface NetworkContextType {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  isChecking: false,
  checkConnection: async () => true,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [netState, setNetState] = useState<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }>({
    isConnected: true,
    isInternetReachable: true,
  });

  const [isChecking, setIsChecking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const updateNetworkState = useCallback((state: NetInfoState) => {
    // When isConnected is explicitly false, or isInternetReachable is explicitly false
    setNetState({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
    });
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      updateNetworkState(state);
    });

    // Event listener for real-time network connectivity changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      updateNetworkState(state);
    });

    return () => {
      unsubscribe();
    };
  }, [updateNetworkState]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // Add a slight minimum delay so user gets visual feedback of check
      const [state] = await Promise.all([
        NetInfo.fetch(),
        new Promise((res) => setTimeout(res, 600)),
      ]);
      updateNetworkState(state);
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      return online;
    } catch (error) {
      console.warn("Network check error:", error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [updateNetworkState]);

  // Determine if offline:
  // Only trigger once initialized so app doesn't flash offline during the first millisecond
  const isOffline =
    hasInitialized &&
    (netState.isConnected === false || netState.isInternetReachable === false);

  return (
    <NetworkContext.Provider
      value={{
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        isOffline,
        isChecking,
        checkConnection,
      }}
    >
      {isOffline ? (
        <NetworkErrorScreen onRetry={checkConnection} isChecking={isChecking} />
      ) : (
        children
      )}
    </NetworkContext.Provider>
  );
};

export default NetworkProvider;
