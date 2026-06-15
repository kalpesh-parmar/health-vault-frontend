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
import messaging from "@react-native-firebase/messaging";

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
        const fcmToken = await messaging().getToken();
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
        console.error("Error getting push token:", error);
      }
    }

    registerForPushNotifications();

    // --- FCM Token Refresh Listener ---
    const unsubscribeFCM = messaging().onTokenRefresh((newToken: string) => {
      console.log("FCM Token Refreshed:", newToken);
      SecureStore.setItemAsync("deviceToken", String(newToken));
    });

    return () => {
      // subscription.remove();
      unsubscribeFCM();
    };
  }, []);

  return (
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
  );
}
