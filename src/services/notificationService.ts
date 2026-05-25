import apiClient from "./apiClient";
import { NOTIFICATION_ENDPOINTS } from "../constants/endpoints";
import { getUser } from "./userService";

export const listNotifications = async () => {
  const response = await apiClient.post(NOTIFICATION_ENDPOINTS.LIST_NOTIFICATION, {});
  return response.data;
};

export const getNotificationCount = async () => {
  const user = await getUser();
  const userId = user?.data?.id;
  const endpoint = NOTIFICATION_ENDPOINTS.GET_NOTIFICATION_COUNT;
  const response = await apiClient.get(endpoint, {
    params: {
      userId,
    },
  });
  return response.data;
};

export const markAsRead = async ({
  notificationId,
}: {
  notificationId: string;
}) => {
  const endpoint = NOTIFICATION_ENDPOINTS.MARK_AS_READ.replace(
    "{id}",
    notificationId,
  );
  const response = await apiClient.put(endpoint);
  return response.data;
};

export const markAllAsRead = async () => {
  const endpoint = NOTIFICATION_ENDPOINTS.MARK_ALL_READ;
  const response = await apiClient.put(endpoint);
  return response.data;
};
