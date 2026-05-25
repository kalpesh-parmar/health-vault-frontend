import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

const TAB_BAR_WIDTH = width - 120;
const HEIGHT = 60;

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { isDark, theme } = useAppTheme();

  const translateY = useRef(new Animated.Value(0)).current;

  const currentRoute = state.routes[state.index];
  const nestedRouteName =
    getFocusedRouteNameFromRoute(currentRoute) ?? currentRoute.name;

  useEffect(() => {
    const shouldHide = nestedRouteName !== "Home";

    Animated.spring(translateY, {
      toValue: shouldHide ? 150 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [nestedRouteName, translateY]);

  const handlePress = (routeName: string) => {
    navigation.navigate(routeName as never);
  };

  const renderIcon = (
    routeName: string,
    icon: keyof typeof Ionicons.glyphMap,
    activeIcon: keyof typeof Ionicons.glyphMap,
    label: string,
  ) => {
    const isFocused = state.routes[state.index].name === routeName;

    return (
      <TabButton activeOpacity={0.85} onPress={() => handlePress(routeName)}>
        <IconWrapper focused={isFocused}>
          <Ionicons
            name={isFocused ? activeIcon : icon}
            size={25}
            color={isFocused ? "#ffffff" : "#000000"}
          />
        </IconWrapper>
      </TabButton>
    );
  };

  const isChatFocused = state.routes[state.index].name === "AIChat";

  return (
    <AnimatedContainer
      style={{
        transform: [{ translateY }],
      }}
    >
      <ShadowContainer>
        <GlassContainer intensity={35} tint={isDark ? "dark" : "light"}>
          <Svg
            width={TAB_BAR_WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${TAB_BAR_WIDTH} ${HEIGHT}`}
            style={{
              position: "absolute",
              top: 0,
            }}
          >
            <Path
              d={`
                M0 30
                C0 10 10 0 30 0
                L${TAB_BAR_WIDTH / 2 - 60} 0
                C${TAB_BAR_WIDTH / 2 - 40} 0 
                 ${TAB_BAR_WIDTH / 2 - 30} 30 
                 ${TAB_BAR_WIDTH / 2} 30
                C${TAB_BAR_WIDTH / 2 + 30} 30 
                 ${TAB_BAR_WIDTH / 2 + 40} 0 
                 ${TAB_BAR_WIDTH / 2 + 60} 0
                L${TAB_BAR_WIDTH - 30} 0
                C${TAB_BAR_WIDTH - 10} 0 ${TAB_BAR_WIDTH} 10 ${TAB_BAR_WIDTH} 30
                L${TAB_BAR_WIDTH} ${HEIGHT}
                L0 ${HEIGHT}
                Z
              `}
              fill={isDark ? "#0f172aee" : "#ffffffee"}
            />
          </Svg>

          <GradientOverlay
            colors={
              isDark
                ? ["#27468dff", "#273784ff", "#1e293b"]
                : ["#ffffff", "#ecfeff", "#eef2ff"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <TabsContainer>
            {renderIcon("Home", "home-outline", "home", "Home")}

            <CenterSpace />

            {renderIcon("Profile", "person-outline", "person", "Profile")}
          </TabsContainer>

          <FloatingButtonWrapper>
            <FloatingButton
              activeOpacity={0.9}
              onPress={() => handlePress("AIChatScreen")}
            >
              <FloatingGradient
                colors={
                  isDark
                    ? ["#4f46e5", "#3b82f6", "#2563eb"]
                    : ["#4f46e5", "#3b82f6", "#2563eb"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={
                    isChatFocused
                      ? "chatbubble-ellipses"
                      : "chatbubble-ellipses-outline"
                  }
                  size={30}
                  color="#fff"
                />
                <Ionicons
                  name={
                    isChatFocused
                      ? "sparkles-outline"
                      : "sparkles"
                  }
                  size={20}
                  color="#fff"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 8,
                  }}
                />
              </FloatingGradient>
            </FloatingButton>
          </FloatingButtonWrapper>
        </GlassContainer>
      </ShadowContainer>
    </AnimatedContainer>
  );
};

export default TabBar;

const AnimatedContainer = styled(Animated.View)`
  position: absolute;
  bottom: 18px;
  width: 100%;
  align-items: center;
  justify-content: center;
`;

const ShadowContainer = styled.View`
  shadow-color: #000;
  shadow-opacity: 0.16;
  shadow-radius: 18px;
  shadow-offset: 0px 8px;
  elevation: 14;
`;

const GlassContainer = styled(BlurView)`
  width: ${TAB_BAR_WIDTH}px;
  height: ${HEIGHT}px;
  overflow: visible;
  border-radius: 28px;
  background-color: transparent;
`;

const GradientOverlay = styled(LinearGradient).attrs(({ theme }: any) => ({
  colors: theme.isDark
    ? ["#4f46e5", "#3b82f6", "#2563eb"]
    : ["#0f766e", "#0ea5e9", "#4f46e5"],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
}))`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 28px;
  opacity: 0.7;
`;

const TabsContainer = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-horizontal: 32px;
`;

const CenterSpace = styled.View`
  width: 95px;
`;

const TabButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
`;

const IconWrapper = styled.View<{ focused: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  background-color: transparent;
`;

const TabLabel = styled.Text<{ focused: boolean }>`
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;

  color: ${({ focused }: { focused: boolean }) =>
    focused ? "#ffffff" : "#000000"};
`;

const FloatingButtonWrapper = styled.View`
  position: absolute;
  top: -28px;
  left: 50%;
  margin-left: -36px;
`;

const FloatingButton = styled(TouchableOpacity)`
  width: 72px;
  height: 72px;
  border-radius: 36px;

  shadow-color: #3b82f6;
  shadow-opacity: 0.4;
  shadow-radius: 14px;
  shadow-offset: 0px 8px;

  elevation: 16;
`;

const FloatingGradient = styled(LinearGradient)`
  width: 100%;
  height: 100%;
  border-radius: 36px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: 5px;
  border-color: rgba(255, 255, 255, 0.92);
`;
