import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface EmptyMedicineStateProps {
  onBackPress: () => void;
}

export const EmptyMedicineState: React.FC<EmptyMedicineStateProps> = ({ onBackPress }) => {
  const { theme, isDark } = useAppTheme();

  return (
    <Container isDark={isDark}>
      <IconContainer themeColor={theme.colors.primary}>
        <Ionicons name="medical-outline" size={48} color={theme.colors.primary} />
      </IconContainer>
      
      <Title isDark={isDark}>No Medicines Found</Title>
      
      <Subtitle isDark={isDark}>
        We couldn't detect any medications in these documents. You can still manage medications manually or try uploading again.
      </Subtitle>

      <CTAButton
        themeColor={theme.colors.primary}
        onPress={onBackPress}
        activeOpacity={0.8}
      >
        <CTAButtonText>Back to Dashboard</CTAButtonText>
      </CTAButton>
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

const IconContainer = styled.View<{ themeColor: string }>`
  width: 96px;
  height: 96px;
  border-radius: 48px;
  background-color: ${(props: any) => props.themeColor + "15"};
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.Text<{ isDark: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  margin-bottom: 12px;
`;

const Subtitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${(props: any) => props.isDark ? "#9ca3af" : "#6b7280"};
  text-align: center;
  line-height: 20px;
  margin-bottom: 32px;
`;

const CTAButton = styled.TouchableOpacity<{ themeColor: string }>`
  background-color: ${(props: any) => props.themeColor};
  padding-vertical: 14px;
  padding-horizontal: 32px;
  border-radius: 12px;
  width: 100%;
  align-items: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.10;
  shadow-radius: 4px;
`;

const CTAButtonText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

export default EmptyMedicineState;
