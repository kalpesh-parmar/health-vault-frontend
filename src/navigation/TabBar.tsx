import React, { useEffect, useRef } from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Animated } from "react-native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const currentRoute = state.routes[state.index];
  const nestedRouteName =
    getFocusedRouteNameFromRoute(currentRoute) ?? currentRoute.name;

  useEffect(() => {
    const shouldHide = nestedRouteName === "EditProfile";

    Animated.timing(translateY, {
      toValue: shouldHide ? 120 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [nestedRouteName]);

  return (
    <AnimatedContainer
      style={{
        transform: [{ translateY }],
        opacity: translateY.interpolate({
          inputRange: [0, 120],
          outputRange: [1, 0],
        }),
      }}
    >
      <GradientBackground
        colors={["#e0f7fa", "#f3e5f5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
              <Ionicons name={iconName} size={24} color={isFocused ? "#000" : "#777"} />
              <Label focused={isFocused}>{route.name}</Label>
            </TabButton>
          );
        })}
      </GradientBackground>
    </AnimatedContainer>
  );
};

export default TabBar;

const AnimatedContainer = styled(Animated.View)`
  position: absolute;
  bottom: 20px;
  left: 65px;
  right: 65px;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  border-radius: 55px;
  elevation: 5;
`;

const GradientBackground = styled(LinearGradient)`
  flex: 1;
  height: 70px;
  border-radius: 55px;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const Label = styled.Text<{ focused: boolean }>`
  font-size: 12px;
  margin-top: 3px;
  color: ${(props: any) => (props.focused ? "#000" : "#777")};
  font-weight: 700;
`;
