import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import SettingsScreen from "../screens/AppScreens/SettingsScreen";
import TabBar from "./TabBar";
import HomeStack from "./stacks/HomeStack";
import ProfileStack from "./stacks/ProfileStack";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: "Home" }}>
        {() => <HomeStack />}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileStack} />

      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
