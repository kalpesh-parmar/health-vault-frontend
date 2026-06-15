import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useWindowDimensions } from "react-native";
import TabNavigator from "../navigation/TabNavigator";
import AboutScreen from "../screens/AppScreens/AboutScreen";
import CustomDrawerContent from "./CustomDrawerContent";
import ProfileStack from "./stacks/ProfileStack";
import DocumentStack from "./stacks/DocumentStack";
import MedicationStack from "./stacks/MedicationStack";
import ReminderScreen from "../screens/AppScreens/Reminders/ReminderScreen";
import ResetPassword from "../screens/AuthScreens/ResetPassword";
import { useAppTheme } from "../context/ThemeContext";

const Drawer = createDrawerNavigator();

const CustomDrawerNavigator = () => {
  const { theme } = useAppTheme();
  const dimensions = useWindowDimensions();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.colors.background,
          width: dimensions.width * 0.82,
        },
        drawerItemStyle: {
          marginHorizontal: 16,
          paddingVertical: 4,
          borderRadius: 14,
        },
        drawerActiveBackgroundColor: theme.colors.primary + "15",
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textSecondary,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: "600",
        },
      }}
    >
      <Drawer.Screen
        name="HOME"
        options={{
          drawerLabel: "My Profile",
          drawerIcon: ({ color, size }) => (
            <Feather name="user" size={size + 2} color={color} />
          ),
        }}
      >
        {() => <TabNavigator />}
      </Drawer.Screen>

      <Drawer.Screen
        name="MEDICATION"
        component={MedicationStack}
        options={{
          drawerLabel: "Medications",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar-heart"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="DOCUMENTS"
        component={DocumentStack}
        options={{
          drawerLabel: "My Documents",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="folder-open-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="PROFILE"
        component={ProfileStack}
        options={{
          drawerLabel: "Profile",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size + 2} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="REMINDERS"
        component={ReminderScreen}
        options={{
          drawerLabel: "Reminders",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />



      <Drawer.Screen
        name="Reset Password"
        component={ResetPassword}
        options={{
          drawerLabel: "Reset Password",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="help-circle-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="ABOUT"
        component={AboutScreen}
        options={{
          drawerLabel: "About Us",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default CustomDrawerNavigator;
