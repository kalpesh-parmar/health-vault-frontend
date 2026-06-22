import React from "react";
import { Modal } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface UploadValidationDialogProps {
  visible: boolean;
  onSelectAgain: () => void;
  onContinueManual: () => void;
  onClose: () => void;
}

export const UploadValidationDialog: React.FC<UploadValidationDialogProps> = ({
  visible,
  onSelectAgain,
  onContinueManual,
  onClose,
}) => {
  const { isDark } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay>
        <DialogContainer>
          <IconContainer>
            <Ionicons name="warning-outline" size={40} color="#ea580c" />
          </IconContainer>
          <Title>Invalid Document</Title>
          <Message>
            This does not appear to be a medical document. Please select a valid medical document or continue with manual entry.
          </Message>

          <ButtonContainer>
            <SelectAgainButton onPress={onSelectAgain}>
              <SelectAgainText>Select Again</SelectAgainText>
            </SelectAgainButton>

            <ManualButton onPress={onContinueManual}>
              <ManualText>Continue with Manual Entry</ManualText>
            </ManualButton>
          </ButtonContainer>
        </DialogContainer>
      </Overlay>
    </Modal>
  );
};

export default UploadValidationDialog;

const Overlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const DialogContainer = styled.View`
  width: 100%;
  max-width: 340px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 24px;
  padding: 24px;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 12px;
  elevation: 8;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const IconContainer = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: #ffedd5;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 8px;
  text-align: center;
`;

const Message = styled.Text`
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }: any) => theme.colors.textSecondary};
  text-align: center;
  margin-bottom: 24px;
`;

const ButtonContainer = styled.View`
  width: 100%;
  flex-direction: column;
`;

const SelectAgainButton = styled.TouchableOpacity`
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background-color: #0f766e;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SelectAgainText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
`;

const ManualButton = styled.TouchableOpacity`
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }: any) => theme.colors.border};
  justify-content: center;
  align-items: center;
`;

const ManualText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;
