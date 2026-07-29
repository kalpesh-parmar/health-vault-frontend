import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

// ─── 1. WIZARD STEP HEADER ───────────────────────────────────────

interface WizardStepHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const WizardStepHeader: React.FC<WizardStepHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
}) => {
  const { theme, isDark } = useAppTheme();

  return (
    <HeaderContainer>
      <HeaderTopRow>
        {showBack && onBack ? (
          <BackButton onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? theme.colors.textPrimary : theme.colors.textPrimary}
            />
          </BackButton>
        ) : (
          <HeaderSpacer />
        )}
        <HeaderTitle numberOfLines={1}>{title}</HeaderTitle>
        <HeaderSpacer />
      </HeaderTopRow>
      {subtitle ? <HeaderSubtitle>{subtitle}</HeaderSubtitle> : null}
    </HeaderContainer>
  );
};

// ─── 2. WIZARD PROGRESS DOTS ────────────────────────────────────

interface WizardProgressDotsProps {
  currentStep: number;
  totalSteps?: number;
}

export const WizardProgressDots: React.FC<WizardProgressDotsProps> = ({
  currentStep,
  totalSteps = 9,
}) => {
  const { theme } = useAppTheme();

  return (
    <DotsContainer>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <Dot
            key={i}
            active={isActive}
            completed={isCompleted}
            primaryColor={theme.colors.primary}
            borderColor={theme.colors.border}
            surfaceColor={theme.colors.surfaceLight}
          />
        );
      })}
    </DotsContainer>
  );
};

// ─── 3. WIZARD CHECKLIST ITEM ───────────────────────────────────

export type ChecklistItemStatus = "pass" | "pending" | "error" | "info";

interface WizardChecklistItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  status: ChecklistItemStatus;
  statusText?: string;
}

export const WizardChecklistItem: React.FC<WizardChecklistItemProps> = ({
  icon,
  label,
  description,
  status,
  statusText,
}) => {
  const { theme } = useAppTheme();

  const getStatusColors = (st: ChecklistItemStatus) => {
    switch (st) {
      case "pass":
        return { bg: "#d1fae5", text: "#065f46", iconColor: theme.colors.success };
      case "error":
        return { bg: "#fee2e2", text: "#991b1b", iconColor: theme.colors.error };
      case "pending":
        return { bg: "#fef3c7", text: "#92400e", iconColor: theme.colors.warning };
      case "info":
      default:
        return { bg: theme.colors.iconBox, text: theme.colors.primary, iconColor: theme.colors.primary };
    }
  };

  const styleConfig = getStatusColors(status);

  return (
    <CardItem>
      <IconWrapper style={{ backgroundColor: styleConfig.bg }}>
        <Ionicons name={icon} size={20} color={styleConfig.iconColor} />
      </IconWrapper>
      <TextContent>
        <ItemLabel>{label}</ItemLabel>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
      </TextContent>
      {statusText ? (
        <StatusBadge style={{ backgroundColor: styleConfig.bg }}>
          <StatusBadgeText style={{ color: styleConfig.text }}>{statusText}</StatusBadgeText>
        </StatusBadge>
      ) : null}
    </CardItem>
  );
};

// ─── 4. WIZARD PRIMARY BUTTON ────────────────────────────────────

interface WizardPrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const WizardPrimaryButton: React.FC<WizardPrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
}) => {
  const { theme } = useAppTheme();

  return (
    <PrimaryBtn
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? theme.colors.border : theme.colors.primary,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <BtnRow>
          {icon ? <Ionicons name={icon} size={18} color="#ffffff" style={{ marginRight: 8 }} /> : null}
          <PrimaryBtnText>{title}</PrimaryBtnText>
        </BtnRow>
      )}
    </PrimaryBtn>
  );
};

// ─── 5. WIZARD SECONDARY LINK ────────────────────────────────────

interface WizardSecondaryLinkProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const WizardSecondaryLink: React.FC<WizardSecondaryLinkProps> = ({
  title,
  onPress,
  disabled = false,
}) => {

  return (
    <SecondaryBtn onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <SecondaryBtnText>{title}</SecondaryBtnText>
    </SecondaryBtn>
  );
};

// ─── STYLED COMPONENTS ───────────────────────────────────────────

const HeaderContainer = styled.View`
  padding-horizontal: 16px;
  padding-vertical: 12px;
`;

const HeaderTopRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled.TouchableOpacity`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const HeaderSpacer = styled.View`
  width: 36px;
`;

const HeaderSubtitle = styled.Text`
  font-size: 13px;
  text-align: center;
  margin-top: 4px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const DotsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-vertical: 12px;
  gap: 6px;
`;

const Dot = styled.View<{
  active: boolean;
  completed: boolean;
  primaryColor: string;
  borderColor: string;
  surfaceColor: string;
}>`
  height: 8px;
  width: ${({ active }: any) => (active ? "24px" : "8px")};
  border-radius: 4px;
  background-color: ${({ active, completed, primaryColor, surfaceColor }: any) =>
    active ? primaryColor : completed ? primaryColor + "80" : surfaceColor};
`;

const CardItem = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
`;

const IconWrapper = styled.View`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const TextContent = styled.View`
  flex: 1;
`;

const ItemLabel = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ItemDescription = styled.Text`
  font-size: 12px;
  margin-top: 2px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const StatusBadge = styled.View`
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
  margin-left: 8px;
`;

const StatusBadgeText = styled.Text`
  font-size: 11px;
  font-weight: 700;
`;

const PrimaryBtn = styled.TouchableOpacity`
  padding-vertical: 14px;
  padding-horizontal: 20px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  margin-vertical: 8px;
`;

const BtnRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const PrimaryBtnText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

const SecondaryBtn = styled.TouchableOpacity`
  padding-vertical: 10px;
  padding-horizontal: 16px;
  align-items: center;
  justify-content: center;
`;

const SecondaryBtnText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textSecondary};
  font-size: 14px;
  font-weight: 600;
  text-decoration-line: underline;
`;
