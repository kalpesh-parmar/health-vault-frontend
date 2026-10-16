import React, { useState } from "react";
import CustomDrawerNavigator from "./CustomDrawerNavigator";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import ModernLoader from "../components/shared/Loader";
import AnimatedSplashScreen from "../components/shared/AnimatedSplashScreen";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "../services/userService";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import { useNetwork } from "../context/NetworkContext";

export const navigationRef = createNavigationContainerRef<any>();

const RootNavigator = () => {
  const authContext = useAuth();
  const { isReady: isNetworkReady, isOffline } = useNetwork();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
    enabled: authContext.isAuthenticated && isNetworkReady && !isOffline,
  });

  const isProfileIncomplete = (user: any) => {
    if (!user) return true;
    if (!user?.onboardingCompleted) return true;
    return false;
  };
  
  return (
    <NavigationContainer ref={navigationRef}>
      {isSplashVisible ? (
        <AnimatedSplashScreen onAnimationEnd={() => setIsSplashVisible(false)} />
      ) : authContext.isLoading ? (
        <ModernLoader
          visible={true}
          title="Initializing System..."
          subtitle="Loading your secure vault"
        />
      ) : !isNetworkReady ? (
        <ModernLoader
          visible={true}
          title="Checking connection..."
          subtitle="Preparing your secure vault"
        />
      ) : authContext.isAuthenticated ? (
        isOffline ? (
          // Keep the authenticated app mounted while offline. The network
          // blocker prevents actions, and avoids showing an endless profile
          // loading state for a request that cannot complete.
          <CustomDrawerNavigator />
        ) : isProfileLoading ? (
          <ModernLoader
            visible={true}
            title="Loading Profile..."
            subtitle="Please wait while we retrieve your secure profile"
          />
        ) : isProfileIncomplete(userProfile) ? (
          <OnboardingScreen />
        ) : (
          <CustomDrawerNavigator />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
