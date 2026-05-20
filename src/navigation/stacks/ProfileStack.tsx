import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EditProfile from "../../screens/AppScreens/EditProfileScreen";
import { ProfileStackParamList } from "../types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}

    >
      <Stack.Screen name="EditProfile" component={EditProfile} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
