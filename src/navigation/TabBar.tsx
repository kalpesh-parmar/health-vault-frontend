import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  return (
    <Container>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any;

        if (route.name === "Home") {
          iconName = isFocused ? "home" : "home-outline";
        } else if (route.name === "Settings") {
          iconName = isFocused ? "settings" : "settings-outline";
        } else if (route.name === "Profile") {
          iconName = isFocused ? "person" : "person-outline";
        }

        return (
            <TabButton key={route.key} onPress={onPress}>
              <Ionicons
                name={iconName}
                size={24}
                color="#000"
              />
              <Label focused={isFocused}>{route.name}</Label>
            </TabButton>
        );
      })}
    </Container>
  );
};

export default TabBar;

const Container = styled.View`
  position: absolute;
  bottom: 20px;
  left: 55px;
  right: 70px;
  height: 70px;
  width :250px;
  padding: 0 20px;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background-color: #ffffff;
  border-radius: 55px;
  elevation: 10;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
  shadow-offset: 0px 4px;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const Label = styled.Text<{ focused: boolean }>`
  font-size: 12px;
  margin-top: 3px;
  color: ${(props: any) => (props.focused ? "#000" : "#000")};
  font-weight: 700;
`;
