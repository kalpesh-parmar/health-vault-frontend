import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../../screens/AuthScreens/LoginScreen";
import SignupScreen from "../../screens/AuthScreens/SignupScreen";
import ForgotPassword from "../../screens/AuthScreens/ForgotPassword";
import VerifyOTP from "../../screens/AuthScreens/VerifyOTP";
import ResetPassword from "../../screens/AuthScreens/ResetPassword";
import { AuthStackParamList } from "../types";

const Stack = createStackNavigator<AuthStackParamList>();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false, animation: "reveal_from_bottom" }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
};

export default AuthStack;
