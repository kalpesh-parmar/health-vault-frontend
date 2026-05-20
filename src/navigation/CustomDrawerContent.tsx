import React, { useState } from "react";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ConfirmationModal from "../components/shared/ConfirmationModal";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity, View } from "react-native";
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

  // Gradient matched with the bright purple/pinkish aesthetic in the UI mockup
  const headerColors = isDark ? ["#3b0764", "#1e1b4b"] : ["#a855f7", "#6366f1"]; // Vibrant purple to Indigo gradient

  return (
    <Container isDark={isDark}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
        bounces={false}
      >
        {/* Header Profile Section */}
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
              source={{
                uri:
                  userDetails?.profileImageKey ||
                  "https://via.placeholder.com/150",
              }}
            />
            <UserInfo>
              <Username>{userDetails?.userName || ""}</Username>
              <UserEmail>
                {userDetails?.email || ""}
              </UserEmail>
            </UserInfo>
          </Header>
        </TouchableOpacity>

        {/* Core Main Items Content Body */}
        <MainContent isDark={isDark}>
          <DrawerItemList {...props} />
        </MainContent>
      </DrawerContentScrollView>

      {/* Persistent Bottom Section */}
      <BottomSection>
        <Separator isDark={isDark} />
        <DrawerItem
          label="Logout"
          onPress={() => setShowModal(true)}
          icon={({ size }) => (
            <Ionicons name="power-outline" size={size + 2} color="#ef4444" />
          )}
          labelStyle={{
            color: "#ff0000",
            fontWeight: "700",
            fontSize: 16,
            marginLeft: -8, // Shifts text closer to icon mimicking image structure
          }}
          style={{ marginHorizontal: 16, borderRadius: 8 }}
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
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#0f172a" : "#ffffff")};
`;

const Header = styled(LinearGradient)`
  padding: 50px 24px 45px 24px;
  flex-direction: row;
  align-items: center;
`;

const ProfileImage = styled.Image`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.6);
`;

const UserInfo = styled.View`
  margin-left: 16px;
  flex: 1;
`;

const Username = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
`;

const UserEmail = styled.Text`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
`;

const MainContent = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#0f172a" : "#ffffff")};
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
  margin-top: -24px; /* Pulls the card over the gradient container */
  padding-top: 24px;
`;

const BottomSection = styled.View`
  padding-bottom: 24px;
`;

const Separator = styled.View<{ isDark: boolean }>`
  height: 1px;
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#334155" : "#f1f5f9")};
  margin-horizontal: 24px;
  margin-bottom: 12px;
`;
