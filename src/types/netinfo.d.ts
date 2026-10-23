declare module "@react-native-community/netinfo" {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: any;
  }

  export interface NetInfoSubscription {
    (): void;
  }

  export function fetch(): Promise<NetInfoState>;
  export function addEventListener(listener: (state: NetInfoState) => void): NetInfoSubscription;
  export function useNetInfo(): NetInfoState;

  const NetInfo: {
    fetch: typeof fetch;
    addEventListener: typeof addEventListener;
    useNetInfo: typeof useNetInfo;
  };

  export default NetInfo;
}
