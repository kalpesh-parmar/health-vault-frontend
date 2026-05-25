// src/components/Signup/GenderBottomSheet.tsx
import React, { forwardRef } from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../shared/BottomSheet";

interface GenderOption {
  label: string;
  value: string;
  icon: string;
}

interface GenderBottomSheetProps {
  gender: string | null;
  onSelectGender: (selectedGender: string) => void;
}

const genderOptions: GenderOption[] = [
  { label: "Male", value: "male", icon: "male-outline" },
  { label: "Female", value: "female", icon: "female-outline" },
  { label: "Other", value: "other", icon: "male-female-outline" },
];

const GenderBottomSheet = forwardRef<BottomSheetModal, GenderBottomSheetProps>(
  ({ gender, onSelectGender }, ref) => {
    return (
      <BottomSheet ref={ref}>
        <GenderSheetContainer>
          <GenderSheetHeader>
            <GenderSheetTitle>Select Gender</GenderSheetTitle>
            <GenderSheetSubtitle>
              Choose the option that best describes you.
            </GenderSheetSubtitle>
          </GenderSheetHeader>

          <GenderOptionsList>
            {genderOptions.map((option) => {
              const isSelected = gender === option.value;

              return (
                <GenderOptionButton
                  key={option.value}
                  activeOpacity={0.85}
                  isSelected={isSelected}
                  onPress={() => onSelectGender(option.value)}
                >
                  <GenderOptionIcon isSelected={isSelected}>
                    <Ionicons
                      name={option.icon as any}
                      size={21}
                      color={isSelected ? "#FFFFFF" : "#7C3AED"}
                    />
                  </GenderOptionIcon>

                  <GenderOptionTextWrap>
                    <GenderOptionLabel isSelected={isSelected}>
                      {option.label}
                    </GenderOptionLabel>
                  </GenderOptionTextWrap>

                  <RadioOuter isSelected={isSelected}>
                    {isSelected && <RadioInner />}
                  </RadioOuter>
                </GenderOptionButton>
              );
            })}
          </GenderOptionsList>
        </GenderSheetContainer>
      </BottomSheet>
    );
  }
);

GenderBottomSheet.displayName = "GenderBottomSheet";

export default GenderBottomSheet;

// ─── Styled Components ────────────────────────────────────────────────────────

const GenderSheetContainer = styled.View`
  padding: 26px 20px 34px 20px;
  background-color: #ffffff;
`;

const GenderSheetHeader = styled.View`
  padding-right: 42px;
  margin-bottom: 18px;
`;

const GenderSheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #1e1b4b;
`;

const GenderSheetSubtitle = styled.Text`
  font-size: 13px;
  line-height: 19px;
  color: #7c748f;
  margin-top: 5px;
`;

const GenderOptionsList = styled.View`
  gap: 10px;
`;

const GenderOptionButton = styled.TouchableOpacity<{ isSelected: boolean }>`
  min-height: 64px;
  flex-direction: row;
  align-items: center;
  padding: 12px 14px;
  border-radius: 18px;
  background-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#f3e8ff" : "#f8f7ff"};
  border-width: 1.5px;
  border-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#ede9fe"};
`;

const GenderOptionIcon = styled.View<{ isSelected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#ede9fe"};
`;

const GenderOptionTextWrap = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const GenderOptionLabel = styled.Text<{ isSelected: boolean }>`
  font-size: 15px;
  font-weight: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "800" : "700"};
  color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#4c1d95" : "#1e1b4b"};
`;

const RadioOuter = styled.View<{ isSelected: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border-width: 2px;
  border-color: ${({ isSelected }: { isSelected: boolean }) =>
    isSelected ? "#7c3aed" : "#c4b5fd"};
  align-items: center;
  justify-content: center;
`;

const RadioInner = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #7c3aed;
`;
