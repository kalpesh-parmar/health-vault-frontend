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
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { AppThemeProvider } from "./src/context/ThemeContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    async function registerForPushNotifications() {
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log(channels);

      try {
        if (!Device.isDevice) {
          console.warn("Must use a physical device for push notifications");
          return;
        }

        console.log("Requesting notification permissions...");

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

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        const deviceToken = tokenData.data;
        console.log(deviceToken);

        await SecureStore.setItemAsync("deviceToken", String(deviceToken));

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (error) {
        console.error("Error getting push token:", error);
      }
    }

    registerForPushNotifications();

    const subscription = Notifications.addPushTokenListener((token) => {
      console.log("Token updated:", token.data);
      SecureStore.setItemAsync("deviceToken", String(token.data));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AppThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <RootNavigator />
              <Toast config={toastConfig} topOffset={60} visibilityTime={4000} />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
