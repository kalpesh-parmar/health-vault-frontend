import React, { forwardRef, useImperativeHandle, useRef } from "react";
import styled from "styled-components/native";
import { OtpInput as RNOTPInput, OtpInputRef as RNOTPInputRef } from "react-native-otp-entry";
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
  const rnOtpRef = useRef<RNOTPInputRef>(null);
  const { theme } = useAppTheme();

  useImperativeHandle(ref, () => ({
    focus: () => {
      rnOtpRef.current?.focus();
    },
    clear: () => {
      rnOtpRef.current?.clear();
      onChange(Array(OTP_LENGTH).fill(""));
    }
  }));

  return (
    <Container>
      <RNOTPInput
        ref={rnOtpRef}
        numberOfDigits={OTP_LENGTH}
        focusColor={hasError ? theme.colors.error : theme.colors.primary}
        onTextChange={(text: string) => {
          const newOtpArr = text.split("").concat(Array(OTP_LENGTH - text.length).fill(""));
          onChange(newOtpArr);
        }}
        type="numeric"
        theme={{
          containerStyle: {
            width: "100%",
          },
          inputsContainerStyle: {
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
          },
          pinCodeContainerStyle: {
            flex: 1,
            height: 56,
            borderRadius: 14,
            borderWidth: 1.5,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.background,
            borderColor: hasError ? theme.colors.error : theme.colors.border,
          },
          pinCodeTextStyle: {
            fontSize: 20,
            fontWeight: "800" as any,
            color: theme.colors.textPrimary,
          },
          focusStickStyle: {
            backgroundColor: theme.colors.primary,
          },
          focusedPinCodeContainerStyle: {
            borderColor: hasError ? theme.colors.error : theme.colors.primary,
            borderWidth: 1.5,
          },
          filledPinCodeContainerStyle: {
            backgroundColor: theme.colors.surfaceLight,
            borderColor: hasError ? theme.colors.error : theme.colors.primary,
            borderWidth: 1.5,
          },
        }}
      />
    </Container>
  );
});

export default OtpInput;

const Container = styled.View`
  width: 100%;
  margin-vertical: 20px;
`;
 