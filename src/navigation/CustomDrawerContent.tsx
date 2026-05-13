import React, { useEffect, useState } from "react";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ConfirmationModal from "../components/shared/ConfirmationModal";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../context/ThemeContext";
import { AppStackParamList } from "./types";
import { useMutation } from "@tanstack/react-query";
import { getUser } from "../services/userService";

type userDetails = {
  userName: string;
  email: string;
}

const CustomDrawerContent = (props: any) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark, theme } = useAppTheme();
  const [userDetails, setUserDetails] = useState<userDetails>({
    userName: "",
    email: "",
  });

  const { mutateAsync: getProfile } = useMutation({
    mutationFn: getUser,
    onSuccess: (result) => {
      setUserDetails({
        userName: result?.data?.userName,
        email: result?.data?.email,
      });
    },
    onError: (error) => {
      console.log(error);
    },
  });

  useEffect(() => {
    getProfile();
  }, []);

  return (
    <Container>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          paddingTop: 0,
          paddingHorizontal: 0,
        }}
        bounces={false}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Profile")}
        >
          <Header
            colors={isDark ? ["#1e293b", "#334155"] : ["#8338ec", "#3a86ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ProfileImage source={{ uri: "https://i.pravatar.cc/150" }} />
            <UserInfo>
              <Username>{userDetails?.userName}</Username>
              <UserEmail>{userDetails?.email}</UserEmail>
            </UserInfo>
          </Header>
        </TouchableOpacity>

        <MainContent>
          <DrawerSection>
            {/* If you use DrawerItemList, you can control its internal 
                spacing via screenOptions in your Navigator file 
            */}
            <DrawerItemList
              {...props}
              descriptor={{
                ...props.descriptor,
                options: {
                  ...props.options,
                  drawerItemStyle: {
                    marginHorizontal: 0,
                    width: "100%",
                  },
                },
              }}
            />
          </DrawerSection>
        </MainContent>
      </DrawerContentScrollView>

      <BottomSection>
        <Separator />
        <DrawerItem
          label="Logout"
          onPress={() => setShowModal(true)}
          icon={({ size }) => (
            <Ionicons name="power-outline" size={size} color="#ff4d4d" />
          )}
          labelStyle={{
            color: "#ff4d4d",
            fontWeight: "bold",
            fontSize: 16,
            marginLeft: -10,
          }}
        />
      </BottomSection>

      {showModal && (
        <ConfirmationModal
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </Container>
  );
};

export default CustomDrawerContent;

/** * Styled Components
 */

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled(LinearGradient)`
  padding: 60px 20px 30px 20px;
  /* Removed border radius to ensure it touches the side edges perfectly */
  flex-direction: row;
  align-items: center;
`;

const ProfileImage = styled.Image`
  width: 65px;
  height: 65px;
  border-radius: 32.5px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.5);
`;

const UserInfo = styled.View`
  margin-left: 15px;
  flex: 1;
`;

const Username = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
`;

const UserEmail = styled.Text`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
`;

const MainContent = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
  margin-top: -20px;
  /* Ensure no horizontal padding here */
  padding-horizontal: 0px;
  padding-top: 10px;
`;

const DrawerSection = styled.View`
  /* Setting padding to 0 so the active background indicator 
     of the DrawerItem touches the edges */
  padding-horizontal: 0px;
`;

const BottomSection = styled.View`
  padding-bottom: 20px;
  padding-horizontal: 0px;
`;

const Separator = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.divider || "#eeeeee"};
  margin-bottom: 10px;
  opacity: 0.5;
`;
