import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/HomeScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import AboutScreen from "../../screens/AboutScreen";
import SummaryScreen from "../../screens/SummaryScreen";
import DocumentList from "../../screens/DocumentList";
import { MedicalDocument } from "../../components/Documents/DocumentCard";

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen}/>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="About Us" component={AboutScreen} />
      <Stack.Screen name="DocumentList">
        {() => (
          <DocumentList
            documents={[]}
            handleDelete={function (id: string): void {
              throw new Error("Function not implemented.");
            }}
            handleSummary={function (doc: MedicalDocument): void {
              throw new Error("Function not implemented.");
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DocumentSummary" component={SummaryScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
