import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, Dimensions, Platform } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("screen");

interface Props {
  visible: boolean;
}

const ModernLoader = ({ visible }: Props) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotationLoop = useRef<Animated.CompositeAnimation | null>(null);

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

  if (!visible) return null;

  return (
    <Container style={{ opacity: fadeAnim }}>
      <GlassBackground
        intensity={Platform.OS === "ios" ? 30 : 100}
        tint="dark"
      />

      <LoaderContent>
        <SpinnerWrapper style={{ transform: [{ rotate: spin }] }}>
          <RingLine />
        </SpinnerWrapper>
        <StatusText>PROCESSING</StatusText>
      </LoaderContent>
    </Container>
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

const LoaderContent = styled.View`
  background-color: rgba(255, 255, 255, 0.5);
  padding: 30px;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.8);
`;

const SpinnerWrapper = styled(Animated.View)`
  width: 50px;
  height: 50px;
  justify-content: center;
  align-items: center;
`;

const RingLine = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  border-width: 1.5px;
  border-color: rgba(0, 0, 0, 0.05);
  border-top-color: #000;
`;

const StatusText = styled.Text`
  margin-top: 20px;
  font-size: 11px;
  font-weight: 700;
  color: #000;
  letter-spacing: 3px;
  opacity: 0.8;
`;
