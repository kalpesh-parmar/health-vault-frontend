import React from "react";
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/config/ToastConfig";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/config/queryClient";
import { AuthProvider } from "./src/context/ContextAPI";
import RootNavigator from "./src/navigation/RootNavigator";
import { AppThemeProvider } from "./src/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DocumentUploadProvider } from "./src/context/DocumentUploadContext";
import { MedicationReviewProvider } from "./src/context/MedicationReviewContext";
import { usePushNotifications } from "./src/hooks/usePushNotifications";

export default function App() {
  usePushNotifications();

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <BottomSheetModalProvider>
                <DocumentUploadProvider>
                  <MedicationReviewProvider>
                    <RootNavigator />
                  </MedicationReviewProvider>
                  <Toast
                    config={toastConfig}
                    topOffset={60}
                    visibilityTime={4000}
                  />
                </DocumentUploadProvider>
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
