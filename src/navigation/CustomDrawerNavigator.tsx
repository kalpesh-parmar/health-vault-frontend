import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import TabNavigator from "../navigation/TabNavigator";
import AboutScreen from "../screens/AppScreens/AboutScreen";
import ProfileScreen from "../screens/AppScreens/ProfileScreen";
import CustomDrawerContent from "./CustomDrawerContent";
import ProfileStack from "./stacks/ProfileStack";
import { useAppTheme } from "../context/ThemeContext";
import DocumentStack from "./stacks/DocumentStack";
import MedicationScreen from "../screens/AppScreens/DocsCategoryScreens/Medication/MedicationScreen";
import NotificationScreen from "../screens/AppScreens/Notifications";
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

        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textMuted,

        drawerLabelStyle: {
          fontSize: 16,
          marginLeft: -10,
        },
      }}
    >
      <Drawer.Screen
        name="HOME"
        options={{
          drawerLabel: "HOME",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <TabNavigator />}
      </Drawer.Screen>

      <Drawer.Screen
        name="ABOUT"
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

      <Drawer.Screen
        name="PROFILE"
        component={ProfileStack}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="DOCUMENTS"
        component={DocumentStack}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="documents-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="MEDICATION"
        component={MedicationStack}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="medkit-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="NOTIFICATIONS"
        component={NotificationScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="REMINDERS"
        component={ReminderScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="alert-circle-outline"
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
