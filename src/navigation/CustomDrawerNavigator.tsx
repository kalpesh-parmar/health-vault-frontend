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
import { useAppTheme } from "../context/ThemeContext";
import { useAppConstants } from "../utils/translationUtils";

const Drawer = createDrawerNavigator();

const CustomDrawerNavigator = () => {
  const { theme } = useAppTheme();
  const dimensions = useWindowDimensions();
  const constants = useAppConstants();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
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
          drawerLabel: constants?.home || "Home",
          drawerIcon: ({ color, size }) => (
            <Feather name="home" size={size + 2} color={color} />
          ),
        }}
      >
        {() => <TabNavigator />}
      </Drawer.Screen>

      <Drawer.Screen
        name="MEDICATION"
        component={MedicationStack}
        options={{
          drawerLabel: constants?.medications || "Medications",
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
          drawerLabel: constants?.documents || "Documents",
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
          drawerLabel: constants?.profile || "Profile",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size + 2} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="REMINDERS"
        component={ReminderScreen}
        options={{
          drawerLabel: constants?.reminders || "Reminders",
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
        name="ABOUT"
        component={AboutScreen}
        options={{
          drawerLabel: constants?.aboutUs || "About Us",
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
