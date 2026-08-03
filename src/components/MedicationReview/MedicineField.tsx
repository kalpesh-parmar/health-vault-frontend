import React, { useState } from "react";
import { View, Switch, Modal, FlatList, TouchableOpacity, TextInput } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface MedicineFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  type?: "text" | "number" | "select" | "toggle";
  selectOptions?: string[];
  onSelectOption?: (option: string) => void;
  toggleValue?: boolean;
  onToggleChange?: (val: boolean) => void;
  placeholder?: string;
  multiline?: boolean;
  rightLabel?: string;
}

export const MedicineField: React.FC<MedicineFieldProps> = ({
  label,
  value,
  onChangeText,
  type = "text",
  selectOptions = [],
  onSelectOption,
  toggleValue = false,
  onToggleChange,
  placeholder,
  multiline = false,
  rightLabel,
}) => {
  const { theme, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (option: string) => {
    onSelectOption?.(option);
    setModalVisible(false);
  };

  return (
    <FieldContainer isDark={isDark}>
      <LabelRow>
        <FieldLabel isDark={isDark}>{label}</FieldLabel>
        {rightLabel && <RightLabel isDark={isDark}>{rightLabel}</RightLabel>}
      </LabelRow>

      {type === "text" && (
        <StyledInput
          isDark={isDark}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
          multiline={multiline}
          style={multiline ? { height: 80, textAlignVertical: "top", paddingTop: 12 } : {}}
        />
      )}

      {type === "number" && (
        <StyledInput
          isDark={isDark}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
          keyboardType="numeric"
        />
      )}

      {type === "select" && (
        <>
          <DropdownButton
            isDark={isDark}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <DropdownValue isDark={isDark} hasValue={Boolean(value)}>
              {value || placeholder || "Select option"}
            </DropdownValue>
            <Ionicons
              name="chevron-down"
              size={18}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </DropdownButton>

          <Modal
            transparent
            visible={modalVisible}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <ModalOverlay onPress={() => setModalVisible(false)} activeOpacity={1}>
              <ModalContentContainer isDark={isDark}>
                <ModalHeader>
                  <ModalTitle isDark={isDark}>{label}</ModalTitle>
                  <CloseButton onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                  </CloseButton>
                </ModalHeader>

                <FlatList
                  data={selectOptions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <OptionRow
                      onPress={() => handleSelect(item)}
                      isDark={isDark}
                      selected={item === value}
                      themeColor={theme.colors.primary}
                    >
                      <OptionText isDark={isDark} selected={item === value} themeColor={theme.colors.primary}>
                        {item}
                      </OptionText>
                      {item === value && (
                        <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                      )}
                    </OptionRow>
                  )}
                  style={{ maxHeight: 300 }}
                />
              </ModalContentContainer>
            </ModalOverlay>
          </Modal>
        </>
      )}

      {type === "toggle" && (
        <ToggleRow>
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: "#cbd5e1", true: theme.colors.primary + "50" }}
            thumbColor={toggleValue ? theme.colors.primary : "#f1f5f9"}
          />
        </ToggleRow>
      )}
    </FieldContainer>
  );
};

const FieldContainer = styled.View<{ isDark: boolean }>`
  margin-bottom: 16px;
`;

const LabelRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const FieldLabel = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#cbd5e1" : "#475569"};
`;

const RightLabel = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${(props: any) => props.isDark ? "#64748b" : "#94a3b8"};
`;

const StyledInput = styled.TextInput<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "#334155" : "#e2e8f0"};
  border-radius: 10px;
  padding-horizontal: 14px;
  height: 48px;
  font-size: 15px;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
`;

const DropdownButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "#334155" : "#e2e8f0"};
  border-radius: 10px;
  padding-horizontal: 14px;
  height: 48px;
`;

const DropdownValue = styled.Text<{ isDark: boolean; hasValue: boolean }>`
  font-size: 15px;
  color: ${(props: any) => {
    if (!props.hasValue) return props.isDark ? "#475569" : "#94a3b8";
    return props.isDark ? "#f8fafc" : "#1f2937";
  }};
`;

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  height: 48px;
`;

const ModalOverlay = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.4);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalContentContainer = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-radius: 16px;
  width: 100%;
  padding-vertical: 16px;
  elevation: 5;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 12px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: 20px;
  padding-bottom: 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.isDark ? "#334155" : "#e2e8f0"};
`;

const ModalTitle = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
`;

const CloseButton = styled.TouchableOpacity`
  padding: 4px;
`;

const OptionRow = styled.TouchableOpacity<{ isDark: boolean; selected: boolean; themeColor: string }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: 14px;
  padding-horizontal: 20px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
  background-color: ${(props: any) => props.selected ? (props.isDark ? "#1e1b4b" : props.themeColor + "10") : "transparent"};
`;

const OptionText = styled.Text<{ isDark: boolean; selected: boolean; themeColor: string }>`
  font-size: 15px;
  font-weight: ${(props: any) => props.selected ? "700" : "500"};
  color: ${(props: any) => {
    if (props.selected) return props.themeColor;
    return props.isDark ? "#e2e8f0" : "#334155";
  }};
`;

export default MedicineField;
