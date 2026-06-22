import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, TextInput, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  disabled?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChangeText, error, disabled }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { theme } = useAppTheme();
  
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withTiming(isFocused || value.length > 0 ? 1 : 0, {
      duration: 200,
    });
  }, [isFocused, value]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      floatAnim.value,
      [0, 1],
      [0, -24],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      floatAnim.value,
      [0, 1],
      [1, 0.78],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  return (
    <InputGroup>
      <InputWrapper
        isFocused={isFocused}
        hasError={!!error}
        themeColor={theme.colors}
        disabled={disabled}
      >
        <PrefixContainer themeColor={theme.colors}>
          <Ionicons
            name="call-outline"
            size={18}
            color={isFocused ? theme.colors.primary : theme.colors.textMuted}
          />
          <PrefixText themeColor={theme.colors}>+91</PrefixText>
          <Divider themeColor={theme.colors} />
        </PrefixContainer>

        <InputContainer>
          <AnimatedLabelContainer style={animatedLabelStyle} pointerEvents="none">
            <LabelText
              themeColor={theme.colors}
              isFocused={isFocused}
              hasValue={value.length > 0}
            >
              Mobile Number
            </LabelText>
          </AnimatedLabelContainer>

          <StyledTextInput
            ref={inputRef}
            keyboardType="number-pad"
            maxLength={10}
            value={value}
            onChangeText={(text: string) => onChangeText(text.replace(/\D/g, ""))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="transparent"
            themeColor={theme.colors}
            selectionColor={theme.colors.primary}
            editable={!disabled}
          />
        </InputContainer>
      </InputWrapper>
      {error && <ErrorText>{error}</ErrorText>}
    </InputGroup>
  );
};

export default PhoneInput;


const InputGroup = styled.View`
  margin-bottom: 20px;
  width: 100%;
`;

const InputWrapper = styled.View<{
  isFocused: boolean;
  hasError: boolean;
  themeColor: any;
  disabled?: boolean;
}>`
  height: 64px;
  border-width: 1.5px;
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
  background-color: ${(props: { themeColor: any }) => props.themeColor.background};
  opacity: ${(props: { disabled?: boolean }) => (props.disabled ? 0.6 : 1)};
  border-color: ${(props: { isFocused: boolean; hasError: boolean; themeColor: any }) =>
    props.hasError
      ? props.themeColor.error
      : props.isFocused
      ? props.themeColor.primary
      : props.themeColor.border};
`;

const PrefixContainer = styled.View<{ themeColor: any }>`
  flex-direction: row;
  align-items: center;
  height: 100%;
`;

const PrefixText = styled.Text<{ themeColor: any }>`
  font-size: 16px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
  margin-left: 8px;
`;

const Divider = styled.View<{ themeColor: any }>`
  width: 1.5px;
  height: 24px;
  background-color: ${(props: { themeColor: any }) => props.themeColor.border};
  margin-horizontal: 12px;
`;

const InputContainer = styled.View`
  flex: 1;
  height: 100%;
  position: relative;
  justify-content: center;
`;

const AnimatedLabelContainer = styled(Animated.View)`
  position: absolute;
  left: 0;
  top: 20px;
  z-index: 1;
`;

const LabelText = styled.Text<{ themeColor: any; isFocused: boolean; hasValue: boolean }>`
  font-size: 16px;
  color: ${(props: { themeColor: any; isFocused: boolean; hasValue: boolean }) =>
    props.isFocused ? props.themeColor.primary : props.themeColor.textMuted};
  font-weight: ${(props: { isFocused: boolean; hasValue: boolean }) =>
    props.isFocused || props.hasValue ? "700" : "500"};
`;

const StyledTextInput = styled.TextInput<{ themeColor: any }>`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
  padding-top: 10px;
  height: 100%;
`;

const ErrorText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  margin-left: 4px;
`;
