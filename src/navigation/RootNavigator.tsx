import React from "react";
import AuthStack from "./stacks/AuthStack";
import AppStack from "./stacks/AppStack";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();
  return (
    <NavigationContainer>
      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : isLoggedIn ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
