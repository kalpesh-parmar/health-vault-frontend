import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

import { useAppTheme } from "../../context/ThemeContext";

const EmptyContent = ({
  title = "No Documents Found",
  description = "Your vault is empty. Upload your first document to keep your health records organized.",
}: EmptyStateProps) => {
  const { theme }: any = useAppTheme();

  return (
    <Container>
      <IconCircle>
        <InnerCircle>
          <Ionicons name="document-text-outline" size={60} color={theme.colors.textMuted} />
        </InnerCircle>
        <DecorationDot style={{ top: 10, right: 10 }} />
        <DecorationDot style={{ bottom: 20, left: -5, width: 12, height: 12 }} />
      </IconCircle>

      <TextContainer>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </TextContainer>
    </Container>
  );
};

export default EmptyContent;

const Container = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const IconCircle = styled.View`
  width: 140px;
  height: 140px;
  border-radius: 70px;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  justify-content: center;
  align-items: center;
  margin-bottom: 32px;
  border: 1px solid ${({ theme }: any) => theme.colors.border};
  position: relative;
`;

const InnerCircle = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  justify-content: center;
  align-items: center;
  /* Soft inner glow shadow */
  shadow-color: ${({ theme }: any) => theme.colors.textMuted};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 4;
`;

const DecorationDot = styled.View`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border: 2px solid ${({ theme }: any) => theme.colors.border};
`;

const TextContainer = styled.View`
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 12px;
  text-align: center;
  letter-spacing: -0.5px;
`;

const Description = styled.Text`
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 22px;
  font-weight: 500;
`;

const ActionHint = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  padding: 8px 16px;
  border-radius: 20px;
`;

const HintText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
  margin-left: 6px;
`;