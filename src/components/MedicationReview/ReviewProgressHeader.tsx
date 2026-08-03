import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

interface ReviewProgressHeaderProps {
  title: string;
  subtitle?: string;
  rightText?: string;
  onBackPress: () => void;
}

export const ReviewProgressHeader: React.FC<ReviewProgressHeaderProps> = ({
  title,
  subtitle,
  rightText,
  onBackPress,
}) => {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Since parent screens already use SafeAreaView edges=["top"], we only need static top padding
  const paddingTop = 20;

  return (
    <HeaderContainer isDark={isDark} paddingTop={paddingTop}>
      <TopRow>
        <BackButton onPress={onBackPress} activeOpacity={0.7}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={isDark ? "#f8fafc" : "#1f2937"}
          />
        </BackButton>
        
        <TitleContainer>
          <HeaderTitle isDark={isDark} numberOfLines={1}>
            {title}
          </HeaderTitle>
        </TitleContainer>

        {rightText ? (
          <RightText isDark={isDark}>{rightText}</RightText>
        ) : (
          <Spacer />
        )}
      </TopRow>
      
      {subtitle && (
        <SubtitleText isDark={isDark}>
          {subtitle}
        </SubtitleText>
      )}
    </HeaderContainer>
  );
};

const HeaderContainer = styled.View<{ isDark: boolean; paddingTop: number }>`
  padding-top: ${(props: any) => props.paddingTop}px;
  padding-horizontal: 20px;
  padding-bottom: 12px;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.isDark ? "#1e293b" : "#e2e8f0"};
`;

const TopRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 44px;
`;

const BackButton = styled.TouchableOpacity`
  padding: 6px;
  margin-left: -6px;
`;

const TitleContainer = styled.View`
  flex: 1;
  margin-horizontal: 12px;
  align-items: center;
`;

const HeaderTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  text-align: center;
`;

const RightText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#7c6cff" : "#5b4bff"};
  width: 90px;
  text-align: right;
`;

const Spacer = styled.View`
  width: 38px;
`;

const SubtitleText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#4b5563"};
  text-align: center;
  margin-top: 4px;
`;

export default ReviewProgressHeader;
