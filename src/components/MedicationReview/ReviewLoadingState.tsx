import React from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";

interface ReviewLoadingStateProps {
  message?: string;
}

export const ReviewLoadingState: React.FC<ReviewLoadingStateProps> = ({
  message = "Loading extracted medicines...",
}) => {
  const { theme, isDark } = useAppTheme();

  return (
    <Container isDark={isDark}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <LoadingText isDark={isDark}>{message}</LoadingText>
    </Container>
  );
};

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
`;

const LoadingText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: ${(props: any) => props.isDark ? "#9ca3af" : "#6b7280"};
  margin-top: 16px;
  text-align: center;
`;

export default ReviewLoadingState;
