import React, { useState } from "react";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import LogoutModal from "../components/Auth/LogoutModal";

const CustomDrawerContent = (props: any) => {
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <Container>
      <DrawerContentScrollView contentContainerStyle={{ paddingTop: 0 }}>
        <Header>
          <Title>Health Vault</Title>
        </Header>

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
          icon={() => (
            <Ionicons name="log-out-outline" size={30} color="red" />
          )}
          labelStyle={{ color: "red", fontWeight: "600", fontSize: 16, letterSpacing: 1 }}
        />
      </BottomSection>

      {showModal && (
        <LogoutModal showModal={showModal} onClose={() => setShowModal(false)} />
      )}
    </Container>
  );
};

export default CustomDrawerContent;

const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
`;

const Header = styled.View`
  padding: 24px 20px;
  border-radius: 25px 0 25px 0;
  background-color: #607c98ff;
  margin: 50px 20px 0;
  align-items: center;
  justify-content: center;
`;

const Title = styled.Text`
  color: #000000;
  font-size: 20px;
  font-weight: 600;
`;

const DrawerSection = styled.View`
  flex: 1;
  justify-content: space-between;
  padding-top: 40px;
`;

const BottomSection = styled.View`
  border-top-width: 1px;
  border-top-color: #d1d3d7ff;
  padding: 10px 0 20px;
`;
