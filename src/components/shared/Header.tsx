import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Platform, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../context/ThemeContext";

type ActionButton = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  Label?: string;
  badge?: number;
};

type Props = {
  title: string;
  showBack?: boolean;
  leftAction?: ActionButton;
  rightAction?: ActionButton;
};

const ScreenHeader = ({ title, showBack, leftAction, rightAction }: Props) => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();

  return (
    <HeaderContainer>
      {leftAction ? (
        <ActionButton
          onPress={leftAction.onPress}
          accessibilityLabel={leftAction.Label}
        >
          <Ionicons name={leftAction.icon} size={24} color={theme.colors.primary} />
        </ActionButton>
      ) : showBack ? (
        <ActionButton onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </ActionButton>
      ) : (
        <Placeholder />
      )}

      <TitleText numberOfLines={1}>{title}</TitleText>

      {rightAction ? (
        <BadgeWrapper>
          <ActionButton
            onPress={rightAction.onPress}
            accessibilityLabel={rightAction.Label}
          >
            <Ionicons name={rightAction.icon} size={22} color={theme.colors.primary} />
            {rightAction.Label && <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{rightAction.Label}</Text>}
          </ActionButton>
          {!!rightAction.badge && rightAction.badge > 0 && (
            <Badge>
              <BadgeText>{rightAction.badge > 4 ? "4+" : rightAction.badge}</BadgeText>
            </Badge>
          )}
        </BadgeWrapper>
      ) : (
        <Placeholder />
      )}
    </HeaderContainer>
  );
};

export default ScreenHeader;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${Platform.OS === "ios" ? "60px 20px 16px" : "50px 20px 12px"};
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.12;
  shadow-radius: 18px;
  elevation: 6;
`;

const ActionButton = styled(TouchableOpacity)`
  flex-direction: row;
  gap: 5px;
  height: 36px;
  width: auto;
  padding: 0 10px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  justify-content: center;
  align-items: center;
`;

const TitleText = styled.Text`
flex-grow: 1;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-horizontal: 10px;
`;

const Placeholder = styled.View`
  width: 36px;
`;

const BadgeWrapper = styled.View`
  position: relative;
`;

const Badge = styled.View`
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #ef4444;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  justify-content: center;
  align-items: center;
  padding-horizontal: 3px;
`;

const BadgeText = styled.Text`
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
`;