import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import ProfileScreen from "../screens/AppScreens/ProfileScreen";
import HomeStack from "./stacks/HomeStack";
import SettingsScreen from "../screens/AppScreens/SettingsScreen";
import TabBar from "./TabBar";

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

      <Tab.Screen name="Profile">{() => <ProfileScreen />}</Tab.Screen>

      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
