import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/AppScreens/HomeScreen";
import SummaryScreen from "../../components/Documents/SummaryScreen";
import EditScreen from "../../components/Documents/EditScreen";
import MedicationScreen from "../../screens/AppScreens/DocsCategoryScreens/Medication/MedicationScreen";
import AddMedication from "../../screens/AppScreens/DocsCategoryScreens/Medication/AddMedication";
import SaveDocumentScreen from "../../components/Documents/SaveDocumentScreen";
import { AppStackParamList } from "../types";
import ImagePreview from "../../components/shared/ImagePreview";
import DocumentStack from "./DocumentStack";

const Stack = createNativeStackNavigator<AppStackParamList>();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="DocumentStack" component={DocumentStack} />
      <Stack.Screen name="Medication" component={MedicationScreen} />
      <Stack.Screen name="DocumentSummary" component={SummaryScreen} />
      <Stack.Screen name="AddMedication" component={AddMedication} />
      <Stack.Screen name="EditDocument" component={EditScreen} />
      <Stack.Screen name="ImagePreview" component={ImagePreview} />
      <Stack.Screen name="SaveDocument" component={SaveDocumentScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
