import React, { useState } from "react";
import CustomDrawerNavigator from "./CustomDrawerNavigator";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import ModernLoader from "../components/shared/Loader";
import AnimatedSplashScreen from "../components/shared/AnimatedSplashScreen";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "../services/userService";
import OnboardingScreen from "../screens/auth/OnboardingScreen";

const RootNavigator = () => {
  const authContext = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
    enabled: authContext.isAuthenticated,
  });

  console.log("[USER_PROFILE]", userProfile);

  const isProfileIncomplete = (user: any) => {
    if (!user) return true;
    if (!user?.firstName || user?.firstName === "User") return true;
    if (!user?.lastName || user?.lastName?.startsWith("+")) return true;
    if (!user?.dateOfBirth) return true;
    if (!user?.gender) return true;
    return false;
  };
  
  return (
    <NavigationContainer>
      {isSplashVisible ? (
        <AnimatedSplashScreen onAnimationEnd={() => setIsSplashVisible(false)} />
      ) : authContext.isLoading ? (
        <ModernLoader
          visible={true}
          title="Initializing System..."
          subtitle="Loading your secure vault"
        />
      ) : authContext.isAuthenticated ? (
        isProfileLoading ? (
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
