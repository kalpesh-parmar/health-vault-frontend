// src/components/Signup/SignupHeader.tsx
import React from "react";
import { Dimensions, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  SharedValue,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Layout Constants ─────────────────────────────────────────────────────────
const MAX_HEADER_HEIGHT = 190;
const MIN_HEADER_HEIGHT = 50;
const SCROLL_RANGE = MAX_HEADER_HEIGHT - MIN_HEADER_HEIGHT;
const CURVE_HEIGHT = 40; // depth of the inverted arch
export const STICKY_BAR_HEIGHT = 106;

interface SignupHeaderProps {
  scrollY: SharedValue<number>;
}

// ─── Sticky Bar Component (Rendered outside ScrollView) ───────────────────────
export const SignupStickyBar: React.FC<SignupHeaderProps> = ({ scrollY }) => {
  const navigation = useNavigation();

  const stickyBarAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.25, SCROLL_RANGE * 0.75],
      [0, 1],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [-STICKY_BAR_HEIGHT * 0.35, 0],
          Extrapolate.CLAMP,
        ),
      },
    ] as const,
  }));

  const stickyTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.35, SCROLL_RANGE * 0.85],
      [0, 1],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [24, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  return (
    <StickyBar style={stickyBarAnimStyle}>
      <StickyBarGradient
        colors={["#5B21B6", "#8B5CF6", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.Text style={[stickyTitleText, stickyTitleAnimStyle]}>
          Create Account
        </Animated.Text>
        <BackButton
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </BackButton>
      </StickyBarGradient>
    </StickyBar>
  );
};

// ─── Collapsible Header Component (Rendered inside ScrollView) ─────────────────
export const SignupCollapsibleHeader: React.FC<SignupHeaderProps> = ({ scrollY }) => {
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, SCROLL_RANGE],
      [MAX_HEADER_HEIGHT, MIN_HEADER_HEIGHT],
      Extrapolate.CLAMP,
    ),
  }));

  const largeTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, SCROLL_RANGE * 0.55],
      [1, 0],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [0, -28],
          Extrapolate.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [0, SCROLL_RANGE],
          [1, 0.94],
          Extrapolate.CLAMP,
        ),
      },
    ] as const,
  }));

  return (
    <AnimatedHeader style={headerAnimatedStyle}>
      <GradientBg
        colors={["#5B21B6", "#8B5CF6", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative SVG blobs */}
        <DecorLayer>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT}`}
          >
            <Circle
              cx={SCREEN_WIDTH * 0.08}
              cy={50}
              r={115}
              fill="rgba(255,255,255,0.055)"
            />
            <Circle
              cx={SCREEN_WIDTH * 0.88}
              cy={28}
              r={90}
              fill="rgba(255,255,255,0.045)"
            />
            <Circle
              cx={SCREEN_WIDTH * 0.55}
              cy={MAX_HEADER_HEIGHT - 10}
              r={135}
              fill="rgba(255,255,255,0.035)"
            />
            <Path
              d={`M0 ${MAX_HEADER_HEIGHT * 0.5} Q${SCREEN_WIDTH * 0.3} ${MAX_HEADER_HEIGHT * 0.28} ${SCREEN_WIDTH * 0.65} ${MAX_HEADER_HEIGHT * 0.55} T${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT * 0.45}`}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d={`M0 ${MAX_HEADER_HEIGHT * 0.7} Q${SCREEN_WIDTH * 0.45} ${MAX_HEADER_HEIGHT * 0.5} ${SCREEN_WIDTH * 0.75} ${MAX_HEADER_HEIGHT * 0.72} T${SCREEN_WIDTH} ${MAX_HEADER_HEIGHT * 0.65}`}
              stroke="rgba(255,255,255,0.065)"
              strokeWidth="1.5"
              fill="none"
            />
          </Svg>
        </DecorLayer>

        {/* Large title — fades out on scroll up */}
        <HeaderTitleArea>
          <Animated.View style={largeTitleAnimStyle}>
            <HeroTitle>Create Account</HeroTitle>
            <HeroSubtitle>Join us — it only takes a minute</HeroSubtitle>
          </Animated.View>
        </HeaderTitleArea>
      </GradientBg>

      {/* Inverted semi-circle arch cut from the bottom of the header */}
      <ArchOverlay>
        <Svg
          width={SCREEN_WIDTH}
          height={CURVE_HEIGHT + 1}
          viewBox={`0 0 ${SCREEN_WIDTH} ${CURVE_HEIGHT + 1}`}
        >
          <Path
            d={`M0,0 Q${SCREEN_WIDTH / 2},${CURVE_HEIGHT * 2.4} ${SCREEN_WIDTH},0 L${SCREEN_WIDTH},${CURVE_HEIGHT + 1} L0,${CURVE_HEIGHT + 1} Z`}
            fill="#F4F1FE"
          />
        </Svg>
      </ArchOverlay>
    </AnimatedHeader>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const StickyBar = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: ${STICKY_BAR_HEIGHT}px;
  shadow-color: #4c1d95;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.2;
  shadow-radius: 18px;
  elevation: 12;
`;

const StickyBarGradient = styled(LinearGradient)`
  flex: 1;
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
  overflow: hidden;
  align-items: center;
  justify-content: flex-end;
  padding-horizontal: 20px;
  padding-bottom: 18px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.24);
`;

const stickyTitleText = {
  textAlign: "center" as const,
  fontSize: 18,
  fontWeight: "700" as const,
  color: "#FFFFFF",
  letterSpacing: 0.3,
};

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  bottom: 18px;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.22);
  justify-content: center;
  align-items: center;
`;

const AnimatedHeader = styled(Animated.View)`
  width: 100%;
  overflow: hidden;
`;

const GradientBg = styled(LinearGradient)`
  height: ${MIN_HEADER_HEIGHT + 200}px;
`;

const DecorLayer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const HeaderTitleArea = styled.View`
  flex: 1;
  justify-content: flex-end;
  padding-horizontal: 24px;
  padding-bottom: ${CURVE_HEIGHT + 70}px;
`;

const HeroTitle = styled.Text`
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.6px;
`;

const HeroSubtitle = styled.Text`
  margin-top: 5px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const ArchOverlay = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;
