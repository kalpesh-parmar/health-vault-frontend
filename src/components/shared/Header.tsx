import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Platform, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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
  const { isDark } = useAppTheme();

  return (
    <HeaderGradient
      colors={isDark ? ["#312E81", "#4F46E5"] : ["#6366f1", "#a855f7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {leftAction ? (
        <ActionButton
          onPress={leftAction.onPress}
          accessibilityLabel={leftAction.Label}
        >
          <Ionicons
            name={leftAction.icon}
            size={24}
            color="rgba(255,255,255,0.9)"
          />
        </ActionButton>
      ) : showBack ? (
        <ActionButton onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="rgba(255,255,255,0.9)"
          />
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
            <Ionicons
              name={rightAction.icon}
              size={22}
              color="rgba(255,255,255,0.9)"
            />
            {rightAction.Label && (
              <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                {rightAction.Label}
              </Text>
            )}
          </ActionButton>
          {!!rightAction.badge && rightAction.badge > 0 && (
            <Badge>
              <BadgeText>
                {rightAction.badge > 4 ? "4+" : rightAction.badge}
              </BadgeText>
            </Badge>
          )}
        </BadgeWrapper>
      ) : (
        <Placeholder />
      )}
    </HeaderGradient>
  );
};

export default ScreenHeader;

const HeaderGradient = styled(LinearGradient)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${Platform.OS === "ios" ? "60px 20px 20px" : "50px 20px 26px"};
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
`;

const ActionButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const TitleText = styled.Text`
  flex: 1;
  font-size: 19px;
  font-weight: 700;
  color: #ffffff;
  margin-left: 20px;
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
  border-width: 2px;
  border-color: #6366f1;
`;

const BadgeText = styled.Text`
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
`;