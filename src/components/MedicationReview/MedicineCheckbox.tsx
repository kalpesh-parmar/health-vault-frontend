import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicineCheckboxProps {
  checked: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const MedicineCheckbox: React.FC<MedicineCheckboxProps> = ({
  checked,
  onPress,
  accessibilityLabel = "Select medicine",
}) => {
  const { theme } = useAppTheme();

  return (
    <CheckboxContainer
      onPress={onPress}
      activeOpacity={0.8}
      checked={checked}
      themeColor={theme.colors.primary}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      {checked && (
        <Ionicons name="checkmark" size={16} color="#ffffff" />
      )}
    </CheckboxContainer>
  );
};

const CheckboxContainer = styled.TouchableOpacity<{ checked: boolean; themeColor: string }>`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border-width: 2px;
  border-color: ${(props: any) => props.checked ? props.themeColor : "#cbd5e1"};
  background-color: ${(props: any) => props.checked ? props.themeColor : "transparent"};
  justify-content: center;
  align-items: center;
`;
export default MedicineCheckbox;
