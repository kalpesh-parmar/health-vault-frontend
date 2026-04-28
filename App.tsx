import Toast from "react-native-toast-message";
import { toastConfig } from "./src/config/ToastConfig";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/config/queryClient";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
    shouldPlaySound: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (!Device.isDevice) {
    alert("Must use physical device for Push Notifications");
    return;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    alert("Failed to get push token for push notification!");
    return;
  }
  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants?.expoConfig?.extra?.eas?.projectId,
    })
  ).data;
  console.log("Push Notification Token :- ", token);
  return token;
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");

  useEffect(() => {
  async function getToken() {
    try {
      console.log("Starting registration...");
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        console.log("Token received successfully:", token);
        await SecureStore.setItemAsync("expoPushToken", token);
        setExpoPushToken(token);
      } else {
        console.warn("Registration finished but no token was returned.");
      }
    } catch (e) {
      console.error("FATAL ERROR in useEffect:", e);
    }
  }

  getToken();
}, []);

  return (
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
  );
}
