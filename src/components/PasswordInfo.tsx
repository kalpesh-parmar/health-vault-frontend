import React from "react";
import { Modal } from "react-native";
import styled from "styled-components/native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PasswordInfoModal: React.FC<Props> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay>
        <Container>
          <Title>Password Must Contain</Title>

          <RuleText>• At least 8 characters</RuleText>
          <RuleText>• One uppercase letter</RuleText>
          <RuleText>• One lowercase letter</RuleText>
          <RuleText>• One number</RuleText>
          <RuleText>• One special character</RuleText>

          <CloseButton onPress={onClose}>
            <CloseText>Got it</CloseText>
          </CloseButton>
        </Container>
      </Overlay>
    </Modal>
  );
};

export default PasswordInfoModal;

const Overlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const Container = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 20px;
  border-radius: 16px;
  width: 80%;
`;

const Title = styled.Text`
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const RuleText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const CloseButton = styled.TouchableOpacity`
  margin-top: 16px;
  align-self: flex-end;
`;

const CloseText = styled.Text`
  color: ${({ theme }: any) => theme.colors.primary};
  font-weight: 500;
`;
