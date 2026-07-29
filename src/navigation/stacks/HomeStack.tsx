import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/AppScreens/HomeScreen";
import SaveDocumentScreen from "../../screens/AppScreens/SaveDocumentScreen";
import { AppStackParamList } from "../types";
import ImagePreview from "../../screens/AppScreens/ImagePreviewScreen";
import DocumentStack from "./DocumentStack";
import NotificationScreen from "../../screens/AppScreens/Notifications";
import AIChatScreen from "../../screens/AppScreens/AIChatScreen";
import HealthDashboardScreen from "../../screens/AppScreens/HealthDashboardScreen";
import WearableSettingsScreen from "../../screens/AppScreens/WearableSettingsScreen";
import HealthConnectCompatibilityScreen from "../../screens/AppScreens/HealthConnectCompatibilityScreen";
import HealthConnectInstallScreen from "../../screens/AppScreens/HealthConnectInstallScreen";
import HealthConnectPermissionsScreen from "../../screens/AppScreens/HealthConnectPermissionsScreen";
import HealthConnectSourcesScreen from "../../screens/AppScreens/HealthConnectSourcesScreen";
import HealthConnectHelpScreen from "../../screens/AppScreens/HealthConnectHelpScreen";
import HealthConnectSuccessScreen from "../../screens/AppScreens/HealthConnectSuccessScreen";
import HealthConnectPermissionDetailsScreen from "../../screens/AppScreens/HealthConnectPermissionDetailsScreen";
import MedicationStack from "./MedicationStack";
import ReminderScreen from "../../screens/AppScreens/Reminders/ReminderScreen";
import MultiUploadScreen from "../../screens/AppScreens/MultiUploadScreen";
import DocumentProcessingScreen from "../../screens/AppScreens/DocumentProcessingScreen";
import UploadSuccessScreen from "../../components/shared/UploadSuccessfullScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="DocumentStack" component={DocumentStack} />
      <Stack.Screen name="MedicationStack" component={MedicationStack} />
      <Stack.Screen name="ImagePreview" component={ImagePreview} />
      <Stack.Screen name="SaveDocument" component={SaveDocumentScreen} />
      <Stack.Screen name="MultiUpload" component={MultiUploadScreen} />
      <Stack.Screen name="DocumentProcessing" component={DocumentProcessingScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="HealthDashboard" component={HealthDashboardScreen} />
      <Stack.Screen name="WearableSettings" component={WearableSettingsScreen} />
      <Stack.Screen name="HealthConnectCompatibility" component={HealthConnectCompatibilityScreen} />
      <Stack.Screen name="HealthConnectInstall" component={HealthConnectInstallScreen} />
      <Stack.Screen name="HealthConnectPermissions" component={HealthConnectPermissionsScreen} />
      <Stack.Screen name="HealthConnectSources" component={HealthConnectSourcesScreen} />
      <Stack.Screen name="HealthConnectHelp" component={HealthConnectHelpScreen} />
      <Stack.Screen name="HealthConnectSuccess" component={HealthConnectSuccessScreen} />
      <Stack.Screen name="HealthConnectPermissionDetails" component={HealthConnectPermissionDetailsScreen} />
      <Stack.Screen name="Reminders" component={ReminderScreen} />
      <Stack.Screen name="UploadSuccess" component={UploadSuccessScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
