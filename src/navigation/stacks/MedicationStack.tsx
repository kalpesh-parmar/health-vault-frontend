import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MedicationStackParamList } from "../../types/navigation";
import MedicationListScreen from "../../screens/AppScreens/DocsCategoryScreens/Medication/MedicationScreen";
import MedicationOperation from "../../screens/AppScreens/DocsCategoryScreens/Medication/MedicationOperation";

const Stack = createNativeStackNavigator<MedicationStackParamList>();

const MedicationStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="MedicationList"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MedicationList"
        component={MedicationListScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="MedicationOperation"
        component={MedicationOperation}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default MedicationStack;