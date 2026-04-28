import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import TabNavigator from "../navigation/TabNavigator";
import AboutScreen from "../screens/AppScreens/AboutScreen";
import ProfileScreen from "../screens/AppScreens/ProfileScreen";
import CustomDrawerContent from "./CustomDrawerContent";
import ProfileStack from "./stacks/ProfileStack";

const Drawer = createDrawerNavigator();

const CustomDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,

        drawerStyle: {
          backgroundColor: "#F8FAFC",
          width: 260,
        },

        drawerActiveTintColor: "#2563EB",
        drawerInactiveTintColor: "#64748B",

        drawerLabelStyle: {
          fontSize: 16,
          marginLeft: -10,
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <TabNavigator />}
      </Drawer.Screen>

      <Drawer.Screen
        name="About Us"
        component={AboutScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default CustomDrawerNavigator;
