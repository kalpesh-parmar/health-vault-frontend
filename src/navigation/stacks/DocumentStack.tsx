import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DocumentsStackParamList } from "../types";
import DocumentList from "../../screens/AppScreens/DocumentListScreen";
import DocumentSummary from "../../screens/AppScreens/DocumentSummaryScreen";
import EditScreen from "../../screens/AppScreens/EditDocumentScreen";

const Stack = createNativeStackNavigator<DocumentsStackParamList>();

const DocumentStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}

    >
      <Stack.Screen name="DocumentList" component={DocumentList} />
      <Stack.Screen name="DocumentSummary" component={DocumentSummary} />
      <Stack.Screen name="EditDocument" component={EditScreen} />
    </Stack.Navigator>
  );
};

export default DocumentStack;
