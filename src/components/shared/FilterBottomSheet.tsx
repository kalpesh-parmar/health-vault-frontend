import React, { forwardRef } from "react";
import { ScrollView } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import BottomSheet from "./BottomSheet";
import { useAppTheme } from "../../context/ThemeContext";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

interface FilterBottomSheetProps {
  title: string;
  subtitle?: string;
  onApply: () => void;
  onReset: () => void;
  children?: React.ReactNode;
}

export const FilterBottomSheet = forwardRef<any, FilterBottomSheetProps>(
  ({ title, subtitle, onApply, onReset, children }, ref) => {
    const { isDark } = useAppTheme();
    const bottomPadding = useBottomBarPadding(24, 12);

    return (
      <BottomSheet ref={ref}>
        <Container>
          <HeaderRow>
            <Title>{title}</Title>
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </HeaderRow>

          <ScrollContent showsVerticalScrollIndicator={false}>
            {children}
          </ScrollContent>

          <ActionRow bottomPadding={bottomPadding}>
            <ResetButton onPress={onReset} activeOpacity={0.8} isDark={isDark}>
              <ResetButtonText isDark={isDark}>Reset</ResetButtonText>
            </ResetButton>
            <ApplyButton onPress={onApply} activeOpacity={0.8}>
              <ApplyButtonText>Apply</ApplyButtonText>
            </ApplyButton>
          </ActionRow>
        </Container>
      </BottomSheet>
    );
  }
);

interface FilterOptionItemProps {
  title: string;
  subtitle?: string;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
}

export const FilterOptionItem: React.FC<FilterOptionItemProps> = ({
  title,
  subtitle,
  icon,
  isActive,
  onPress,
}) => {
  const { isDark } = useAppTheme();

  return (
    <OptionItem
      active={isActive}
      isDark={isDark}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* {icon && (
        <IconWrapper active={isActive} isDark={isDark}>
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color={isActive ? "#ffffff" : isDark ? "#cbd5e1" : "#475569"}
          />
        </IconWrapper>
      )} */}

      <TextContainer>
        <OptionLabel active={isActive} isDark={isDark}>
          {title}
        </OptionLabel>
        {subtitle && <OptionDesc isDark={isDark}>{subtitle}</OptionDesc>}
      </TextContainer>

      {isActive && (
        <CheckCircle>
          <Ionicons name="checkmark" size={16} color="#ffffff" />
        </CheckCircle>
      )}
    </OptionItem>
  );
};

export const FilterGridItem: React.FC<FilterOptionItemProps> = ({
  title,
  isActive,
  onPress,
}) => {
  const { isDark } = useAppTheme();

  return (
    <GridOptionItem
      active={isActive}
      isDark={isDark}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <GridOptionLabel active={isActive} isDark={isDark} numberOfLines={1}>
        {title}
      </GridOptionLabel>
    </GridOptionItem>
  );
};

export default FilterBottomSheet;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View`
  padding: 8px 24px 24px;
  flex: 1;
`;

const HeaderRow = styled.View`
  margin-bottom: 20px;
`;

const Title = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const Subtitle = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 4px;
  font-weight: 500;
`;

const ScrollContent = styled(ScrollView)`
  margin-bottom: 20px;
`;

const OptionItem = styled.TouchableOpacity<{ active: boolean; isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 8px;
  background-color: ${({ active, isDark }: any) =>
    active
      ? isDark
        ? "rgba(99, 102, 241, 0.15)"
        : "rgba(99, 102, 241, 0.08)"
      : isDark
      ? "#1e293b"
      : "#f8fafc"};
  border-width: 1.5px;
  border-color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : "transparent"};
`;

const GridOptionItem = styled.TouchableOpacity<{ active: boolean; isDark: boolean }>`
  padding: 10px 8px;
  border-radius: 12px;
  margin: 4px;
  background-color: ${({ active, isDark }: any) =>
    active
      ? isDark
        ? "rgba(99, 102, 241, 0.15)"
        : "rgba(99, 102, 241, 0.08)"
      : isDark
      ? "#1e293b"
      : "#f8fafc"};
  border-width: 1.5px;
  border-color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : "transparent"};
  align-items: center;
  justify-content: center;
  flex-basis: 30%;
  flex-grow: 1;
`;

// const IconWrapper = styled.View<{ active: boolean; isDark: boolean }>`
//   width: 36px;
//   height: 36px;
//   border-radius: 10px;
//   background-color: ${({ active, isDark, theme }: any) =>
//     active
//       ? theme.colors.primary
//       : isDark
//       ? "#334155"
//       : "#e2e8f0"};
//   justify-content: center;
//   align-items: center;
//   margin-right: 12px;
// `;

const TextContainer = styled.View`
  flex: 1;
`;

const OptionLabel = styled.Text<{ active: boolean; isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : theme.colors.textPrimary};
`;

const GridOptionLabel = styled.Text<{ active: boolean; isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : theme.colors.textPrimary};
  text-align: center;
`;

const OptionDesc = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 2px;
  font-weight: 500;
`;

const CheckCircle = styled.View`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
`;

const ActionRow = styled.View<{ bottomPadding: number }>`
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: ${(props: any) => props.bottomPadding}px;
`;

const ResetButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex: 1;
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isDark }: any) => (isDark ? "#1e293b" : "#f1f5f9")};
`;

const ResetButtonText = styled.Text<{ isDark: boolean }>`
  color: ${({ isDark }: any) => (isDark ? "#f8fafc" : "#0f172a")};
  font-size: 16px;
  font-weight: 700;
`;

const ApplyButton = styled.TouchableOpacity`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.primary};
  padding: 16px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 10px;
  elevation: 5;
`;

const ApplyButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
`;
