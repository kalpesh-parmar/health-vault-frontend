import { Modal, ActivityIndicator } from "react-native";
import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface OcrProgressModalProps {
  visible: boolean;
  percentage: number;
  currentStep: string;
  hasError?: boolean;
  onClose?: () => void;
}

const OcrProgressModal = ({
  visible,
  percentage,
  currentStep,
  hasError,
  onClose,
}: OcrProgressModalProps) => {
  const { isDark } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay>
        <ModalCard>
          <Indicator />

          <IconWrapper>
            <CircleBg color={hasError ? "#fee2e2" : "#e0f2fe"}>
              {hasError ? (
                <Ionicons name="alert-circle" size={32} color="#ef4444" />
              ) : percentage >= 100 ? (
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              ) : (
                <Ionicons name="document-text" size={32} color="#3b82f6" />
              )}
            </CircleBg>
          </IconWrapper>

          <ContentContainer>
            <Title>{hasError ? "Processing Failed" : percentage >= 100 ? "Processing Complete" : "Processing Document"}</Title>
            <Description>
              {hasError
                ? "There was an error analyzing your document. Please try again."
                : currentStep || "Extracting information from your document..."}
            </Description>
          </ContentContainer>

          {!hasError && (
            <ProgressContainer>
              <ProgressBarBackground>
                <ProgressBarFill style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }} />
              </ProgressBarBackground>
              <ProgressText>{percentage}%</ProgressText>
            </ProgressContainer>
          )}

          {(!hasError && percentage < 100) && (
            <LoaderContainer>
              <ActivityIndicator size="small" color="#3b82f6" />
              <LoaderText>Please wait, this might take a moment.</LoaderText>
            </LoaderContainer>
          )}

          {hasError && (
            <CloseButton onPress={onClose}>
              <CloseButtonText>Close</CloseButtonText>
            </CloseButton>
          )}
        </ModalCard>
      </Overlay>
    </Modal>
  );
};

export default OcrProgressModal;

/* --- Styled Components --- */

const Overlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalCard = styled.View`
  width: 100%;
  max-width: 350px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 32px;
  padding: 30px 24px 24px 24px;
  align-items: center;
  elevation: 20;
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.2;
  shadow-radius: 20px;
`;

const Indicator = styled.View`
  width: 40px;
  height: 4px;
  background-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 2px;
  position: absolute;
  top: 12px;
`;

const IconWrapper = styled.View`
  margin-bottom: 20px;
`;

const CircleBg = styled.View<{ color: string }>`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${(props: { color: string }) => props.color};
  justify-content: center;
  align-items: center;
`;

const ContentContainer = styled.View`
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 10px;
  letter-spacing: -0.5px;
  text-align: center;
`;

const Description = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 20px;
  padding-horizontal: 10px;
`;

const ProgressContainer = styled.View`
  width: 100%;
  align-items: center;
  margin-bottom: 20px;
`;

const ProgressBarBackground = styled.View`
  width: 100%;
  height: 8px;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight || "#f1f5f9"};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressBarFill = styled.View`
  height: 100%;
  background-color: #3b82f6;
  border-radius: 4px;
`;

const ProgressText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #3b82f6;
`;

const LoaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const LoaderText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const CloseButton = styled.TouchableOpacity`
  margin-top: 10px;
  padding-vertical: 12px;
  padding-horizontal: 24px;
  background-color: #ef4444;
  border-radius: 12px;
`;

const CloseButtonText = styled.Text`
  color: #fff;
  font-size: 14px;
  font-weight: 700;
`;
