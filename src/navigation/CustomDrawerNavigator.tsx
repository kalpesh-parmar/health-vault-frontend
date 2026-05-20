import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import TabNavigator from "../navigation/TabNavigator";
import AboutScreen from "../screens/AppScreens/AboutScreen";
import CustomDrawerContent from "./CustomDrawerContent";
import ProfileStack from "./stacks/ProfileStack";
import DocumentStack from "./stacks/DocumentStack";
import MedicationStack from "./stacks/MedicationStack";
import ReminderScreen from "../screens/AppScreens/Reminders/ReminderScreen";
import ForgotPasswordScreen from "../screens/AuthScreens/ForgotPassword";
import { useAppTheme } from "../context/ThemeContext";

const Drawer = createDrawerNavigator();

const CustomDrawerNavigator = () => {
  const { theme, isDark } = useAppTheme();

  // Color profiles mirroring the reference mock visual aesthetic
  const activeBgColor = isDark ? "#1e293b" : "#f1f5f9";
  const itemTextColor = isDark ? "#cbd5e1" : "#334155";

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          width: 290,
        },
        // Container block styling for every menu line row item
        drawerItemStyle: {
          marginHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 8,
          width: "90%",
        },
        drawerActiveBackgroundColor: activeBgColor,
        drawerActiveTintColor: theme.colors.accent || "#4f46e5",
        drawerInactiveTintColor: itemTextColor,
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
          marginLeft: 5, // Pulls text closer to icons matching reference mockup close spacing
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
        name="FORGOT PASSWORD"
        component={ForgotPasswordScreen}
        options={{
          drawerLabel: "Forgot Password",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size + 2} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Reset Password"
        component={ForgotPasswordScreen}
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
