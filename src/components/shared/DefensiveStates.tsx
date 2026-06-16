import React from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

export const LoadingScreen = () => {
  const { isDark } = useAppTheme();
  return (
    <Container isDark={isDark}>
      <Card>
        <ActivityIndicator size="large" color="#0f766e" />
        <Title style={{ marginTop: 20 }}>Loading Assistant</Title>
        <Subtitle>Preparing secure connection...</Subtitle>
      </Card>
    </Container>
  );
};

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorScreen = ({ message = "Something went wrong.", onRetry }: ErrorScreenProps) => {
  const { isDark } = useAppTheme();
  return (
    <Container isDark={isDark}>
      <Card>
        <IconContainer style={{ backgroundColor: "#fee2e2" }}>
          <Ionicons name="alert-circle-outline" size={32} color="#dc2626" />
        </IconContainer>
        <Title>Connection Failed</Title>
        <Subtitle>{message}</Subtitle>
        {onRetry && (
          <Button onPress={onRetry}>
            <ButtonText>Retry</ButtonText>
          </Button>
        )}
      </Card>
    </Container>
  );
};

interface EmptyDocumentsProps {
  message?: string;
  onAction?: () => void;
}

export const EmptyDocuments = ({ message = "Please upload medical documents to get started.", onAction }: EmptyDocumentsProps) => {
  const { isDark } = useAppTheme();
  return (
    <Container isDark={isDark}>      
        <IconContainer style={{ backgroundColor: "#e0f2fe" }}>
          <Ionicons name="document-text-outline" size={32} color="#0284c7" />
        </IconContainer>
        <Title>No Documents Found</Title>
        <Subtitle>{message}</Subtitle>
        {onAction && (
          <Button onPress={onAction}>
            <ButtonText>Upload Document</ButtonText>
          </Button>
        )}
    </Container>
  );
};

interface EmptyMedicationsProps {
  message?: string;
  onAction?: () => void;
}

export const EmptyMedications = ({ message = "Please add your medications to get started.", onAction }: EmptyMedicationsProps) => {
  const { isDark } = useAppTheme();
  return (
    <Container isDark={isDark}>
        <IconContainer style={{ backgroundColor: "#fce7f3" }}>
          <Ionicons name="medkit-outline" size={32} color="#be185d" />
        </IconContainer>
        <Title>No Medications Found</Title>
        <Subtitle>{message}</Subtitle>
        {onAction && (
          <Button onPress={onAction}>
            <ButtonText>Add Medication</ButtonText>
          </Button>
        )}
    </Container>
  );
};

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 400px;
`;

const Card = styled.View`
  width: 90%;
  max-width: 340px;
  background-color: ${(props: any) => props.theme.colors.surface || "#ffffff"};
  border-radius: 24px;
  padding: 32px 24px;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.15;
  shadow-radius: 24px;
  elevation: 8;
`;

const IconContainer = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const Title = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${(props: any) => props.theme.colors.textPrimary || "#0f172a"};
  margin-bottom: 8px;
  text-align: center;
`;

const Subtitle = styled.Text`
  font-size: 14px;
  color: ${(props: any) => props.theme.colors.textMuted || "#64748b"};
  text-align: center;
  margin-bottom: 24px;
  line-height: 20px;
`;

const Button = styled.TouchableOpacity`
  background-color: #0f766e;
  padding: 12px 24px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
`;
