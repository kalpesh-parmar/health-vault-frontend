import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  title: string;
  showBack?: boolean;
};

const ScreenHeader = ({ title, showBack }: Props) => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();

  return (
    <HeaderContainer>
      <LeftSection>
        {showBack && (
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
          </BackButton>
        )}

        <TitleText numberOfLines={1}>{title}</TitleText>
      </LeftSection>
    </HeaderContainer>
  );
};

export default ScreenHeader;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${Platform.OS === "ios"
    ? "60px 20px 16px"
    : "50px 20px 12px"};
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.12;
  shadow-radius: 18px;
  elevation: 6;
`;

const LeftSection = styled.View`
  flex-direction: row;
  align-items: center;
`;

const BackButton = styled(TouchableOpacity)`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  justify-content: center;
  align-items: center;
  margin-right: 10px;
`;

const TitleText = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;