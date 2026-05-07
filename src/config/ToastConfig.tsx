import React from "react";
import { Text } from "react-native";
import styled from "styled-components/native";

interface ToastActionProps {
  onPressButton?: () => void;
  buttonText?: string;
}

export interface CustomToastProps {
  text1?: string;
  text2?: string;
  props?: ToastActionProps;
}

// ─── Icon components ──────────────────────────────────────────────
const SuccessIcon = () => (
  <IconWrap style={{ backgroundColor: "#ECFDF5" }}>
    <Text style={{ fontSize: 18 }}>✓</Text>
  </IconWrap>
);

const ErrorIcon = () => (
  <IconWrap style={{ backgroundColor: "#FEF2F2" }}>
    <Text style={{ fontSize: 18 }}>!</Text>
  </IconWrap>
);

// ─── Toast config ─────────────────────────────────────────────────
export const toastConfig = {
  success: ({ text1, text2, props }: CustomToastProps) => (
    <ToastContainer>
      <AccentBar style={{ backgroundColor: "#10B955" }} />
      <SuccessIcon />
      <ContentWrapper>
        {text1 && (
          <ToastTitle style={{ color: "#065F46" }}>{text1}</ToastTitle>
        )}
        {text2 && <ToastMsg>{text2}</ToastMsg>}
        {props?.onPressButton && props?.buttonText && (
          <ToastButton
            style={{
              backgroundColor: "#ECFDF5",
              borderColor: "#A7F3D0",
            }}
            onPress={props.onPressButton}
            activeOpacity={0.7}
          >
            <ToastButtonText style={{ color: "#059669" }}>
              {props.buttonText}
            </ToastButtonText>
          </ToastButton>
        )}
      </ContentWrapper>
    </ToastContainer>
  ),

  error: ({ text1, text2, props }: CustomToastProps) => (
    <ToastContainer style={{ borderColor: "#FCEAEA" }}>
      <AccentBar style={{ backgroundColor: "#DC3C3C" }} />
      <ErrorIcon />
      <ContentWrapper>
        <ToastTitle style={{ color: "#7F1D1D" }}>
          {text1 || "Action Required"}
        </ToastTitle>
        {text2 && <ToastMsg>{text2}</ToastMsg>}
        {props?.onPressButton && props?.buttonText && (
          <ToastButton
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
            }}
            onPress={props.onPressButton}
            activeOpacity={0.7}
          >
            <ToastButtonText style={{ color: "#DC2626" }}>
              {props.buttonText}
            </ToastButtonText>
          </ToastButton>
        )}
      </ContentWrapper>
    </ToastContainer>
  ),
};

// ─── Styled components ────────────────────────────────────────────
const ToastContainer = styled.View`
  width: 92%;
  background-color: #ffffff;
  border-radius: 18px;
  border-width: 1px;
  border-color: #e3f5ea;
  flex-direction: row;
  align-items: flex-start;
  padding: 14px 16px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.06;
  shadow-radius: 14px;
  elevation: 6;
  overflow: hidden;
`;

const AccentBar = styled.View`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
`;

const IconWrap = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  flex-shrink: 0;
`;

const ContentWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
  padding-top: 1px;
`;

const ToastTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.1px;
  margin-bottom: 3px;
`;

const ToastMsg = styled.Text`
  font-size: 14px;
  color: #1e293b;
  line-height: 20px;
  font-weight: 600;
`;

const ToastButton = styled.TouchableOpacity`
  margin-top: 9px;
  align-self: flex-start;
  padding: 5px 11px;
  border-radius: 8px;
  border-width: 1px;
`;

const ToastButtonText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1px;
`;

const DismissHint = styled.Text`
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
  flex-shrink: 0;
`;