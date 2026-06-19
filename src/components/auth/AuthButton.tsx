import React from "react";
import { ActivityIndicator, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../../context/ThemeContext";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({ title, onPress, loading, disabled }) => {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <AnimatedContainer style={animatedStyle}>
        <Gradient
          colors={["#FF4DA6", "#5B6CFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <LoadingContainer>
              <ActivityIndicator size="small" color="#ffffff" />
              <LoadingText>Please wait...</LoadingText>
            </LoadingContainer>
          ) : (
            <ButtonText>{title}</ButtonText>
          )}
        </Gradient>
      </AnimatedContainer>
    </TouchableWithoutFeedback>
  );
};

export default AuthButton;

const AnimatedContainer = styled(Animated.View)`
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  shadow-color: #5B6CFF;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.22;
  shadow-radius: 12px;
  elevation: 6;
`;

const Gradient = styled(LinearGradient)`
  height: 58px;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const LoadingContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const LoadingText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
`;
