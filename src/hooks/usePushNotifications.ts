import { useEffect } from "react";
import {
  registerForPushNotifications,
  setupTokenRefreshListener,
} from "../services/notificationRegistration.service";

/**
 * Custom hook to bootstrap push notifications and listen for FCM token refreshes.
 */
export function usePushNotifications() {
  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications();

    // Subscribe to FCM token updates and cleanup on unmount
    const unsubscribe = setupTokenRefreshListener();

    return () => {
      unsubscribe();
    };
  }, []);
}
