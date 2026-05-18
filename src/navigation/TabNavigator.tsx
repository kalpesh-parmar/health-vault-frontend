import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import React from "react";

import SettingsScreen from "../screens/AppScreens/SettingsScreen";

import TabBar from "./TabBar";

import HomeStack from "./stacks/HomeStack";

import ProfileStack from "./stacks/ProfileStack";

import { TabParamList } from "./types";
import AIChatScreen from "../screens/AppScreens/AIChatScreen";

const Tab = createBottomTabNavigator<TabParamList>();

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

      <Tab.Screen name="AIChatScreen" component={AIChatScreen} />

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabelPosition: "beside-icon" }}
      />

      {/* <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabelPosition: "beside-icon" }}
      /> */}
    </Tab.Navigator>
  );
};

export default TabNavigator;
