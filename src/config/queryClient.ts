 import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Offline requests fail fast in apiClient; retrying them only creates
      // duplicate work and duplicate logs.
      retry: (failureCount, error: any) => {
        if (error?.code === "ERR_NETWORK_OFFLINE") return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
