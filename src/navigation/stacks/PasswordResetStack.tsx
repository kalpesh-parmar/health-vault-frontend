import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ForgotPassword from "../../screens/AuthScreens/ForgotPassword";
import VerifyOTP from "../../screens/AuthScreens/VerifyOTP";
import ResetPassword from "../../screens/AuthScreens/ResetPassword";
import { AuthStackParamList } from "../types";

const Stack = createStackNavigator<AuthStackParamList>();

const PasswordResetStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="ForgotPassword"
      screenOptions={{ headerShown: false, animation: "reveal_from_bottom" }}
    >
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
};

export default PasswordResetStack;
