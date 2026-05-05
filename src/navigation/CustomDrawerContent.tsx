import React, { useState } from "react";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import LogoutModal from "../components/Auth/LogoutModal";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../context/ThemeContext";
import { AppStackParamList } from "./types";

const CustomDrawerContent = (props: any) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark, theme } = useAppTheme();

  return (
    <Container>
      <DrawerContentScrollView contentContainerStyle={{ paddingTop: 0 }}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Header
            colors={isDark ? ["#1e293b", "#334155"] : ["#4f46e5", "#7c3aed"]}
          >
            <ProfileImage source={{ uri: "https://i.pravatar.cc/150" }} />

            <UserInfo>
              <Username>Dharmik</Username>
              <Subtitle>Welcome back 👋</Subtitle>
            </UserInfo>
          </Header>
        </TouchableOpacity>

        <DrawerSection>
          <DrawerItemList {...props} />
        </DrawerSection>
      </DrawerContentScrollView>

      <BottomSection>
        <DrawerItem
          label="Logout"
          onPress={() => {
            setShowModal(true);
          }}
          icon={() => <Ionicons name="log-out-outline" size={30} color={theme.colors.error} />}
          labelStyle={{
            color: theme.colors.error,
            fontWeight: "600",
            fontSize: 16,
            letterSpacing: 1,
          }}
        />
      </BottomSection>

      {showModal && (
        <LogoutModal
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </Container>
  );
};

export default CustomDrawerContent;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled(LinearGradient).attrs({
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
})`
  padding: 10px;
  height: 70px;
  margin-top: 50px;
  border-radius: 26px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  elevation: 10;
`;

const ProfileImage = styled.Image`
  width: 52px;
  height: 52px;
  border-radius: 26px;
  border: 2px solid ${({ theme }: any) => theme.colors.primary};
`;

const UserInfo = styled.View`
  margin-left: 14px;
`;

const Username = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
`;

const Subtitle = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 2px;
`;

const DrawerSection = styled.View`
  flex: 1;
  justify-content: space-between;
  padding-top: 20px;
`;

const BottomSection = styled.View`
  border-top-width: 1px;
  border-top-color: ${({ theme }: any) => theme.colors.divider};
  padding: 10px 0 20px;
`;
