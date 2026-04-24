import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/AppScreens/HomeScreen";
import AboutScreen from "../../screens/AppScreens/AboutScreen";
import SummaryScreen from "../../components/Documents/SummaryScreen";
import DocumentList from "../../components/Documents/DocumentList";
import EditScreen from "../../components/Documents/EditScreen";

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="DocumentList" component={DocumentList} />
      <Stack.Screen name="DocumentSummary" component={SummaryScreen} />
      <Stack.Screen name="EditDocument" component={EditScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
