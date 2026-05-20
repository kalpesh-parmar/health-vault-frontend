import React, { forwardRef } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import BottomSheet from "./BottomSheet";
import { useAppTheme } from "../../context/ThemeContext";

interface FilterBottomSheetProps {
  selectedSort: string;
  onSelectSort: (value: string) => void;
  onApply: () => void;
}

const SORT_OPTIONS = [
  {
    label: "Newest First",
    description: "Recently added items",
    value: "date_desc",
    icon: "calendar",
  },
  {
    label: "Oldest First",
    description: "Earliest added items",
    value: "date_asc",
    icon: "calendar-outline",
  },
  {
    label: "A-Z",
    description: "Alphabetical ascending",
    value: "name_asc",
    icon: "alpha-a-box",
  },
  {
    label: "Z-A",
    description: "Alphabetical descending",
    value: "name_desc",
    icon: "alpha-z-box",
  },
];

export const FilterBottomSheet = forwardRef<any, FilterBottomSheetProps>(
  ({ selectedSort, onSelectSort, onApply }, ref) => {
    const { isDark } = useAppTheme();

    return (
      <BottomSheet ref={ref}>
        <Container>
          <HeaderRow>
            <Title>Sort & Filter</Title>
            <Subtitle>Choose how to order your items</Subtitle>
          </HeaderRow>

          <OptionsList>
            {SORT_OPTIONS.map((option) => {
              const isActive = selectedSort === option.value;
              return (
                <OptionItem
                  key={option.value}
                  active={isActive}
                  isDark={isDark}
                  onPress={() => onSelectSort(option.value)}
                  activeOpacity={0.8}
                >
                  <IconWrapper active={isActive} isDark={isDark}>
                    <MaterialCommunityIcons
                      name={option.icon as any}
                      size={22}
                      color={isActive ? "#ffffff" : isDark ? "#cbd5e1" : "#475569"}
                    />
                  </IconWrapper>

                  <TextContainer>
                    <OptionLabel active={isActive} isDark={isDark}>
                      {option.label}
                    </OptionLabel>
                    <OptionDesc isDark={isDark}>{option.description}</OptionDesc>
                  </TextContainer>

                  {isActive && (
                    <CheckCircle>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </CheckCircle>
                  )}
                </OptionItem>
              );
            })}
          </OptionsList>

          <ApplyButton onPress={onApply} activeOpacity={0.8}>
            <ApplyButtonText>Apply Filters</ApplyButtonText>
          </ApplyButton>
        </Container>
      </BottomSheet>
    );
  }
);

export default FilterBottomSheet;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View`
  padding: 8px 24px 24px;
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

const OptionsList = styled.View`
  gap: 12px;
  margin-bottom: 28px;
`;

const OptionItem = styled.TouchableOpacity<{ active: boolean; isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 16px;
  border-radius: 16px;
  background-color: ${({ active, isDark, theme }: any) =>
    active
      ? isDark
        ? "rgba(99, 102, 241, 0.15)"
        : "rgba(99, 102, 241, 0.08)"
      : isDark
      ? "#1e293b"
      : "#f8fafc"};
  border-width: 1.5px;
  border-color: ${({ active, isDark, theme }: any) =>
    active ? theme.colors.primary : "transparent"};
`;

const IconWrapper = styled.View<{ active: boolean; isDark: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background-color: ${({ active, isDark, theme }: any) =>
    active
      ? theme.colors.primary
      : isDark
      ? "#334155"
      : "#e2e8f0"};
  justify-content: center;
  align-items: center;
  margin-right: 14px;
`;

const TextContainer = styled.View`
  flex: 1;
`;

const OptionLabel = styled.Text<{ active: boolean; isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : theme.colors.textPrimary};
`;

const OptionDesc = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 2px;
  font-weight: 500;
`;

const CheckCircle = styled.View`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
`;

const ApplyButton = styled.TouchableOpacity`
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
