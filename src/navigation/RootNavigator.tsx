import React from "react";
import AuthStack from "./stacks/AuthStack";
import AppStack from "./stacks/AppStack";
import { useAuth } from "../context/ContextAPI";
import { NavigationContainer } from "@react-navigation/native";
import Loader from "../components/shared/Loader";

const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();
  return (
    <NavigationContainer>
      {isLoading ? (
        <Loader visible={true} />
      ) : isLoggedIn ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
