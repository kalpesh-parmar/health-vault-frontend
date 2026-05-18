import React from "react";
import CustomDrawerNavigator from "./CustomDrawerNavigator";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer } from "@react-navigation/native";
import AuthStack from "./stacks/AuthStack";
import ModernLoader from "../components/shared/Loader";

const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();
  return (
    <NavigationContainer>
      {isLoading ? (
        <ModernLoader
          visible={true}
          title="Initializing System..."
          subtitle="Loading your secure vault"
        />
      ) : isLoggedIn ? (
        <CustomDrawerNavigator />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
