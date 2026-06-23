import React from "react";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import LoginScreen from "../screens/auth/LoginScreen";
import OtpVerificationScreen from "../screens/auth/OtpVerificationScreen";
import { AuthStackParamList } from "../types/navigation";

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
export { AuthNavigator };
