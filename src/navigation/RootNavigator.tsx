import React from "react";
import AuthStack from "./stacks/AuthStack";
import AppStack from "./stacks/AppStack";
import { useAuth } from "../context/AuthContext";
import { NavigationContainer } from "@react-navigation/native";
import Loader from "../components/shared/Loader";
import DocumentList from "../components/Documents/DocumentList";
import SummaryScreen from "../components/Documents/SummaryScreen";
import ProfileScreen from "../screens/AppScreens/ProfileScreen";
import HomeScreen from "../screens/AppScreens/HomeScreen";
import AddMedication from "../screens/AppScreens/DocsCategoryScreens/Medication/AddMedication";

const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();
  return (
    <NavigationContainer>
      {/* {isLoading ? (
        <Loader visible={true} />
      ) : isLoggedIn ? (
        <AppStack />
      ) : (
        <AuthStack />
      )} */}
      <AddMedication />
    </NavigationContainer>
  );
};

export default RootNavigator;
