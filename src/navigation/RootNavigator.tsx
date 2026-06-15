import React, { useState } from "react";
import CustomDrawerNavigator from "./CustomDrawerNavigator";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer } from "@react-navigation/native";
import AuthStack from "./stacks/AuthStack";
import ModernLoader from "../components/shared/Loader";
import AnimatedSplashScreen from "../components/shared/AnimatedSplashScreen";

const RootNavigator = () => {
  const authContext = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  
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
        <CustomDrawerNavigator />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
