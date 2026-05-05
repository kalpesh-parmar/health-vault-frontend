import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("screen");

interface Props {
  visible: boolean;
  text?: string;
}

const ModernLoader = ({ visible, text }: Props) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotationLoop = useRef<Animated.CompositeAnimation | null>(null);
  const { isDark, theme } = useAppTheme();

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      rotationLoop.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      );

      rotationLoop.current.start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      rotationLoop.current?.stop();
      rotateAnim.setValue(0);
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal transparent visible={visible}>
      <Container style={{ opacity: fadeAnim }}>
        <GlassBackground
          intensity={Platform.OS === "ios" ? 30 : 100}
          tint={isDark ? "dark" : "light"}
        />

        <LoaderContent isDark={isDark}>
          <SpinnerWrapper style={{ transform: [{ rotate: spin }] }}>
            <RingLine />
          </SpinnerWrapper>
          <StatusText>{text ? text : "PROCESSING"}</StatusText>
        </LoaderContent>
      </Container>
    </Modal>
  );
};

export default ModernLoader;

const Container = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: ${width}px;
  height: ${height}px;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  elevation: 999999;
`;

const GlassBackground = styled(BlurView)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const LoaderContent = styled.View<{ isDark: boolean }>`
  background-color: ${({ isDark }: {isDark: boolean}) => isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.5)"};
  padding: 30px;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ isDark }: {isDark: boolean}) => isDark ?"rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"};
`;

const SpinnerWrapper = styled(Animated.View)`
  width: 50px;
  height: 50px;
  justify-content: center;
  align-items: center;
`;

const RingLine = styled.View<{ isDark: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  border-width: 1.5px;
  border-color: ${({ isDark }: {isDark: boolean}) => isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"};
  border-top-color: ${({ isDark }: {isDark: boolean}) => isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"};
`;

const StatusText = styled.Text<{ isDark: boolean }>`
  margin-top: 20px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ isDark }: {isDark: boolean}) => isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"};
  letter-spacing: 3px;
  opacity: 0.8;
`;
