import React, { useState } from "react";
import CustomDrawerNavigator from "./CustomDrawerNavigator";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import ModernLoader from "../components/shared/Loader";
import AnimatedSplashScreen from "../components/shared/AnimatedSplashScreen";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "../services/userService";
import { getConstantsByProfile, setAppLanguage } from "../utils/translationUtils";
import OnboardingScreen from "../screens/auth/OnboardingScreen";

export const navigationRef = createNavigationContainerRef<any>();

const RootNavigator = () => {
  const authContext = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      const userData = response?.data || response;
      if (userData?.preferredLanguage) {
        setAppLanguage(userData.preferredLanguage);
      }
      return userData;
    },
    enabled: authContext.isAuthenticated,
  });

  React.useEffect(() => {
    if (userProfile?.preferredLanguage) {
      setAppLanguage(userProfile.preferredLanguage);
    }
  }, [userProfile?.preferredLanguage]);


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
