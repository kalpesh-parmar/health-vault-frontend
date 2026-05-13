import apiClient from "./apiClient";
import { NOTIFICATION_ENDPOINTS } from "../constants/endpoints";

export const listNotifications = async () => {
  const response = await apiClient.post(NOTIFICATION_ENDPOINTS.LIST_NOTIFICATION);
  return response.data;
};

export const getNotificationCount = async () => {
  const {data} = await getProfile();
  const userId = data?.data?.id;
  const endpoint = NOTIFICATION_ENDPOINTS.GET_NOTIFICATION_COUNT;
  const response = await apiClient.get(
    endpoint,
    {
      params: {
        userId,
      }
    }
  );
  return response.data;
};

export const markAsRead = async (id: string) => {
  const endpoint = NOTIFICATION_ENDPOINTS.MARK_AS_READ.replace("{id}", id);
  const response = await apiClient.put(endpoint);
  return response.data;
};

function getProfile(): { data: any; } | PromiseLike<{ data: any; }> {
  throw new Error("Function not implemented.");
}
