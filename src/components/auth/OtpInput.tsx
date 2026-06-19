import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { TextInput, View, StyleSheet, NativeEventEmitter } from "react-native";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";

interface OtpInputProps {
  value: string[];
  onChange: (otp: string[]) => void;
  hasError?: boolean;
}

export interface OtpInputRef {
  focus: () => void;
  clear: () => void;
}

const OTP_LENGTH = 6;

const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(({ value, onChange, hasError }, ref) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const { theme } = useAppTheme();

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRefs.current[0]?.focus();
    },
    clear: () => {
      onChange(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  }));

  const handleTextChange = (text: string, index: number) => {
    // Handle pasted code (e.g. 6-digit numbers)
    const cleanedText = text.replace(/\D/g, "");
    if (cleanedText.length === OTP_LENGTH) {
      const pastedOtp = cleanedText.split("");
      onChange(pastedOtp);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }

    const digit = cleanedText.slice(-1);
    const newOtp = [...value];
    newOtp[index] = digit;
    onChange(newOtp);

    // Auto-focus next cell
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      if (value[index] === "" && index > 0) {
        // Clear previous cell and focus it
        const newOtp = [...value];
        newOtp[index - 1] = "";
        onChange(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current cell
        const newOtp = [...value];
        newOtp[index] = "";
        onChange(newOtp);
      }
    }
  };

  return (
    <Container>
      {Array(OTP_LENGTH)
        .fill(0)
        .map((_, index) => (
          <StyledInput
            key={index}
            ref={(el: TextInput | null) => (inputRefs.current[index] = el)}
            value={value[index] || ""}
            onChangeText={(text: string) => handleTextChange(text, index)}
            onKeyPress={(e: any) => handleKeyPress(e.nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={6} // allow pasting whole code into one input
            selectTextOnFocus
            hasError={!!hasError}
            isFilled={!!value[index]}
            themeColor={theme.colors}
          />
        ))}
    </Container>
  );
});

export default OtpInput;

const Container = styled.View`
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  margin-vertical: 20px;
  gap: 8px;
`;

const StyledInput = styled.TextInput<{
  hasError: boolean;
  isFilled: boolean;
  themeColor: any;
}>`
  flex: 1;
  height: 56px;
  border-radius: 14px;
  border-width: 1.5px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
  background-color: ${(props: { themeColor: any; isFilled: boolean }) =>
    props.isFilled ? props.themeColor.surfaceLight : props.themeColor.background};
  border-color: ${(props: { themeColor: any; hasError: boolean; isFilled: boolean }) =>
    props.hasError
      ? props.themeColor.error
      : props.isFilled
      ? props.themeColor.primary
      : props.themeColor.border};
`;
