import React from "react";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import MobileLoginScreen from "../screens/auth/MobileLoginScreen";
import OtpVerificationScreen from "../screens/auth/OtpVerificationScreen";
import { AuthStackParamList } from "../types/navigation";

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MobileLogin"
      screenOptions={{
        headerShown: false,
        // Premium fade screen transitions for elegant experience
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
      }}
    >
      <Stack.Screen name="MobileLogin" component={MobileLoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
export { AuthNavigator };
