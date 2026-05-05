import React from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { useAppTheme } from "../../../context/ThemeContext";

type TextParam = {
  text: string;
  onPress: () => void;
  isLoading?: boolean;
};

const PrimaryButton = ({ text, onPress, isLoading }: TextParam) => {

  return (
    <PrimaryBtn onPress={onPress} disabled={isLoading}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <PrimaryButtonText>{text}</PrimaryButtonText>
      )}
    </PrimaryBtn>
  );
};

export default PrimaryButton;

const PrimaryBtn = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.primary};
  width: 100%;
  padding: 16px;
  border-radius: 15px;
  align-items: center;
  margin-bottom: 12px;
  elevation: 5;
`;

const PrimaryButtonText = styled.Text`
  color: ${({ theme }: any) => theme.colors.background};
  font-size: 17px;
  font-weight: 700;
`;
