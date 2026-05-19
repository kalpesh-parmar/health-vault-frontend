import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import TabNavigator from "../navigation/TabNavigator";
import AboutScreen from "../screens/AppScreens/AboutScreen";
import CustomDrawerContent from "./CustomDrawerContent";
import ProfileStack from "./stacks/ProfileStack";
import { useAppTheme } from "../context/ThemeContext";
import DocumentStack from "./stacks/DocumentStack";
import MedicationStack from "./stacks/MedicationStack";
import ReminderScreen from "../screens/AppScreens/Reminders/ReminderScreen";

const Drawer = createDrawerNavigator();

const CustomDrawerNavigator = () => {
  const { theme } = useAppTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,

        drawerStyle: {
          backgroundColor: theme.colors.background,
          width: 280,
          paddingHorizontal: 0,
        },

        drawerActiveTintColor: theme.colors.accent,
        drawerInactiveTintColor: theme.colors.textMuted,

        drawerLabelStyle: {
          fontSize: 16,
        },
      }}
    >
      <Drawer.Screen
        name="HOME"
        options={{
          drawerLabel: "HOME",
          drawerIcon: ({ size }) => (
            <Ionicons name="home" size={size} color={"rgba(0,0,0,0.8)"} />
          ),
        }}
      >
        {() => <TabNavigator />}
      </Drawer.Screen>

      <Drawer.Screen
        name="ABOUT"
        component={AboutScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Ionicons
              name="information-circle"
              size={size}
              color={"rgba(0,0,0,0.8)"}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="PROFILE"
        component={ProfileStack}
        options={{
          drawerIcon: ({ size }) => (
            <Ionicons name="person" size={size} color={"rgba(0,0,0,0.8)"} />
          ),
        }}
      />

      <Drawer.Screen
        name="DOCUMENTS"
        component={DocumentStack}
        options={{
          drawerIcon: ({ size }) => (
            <Ionicons name="documents" size={size} color={"rgba(0,0,0,0.8)"} />
          ),
        }}
      />

      <Drawer.Screen
        name="MEDICATION"
        component={MedicationStack}
        options={{
          drawerIcon: ({ size }) => (
            <Ionicons name="medkit" size={size} color={"rgba(0,0,0,0.8)"} />
          ),
        }}
      />

      <Drawer.Screen
        name="REMINDERS"
        component={ReminderScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Ionicons
              name="alert-circle"
              size={size}
              color={"rgba(0,0,0,0.8)"}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default CustomDrawerNavigator;
