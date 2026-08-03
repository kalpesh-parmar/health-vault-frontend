import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/AppScreens/HomeScreen";
import SaveDocumentScreen from "../../screens/AppScreens/SaveDocumentScreen";
import { AppStackParamList } from "../types";
import ImagePreview from "../../screens/AppScreens/ImagePreviewScreen";
import DocumentStack from "./DocumentStack";
import NotificationScreen from "../../screens/AppScreens/Notifications";
import AIChatScreen from "../../screens/AppScreens/AIChatScreen";
import MedicationStack from "./MedicationStack";
import ReminderScreen from "../../screens/AppScreens/Reminders/ReminderScreen";
import MultiUploadScreen from "../../screens/AppScreens/MultiUploadScreen";
import DocumentProcessingScreen from "../../screens/AppScreens/DocumentProcessingScreen";
import UploadSuccessScreen from "../../components/shared/UploadSuccessfullScreen";

import ReviewMedicinesScreen from "../../screens/AppScreens/MedicationReview/ReviewMedicinesScreen";
import MedicineDetailsScreen from "../../screens/AppScreens/MedicationReview/MedicineDetailsScreen";
import ReviewAllMedicinesScreen from "../../screens/AppScreens/MedicationReview/ReviewAllMedicinesScreen";
import ConfirmMedicinesScreen from "../../screens/AppScreens/MedicationReview/ConfirmMedicinesScreen";
import MedicinesSuccessScreen from "../../screens/AppScreens/MedicationReview/MedicinesSuccessScreen";

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
      <Stack.Screen name="ReviewMedicines" component={ReviewMedicinesScreen} />
      <Stack.Screen name="MedicineDetails" component={MedicineDetailsScreen} />
      <Stack.Screen name="ReviewAllMedicines" component={ReviewAllMedicinesScreen} />
      <Stack.Screen name="ConfirmMedicines" component={ConfirmMedicinesScreen} />
      <Stack.Screen name="MedicinesSuccess" component={MedicinesSuccessScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="Reminders" component={ReminderScreen} />
      <Stack.Screen name="UploadSuccess" component={UploadSuccessScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
