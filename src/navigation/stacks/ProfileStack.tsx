import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../../screens/AppScreens/ProfileScreen";
import EditProfile from "../../components/EditProfile";
import { ProfileStackParamList } from "../types";
import DocumentStack from "./DocumentStack";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}

    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="DocumentList" component={DocumentStack} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
