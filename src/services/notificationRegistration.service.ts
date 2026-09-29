import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
} from "@react-native-firebase/messaging";

// Default notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Checks if Firebase messaging is supported on the current runtime/platform.
 */
export const isPushMessagingSupported = (): boolean => {
  const iosGoogleServicesFile = Constants.expoConfig?.ios?.googleServicesFile;
  const isSupportedPlatform = Platform.OS !== "ios" || Boolean(iosGoogleServicesFile);
  return isSupportedPlatform && Device.isDevice;
};

/**
 * Registers device for push notifications, sets up Android notification channels,
 * requests OS permissions, and securely caches the device token.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    const iosGoogleServicesFile = Constants.expoConfig?.ios?.googleServicesFile;
    if (Platform.OS === "ios" && !iosGoogleServicesFile) {
      console.warn(
        "[Notification] Skipping Firebase messaging on iOS: googleServicesFile / GoogleService-Info.plist is not configured.",
      );
      return null;
    }

    if (!Device.isDevice) {
      console.warn("[Notification] Must use a physical device for push notifications.");
      return null;
    }

    // 1. Get FCM Device Token
    let fcmToken: string | null = null;
    try {
      fcmToken = await getToken(getMessaging());
      if (fcmToken) {
        await SecureStore.setItemAsync("deviceToken", String(fcmToken));
      }
    } catch (fcmError) {
      console.warn("[Notification] Failed to retrieve FCM token:", fcmError);
    }

    // 2. Request OS-level notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Notification] Notification permission not granted!");
      return fcmToken;
    }

    // 3. Create Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("HealthVault", {
        name: "HealthVault",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    return fcmToken;
  } catch (error) {
    console.warn("[Notification] Error during registerForPushNotifications:", error);
    return null;
  }
};

/**
 * Sets up an FCM token refresh listener to automatically update stored deviceToken.
 */
export const setupTokenRefreshListener = (
  onTokenUpdated?: (newToken: string) => void,
): (() => void) => {
  const iosGoogleServicesFile = Constants.expoConfig?.ios?.googleServicesFile;
  if (Platform.OS === "ios" && !iosGoogleServicesFile) {
    return () => {};
  }

  try {
    const unsubscribe = onTokenRefresh(getMessaging(), (newToken: string) => {
      SecureStore.setItemAsync("deviceToken", String(newToken));
      if (onTokenUpdated) {
        onTokenUpdated(newToken);
      }
    });
    return unsubscribe;
  } catch (error) {
    console.warn("[Notification] Failed to subscribe to onTokenRefresh:", error);
    return () => {};
  }
};
