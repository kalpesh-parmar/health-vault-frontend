import Toast from "react-native-toast-message";
import { toastConfig } from "./src/config/ToastConfig";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/config/queryClient";
import { AuthProvider } from "./src/context/ContextAPI";
import RootNavigator from "./src/navigation/RootNavigator";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect } from "react";
import { Platform } from "react-native";
import { AppThemeProvider } from "./src/context/ThemeContext";
import * as SecureStore from "expo-secure-store";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerWearableBackgroundSync } from "./src/services/wearable/backgroundSyncTask";

// Setting up the notification handler for notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  useEffect(() => {
    async function registerForPushNotifications() {
      try {
        if (!Device.isDevice) {
          console.warn("Must use a physical device for push notifications");
          return;
        }

        // FCM Token Generation for Push Notifications using Firebase Cloud Messaging.
        const fcmToken = await getToken(getMessaging());
        console.log("FCM Token:", fcmToken);

        await SecureStore.setItemAsync("deviceToken", String(fcmToken));

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.warn("Permission not granted!");
          return;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("HealthVault", {
            name: "HealthVault",
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (error) {
        console.warn("Error getting push token:", error);
      }
    }

    registerForPushNotifications();

    // --- FCM Token Refresh Listener ---
    const unsubscribeFCM = onTokenRefresh(
      getMessaging(),
      (newToken: string) => {
        console.log("FCM Token Refreshed:", newToken);
        SecureStore.setItemAsync("deviceToken", String(newToken));
      },
    );

    return () => {
      unsubscribeFCM();
    };
  }, []);

  useEffect(() => {
    // Register the periodic background wearable sync (Android WorkManager /
    // iOS BGTaskScheduler). Idempotent; safe to call on every app start.
    // Best-effort: never block startup if registration is unavailable.
    registerWearableBackgroundSync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <BottomSheetModalProvider>
                <RootNavigator />
                <Toast
                  config={toastConfig}
                  topOffset={60}
                  visibilityTime={4000}
                />
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
