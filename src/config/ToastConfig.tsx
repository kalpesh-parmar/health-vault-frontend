import { BlurView } from "expo-blur";
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

export const toastConfig = {
  success: ({ text1, text2, props }: CustomToastProps) => (
    <CustomToastContainer type="success">
      <Text style={{ fontSize: 24 }}>✨</Text>

      <ContentWrapper>
        {text1 && <ToastTitle style={{ color: "#000" }}>{text1}</ToastTitle>}

        {text2 && <ToastMsg>{text2}</ToastMsg>}

        {props?.onPressButton && props?.buttonText && (
          <ToastButton
            type="success"
            onPress={props.onPressButton}
            activeOpacity={0.7}
          >
            <ToastButtonText type="success">{props.buttonText}</ToastButtonText>
          </ToastButton>
        )}
      </ContentWrapper>
    </CustomToastContainer>
  ),

  error: ({ text1, text2, props }: CustomToastProps) => (
    <CustomToastContainer type="error">
      <Text style={{ fontSize: 24 }}>⚠️</Text>

      <ContentWrapper>
        <ToastTitle style={{ color: "#000" }}>
          {text1 || "Action Required"}
        </ToastTitle>

        {text2 && <ToastMsg>{text2}</ToastMsg>}

        {props?.onPressButton && props?.buttonText && (
          <ToastButton
            type="error"
            onPress={props.onPressButton}
            activeOpacity={0.7}
          >
            <ToastButtonText type="error">{props.buttonText}</ToastButtonText>
          </ToastButton>
        )}
      </ContentWrapper>
    </CustomToastContainer>
  ),
};

const CustomToastContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "light",
})<{ type: "success" | "error" }>`
  width: 92%;
  padding: 16px 20px;
  background-color: grey;
  border-radius: 20px;
  flex-direction: row;
  align-items: center;
  elevation: 8;
  shadow-color: #000;
  shadow-offset: 0px 6px;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
`;

const ContentWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ToastTitle = styled.Text`
  color: #111;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const ToastMsg = styled.Text`
  color: #000;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
`;

const ToastButton = styled.TouchableOpacity<{ type: "success" | "error" }>`
  margin-top: 10px;
  align-self: center;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: ${(props: { type: "success" | "error" }) =>
    props.type === "success"
      ? "rgba(0, 200, 81, 0.1)"
      : "rgba(255, 68, 68, 0.1)"};
`;

const ToastButtonText = styled.Text<{ type: "success" | "error" }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(props: { type: "success" | "error" }) =>
    props.type === "success" ? "#00C851" : "#ff4444"};
`;
