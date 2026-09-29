import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  isPushMessagingSupported,
  registerForPushNotifications,
  setupTokenRefreshListener,
} from "../notificationRegistration.service";

const mockGetMessaging = jest.fn(() => ({}));
const mockGetToken = jest.fn();
const mockOnTokenRefresh = jest.fn();

jest.mock("@react-native-firebase/messaging", () => ({
  getMessaging: () => mockGetMessaging(),
  getToken: (...args: any[]) => mockGetToken(...args),
  onTokenRefresh: (...args: any[]) => mockOnTokenRefresh(...args),
}));

describe("Push Notification Registration Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = "android";
    (Device as any).isDevice = true;
    (Constants as any).expoConfig = {
      ios: { googleServicesFile: "./GoogleService-Info.plist" },
    };
    mockGetToken.mockResolvedValue("mock-fcm-token-999");
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue({});
  });

  describe("isPushMessagingSupported", () => {
    it("returns true on Android physical device", () => {
      (Platform as any).OS = "android";
      (Device as any).isDevice = true;

      expect(isPushMessagingSupported()).toBe(true);
    });

    it("returns false on emulator/simulator", () => {
      (Device as any).isDevice = false;

      expect(isPushMessagingSupported()).toBe(false);
    });

    it("returns false on iOS when googleServicesFile is not configured", () => {
      (Platform as any).OS = "ios";
      (Device as any).isDevice = true;
      (Constants as any).expoConfig = { ios: {} };

      expect(isPushMessagingSupported()).toBe(false);
    });

    it("returns true on iOS physical device when googleServicesFile is configured", () => {
      (Platform as any).OS = "ios";
      (Device as any).isDevice = true;
      (Constants as any).expoConfig = {
        ios: { googleServicesFile: "./GoogleService-Info.plist" },
      };

      expect(isPushMessagingSupported()).toBe(true);
    });
  });

  describe("registerForPushNotifications", () => {
    it("registers successfully on Android device, creates notification channel, and saves FCM token", async () => {
      (Platform as any).OS = "android";
      (Device as any).isDevice = true;

      const token = await registerForPushNotifications();

      expect(token).toBe("mock-fcm-token-999");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith("deviceToken", "mock-fcm-token-999");
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("HealthVault", {
        name: "HealthVault",
        importance: Notifications.AndroidImportance.MAX,
      });
    });

    it("requests permissions if existing status is not granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });

      const token = await registerForPushNotifications();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe("mock-fcm-token-999");
    });

    it("returns null on non-physical devices with warning", async () => {
      (Device as any).isDevice = false;

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it("returns null on iOS when GoogleService-Info.plist is missing", async () => {
      (Platform as any).OS = "ios";
      (Device as any).isDevice = true;
      (Constants as any).expoConfig = { ios: {} };

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
    });

    it("handles getToken failures gracefully without crashing", async () => {
      mockGetToken.mockRejectedValue(new Error("FCM service unavailable"));

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
    });
  });

  describe("setupTokenRefreshListener", () => {
    it("attaches onTokenRefresh listener and invokes callback on token change", () => {
      let registeredListener: ((newToken: string) => void) | null = null;
      const mockUnsubscribe = jest.fn();

      mockOnTokenRefresh.mockImplementation((_messagingInstance: any, handler: (t: string) => void) => {
        registeredListener = handler;
        return mockUnsubscribe;
      });

      const onTokenUpdatedMock = jest.fn();
      const unsubscribe = setupTokenRefreshListener(onTokenUpdatedMock);

      expect(mockOnTokenRefresh).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);

      // Simulate token refresh event
      if (registeredListener) {
        (registeredListener as (t: string) => void)("new-refreshed-fcm-token");
      }

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith("deviceToken", "new-refreshed-fcm-token");
      expect(onTokenUpdatedMock).toHaveBeenCalledWith("new-refreshed-fcm-token");
    });

    it("returns no-op unsubscribe on iOS if googleServicesFile is unconfigured", () => {
      (Platform as any).OS = "ios";
      (Constants as any).expoConfig = { ios: {} };

      const unsubscribe = setupTokenRefreshListener();

      expect(mockOnTokenRefresh).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });
  });
});
