// components/shared/Buttons/DualButtons.tsx
import React from "react";
import styled from "styled-components/native";
import { useAppTheme } from "../../../context/ThemeContext";
import { ActivityIndicator } from "react-native";

type DualBtnParams = {
  secondaryBtnText: string;
  secondaryBtnColor: string;
  mainBtnText: string;
  mainBtnColor: string;
  onSecondaryPress: () => void;
  onMainPress: () => void;
  isLoading?: boolean;
};

const DualButtons = ({
  secondaryBtnText,
  secondaryBtnColor,
  mainBtnText,
  mainBtnColor,
  onSecondaryPress,
  onMainPress,
  isLoading,
}: DualBtnParams) => {
  const { theme } = useAppTheme();

  return (
    <DualButtonContainer>
      <SecondaryBtn onPress={onSecondaryPress} activeOpacity={0.7} style={{ backgroundColor: secondaryBtnColor }}>
        <SecondaryBtnText>{secondaryBtnText}</SecondaryBtnText>
      </SecondaryBtn>

      <MainBtn onPress={onMainPress} activeOpacity={0.8} style={{ backgroundColor: mainBtnColor }} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <MainBtnText>{mainBtnText}</MainBtnText>
        )}
      </MainBtn>
    </DualButtonContainer>
  );
};

export default DualButtons;

const DualButtonContainer = styled.View`
  width: 100%;
  flex-direction: row;
  margin-top: 2px;
`;

const SecondaryBtn = styled.TouchableOpacity`
  flex: 1;
  margin-right: 8px;
  padding-vertical: 13px;
  border-radius: 14px;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }: any) => theme.colors.border};
  align-items: center;
  justify-content: center;
`;

const MainBtn = styled.TouchableOpacity`
  flex: 1;
  margin-left: 8px;
  padding-vertical: 13px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
`;

const SecondaryBtnText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const MainBtnText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.background};
`;