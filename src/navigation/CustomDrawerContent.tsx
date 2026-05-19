import React, { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { getUser } from "../services/userService";

const CustomDrawerContent = (props: any) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const { data: userDetails } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  // Exactly matching the HomeScreen header gradient configuration 🔑
  const headerColors = isDark
    ? ["#064e3b", "#0369a1", "#312e81"]
    : ["#0f766e", "#0ea5e9", "#4f46e5"];

  return (
    <Container isDark={isDark}>
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
            colors={headerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ProfileImage
              source={{ uri: userDetails?.profileImageKey || "" }}
            />
            <UserInfo>
              <Username>
                {userDetails?.userName || "Health Vault User"}
              </Username>
              <UserEmail>
                {userDetails?.email || "user@healthvault.com"}
              </UserEmail>
            </UserInfo>
          </Header>
        </TouchableOpacity>

        <MainContent isDark={isDark}>
          <DrawerSection>
            <DrawerItemList
              {...props}
              descriptor={{
                ...props.descriptor,
                options: {
                  ...props.options,
                  drawerItemStyle: {
                    width: "100%",
                  },
                },
              }}
            />
          </DrawerSection>
        </MainContent>
      </DrawerContentScrollView>

      <BottomSection>
        <Separator isDark={isDark} />
        <DrawerItem
          label="Logout"
          onPress={() => setShowModal(true)}
          icon={({ size }) => (
            <Ionicons name="power-outline" size={size} color="#ef4444" />
          )}
          labelStyle={{
            color: "#ef4444",
            fontWeight: "700",
            fontSize: 16,
            paddingLeft: 20,
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

/**
 * Styled Components 💅
 */

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#0f172a" : "#f8fafc")};
`;

const Header = styled(LinearGradient)`
  padding: 60px 20px 30px 20px;
  flex-direction: row;
  align-items: center;
`;

const ProfileImage = styled.Image`
  width: 65px;
  height: 65px;
  border-radius: 32.5px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
`;

const UserInfo = styled.View`
  margin-left: 15px;
  flex: 1;
`;

const Username = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
`;

const UserEmail = styled.Text`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
`;

const MainContent = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
  margin-top: -20px;
  padding-horizontal: 0px;
  padding-top: 10px;
`;

const DrawerSection = styled.View`
  padding-horizontal: 0px;
`;

const BottomSection = styled.View`
  padding-bottom: 20px;
  padding-horizontal: 0px;
`;

const Separator = styled.View<{ isDark: boolean }>`
  height: 1px;
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#334155" : "#e2e8f0")};
  margin-bottom: 10px;
  opacity: 0.8;
`;
