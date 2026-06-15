import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated as RNAnimated,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Text,
} from "react-native";
import styled from "styled-components/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

const HEIGHT = 62;

interface TabItemProps {
  isFocused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isDark: boolean;
  theme: any;
}

const TabItem: React.FC<TabItemProps> = ({
  isFocused,
  icon,
  activeIcon,
  label,
  onPress,
}) => {
  const scale = useSharedValue(isFocused ? 1.06 : 1.0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.06 : 1.0, { damping: 15 });
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const activeColor = "#ffffff";
  const inactiveColor = "rgba(255, 255, 255, 0.45)";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabItemContainer}
    >
      <Animated.View
        style={[
          styles.tabItemInner,
          isFocused ? styles.activePill : styles.inactivePill,
          animStyle,
        ]}
      >
        <Ionicons
          name={isFocused ? activeIcon : icon}
          size={22}
          color={isFocused ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? "600" : "500",
            },
          ]}
          allowFontScaling={true}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { isDark, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();

  const translateY = useRef(new RNAnimated.Value(0)).current;
  const pulseScale = useSharedValue(1.0);

  const currentRoute = state.routes[state.index];
  const nestedRouteName =
    getFocusedRouteNameFromRoute(currentRoute) ?? currentRoute.name;

  const tabBarWidth = width * 0.90; // float width around 90%
  const bottomOffset = Math.max(12, insets.bottom + 6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    console.log("[TabBar Redesign Debug] safeAreaInsets.bottom:", insets.bottom);
    console.log("[TabBar Redesign Debug] tabBarHeight:", HEIGHT);
    console.log("[TabBar Redesign Debug] calculated bottomOffset:", bottomOffset);
    console.log("[TabBar Redesign Debug] calculated tabBarWidth:", tabBarWidth);
  }, [insets.bottom, screenHeight, tabBarWidth, bottomOffset]);

  useEffect(() => {
    const visibleRoutes = ["Home", "Profile", "EditProfile"];
    const shouldHide = !visibleRoutes.includes(nestedRouteName);

    RNAnimated.spring(translateY, {
      toValue: shouldHide ? 150 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [nestedRouteName, translateY]);

  const handlePress = (routeName: string) => {
    navigation.navigate(routeName as never);
  };

  const isChatFocused = state.routes[state.index].name === "AIChatScreen";

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  return (
    <AnimatedContainer
      style={{
        transform: [{ translateY }],
        bottom: bottomOffset,
      }}
    >
      <ShadowContainer>
        <GlassContainer
          colors={["#1E1B4B", "#312E81"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: tabBarWidth }}
        >
          {/* Column 1: Home Tab */}
          <TabCol>
            <TabItem
              isFocused={state.routes[state.index].name === "Home"}
              icon="home-outline"
              activeIcon="home"
              label="Home"
              onPress={() => handlePress("Home")}
              isDark={isDark}
              theme={theme}
            />
          </TabCol>

          {/* Column 2: Exact Spacer for Center AI Button */}
          <CenterSpace />

          {/* Column 3: Profile Tab */}
          <TabCol>
            <TabItem
              isFocused={state.routes[state.index].name === "Profile"}
              icon="person-outline"
              activeIcon="person"
              label="Profile"
              onPress={() => handlePress("Profile")}
              isDark={isDark}
              theme={theme}
            />
          </TabCol>
        </GlassContainer>
      </ShadowContainer>

      {/* Floating Center AI Button */}
      <FloatingButtonWrapper>
        <Animated.View style={pulseStyle}>
          <FloatingButton
            activeOpacity={0.955}
            onPress={() => handlePress("AIChatScreen")}
          >
            <FloatingGradient
              colors={["#5B4BFF", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={
                  isChatFocused
                    ? "chatbubble-ellipses"
                    : "chatbubble-ellipses-outline"
                }
                size={24}
                color="#fff"
              />
              <Ionicons
                name={
                  isChatFocused
                    ? "sparkles-outline"
                    : "sparkles"
                }
                size={14}
                color="#fff"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 6,
                }}
              />
            </FloatingGradient>
          </FloatingButton>
        </Animated.View>
      </FloatingButtonWrapper>
    </AnimatedContainer>
  );
};

export default TabBar;

const AnimatedContainer = styled(RNAnimated.View)`
  position: absolute;
  width: 100%;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const ShadowContainer = styled.View`
  shadow-color: #000;
  shadow-opacity: 0.28;
  shadow-radius: 12px;
  shadow-offset: 0px 8px;
  elevation: 12;
  align-items: center;
  width: 100%;
`;

const GlassContainer = styled(LinearGradient)`
  height: ${HEIGHT}px;
  border-radius: 31px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.12);
  padding-horizontal: 16px;
`;

const TabCol = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const CenterSpace = styled.View`
  width: 64px;
`;

const FloatingButtonWrapper = styled.View`
  position: absolute;
  top: -14px;
  align-self: center;
  z-index: 1000;
`;

const FloatingButton = styled(TouchableOpacity)`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  shadow-color: #5B4BFF;
  shadow-opacity: 0.45;
  shadow-radius: 12px;
  shadow-offset: 0px 6px;
  elevation: 14;
`;
const FloatingGradient = styled(LinearGradient)`
  width: 100%;
  height: 100%;
  border-radius: 32px;
  border-width: 3.5px;
  border-color: #ffffff;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: HEIGHT,
    width: "100%",
  },
  tabItemInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activePill: {
    backgroundColor: "rgba(124, 108, 255, 0.28)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  inactivePill: {
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 11,
    marginLeft: 2,
  },
});
