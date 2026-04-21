// components/shared/Buttons/DualButtons.tsx
import React from "react";
import styled from "styled-components/native";

type DualBtnParams = {
  secondaryBtnText: string;
  secondaryBtnColor: string;
  mainBtnText: string;
  mainBtnColor: string;
  onSecondaryPress: () => void;
  onMainPress: () => void;
};

const DualButtons = ({
  secondaryBtnText,
  secondaryBtnColor,
  mainBtnText,
  mainBtnColor,
  onSecondaryPress,
  onMainPress,
}: DualBtnParams) => {
  return (
    <DualButtonContainer>
      <SecondaryBtn onPress={onSecondaryPress} activeOpacity={0.7} style={{ backgroundColor: secondaryBtnColor }}>
        <SecondaryBtnText>{secondaryBtnText}</SecondaryBtnText>
      </SecondaryBtn>

      <MainBtn onPress={onMainPress} activeOpacity={0.8} style={{ backgroundColor: mainBtnColor }}>
        <MainBtnText>{mainBtnText}</MainBtnText>
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
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
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
  color: white;
`;

const MainBtnText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
`;