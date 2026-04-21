import React from "react";
import {
    DrawerContentScrollView,
    DrawerItemList,
} from "@react-navigation/drawer";
import styled from "styled-components/native";

const CustomDrawerContent = (props: any) => {
    const { user } = props;

    return (
        <Container>
            <DrawerContentScrollView
                contentContainerStyle={{ paddingTop: 0 }}
            >
                <Header>
                    <Avatar
                        source={{
                            uri: "https://i.pravatar.cc/100",
                        }}
                    />
                    <Title>Health Vault</Title>
                    <Subtitle>{user?.name || "Guest User"}</Subtitle>
                </Header>

                <DrawerSection>
                    <DrawerItemList {...props} />
                </DrawerSection>
            </DrawerContentScrollView>
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
`;

const Avatar = styled.Image`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  margin-bottom: 12px;
`;

const Title = styled.Text`
  color: #000000;
  font-size: 18px;
  font-weight: 500;
`;

const Subtitle = styled.Text`
  color: #000000;
  font-size: 16px;
  font-weight: 600;
`;

const DrawerSection = styled.View`
  flex: 1;
  padding-top: 10px;
`;