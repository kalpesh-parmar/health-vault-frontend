import { useAuth as useAuthFromStore } from "../store/AuthContext";

export const useAuth = () => {
  return useAuthFromStore();
};
