import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../../screens/AuthScreens/LoginScreen";
import SignupScreen from "../../screens/AuthScreens/SignupScreen";

const Stack = createStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false, animation: "reveal_from_bottom" }}
    >
      <Stack.Screen name="Login">{() => <LoginScreen />}</Stack.Screen>
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
