import React from "react";
import AuthStack from "./stacks/AuthStack";
import AppStack from "./stacks/AppStack";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import MedicationScreen from "../screens/AppScreens/DocsCategoryScreens/Medication/MedicationScreen";
import EmptyContent from "../components/shared/EmptyContent";
import DocumentList from "../components/shared/Documents/DocumentList";
import SummaryScreen from "../components/shared/Documents/SummaryScreen";

const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();
  return (
    <NavigationContainer>
      {/* {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : isLoggedIn ? (
        <AppStack />
      ) : (
        <AuthStack />
      )} */}
      <SummaryScreen
        document={{
          id: "1",
          title: "First Report",
          category: "Medical",
          type: "PDF",
          createdAt: "2023-10-12",
        }}
      />
    </NavigationContainer>
  );
};

export default RootNavigator;
