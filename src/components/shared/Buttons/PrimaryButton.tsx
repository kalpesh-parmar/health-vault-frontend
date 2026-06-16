import React from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { useAppTheme } from "../../../context/ThemeContext";

type TextParam = {
  text: string;
  onPress: () => void;
  isLoading?: boolean;
  loadingText?: string;
};

const PrimaryButton = ({ text, onPress, isLoading, loadingText }: TextParam) => {

  return (
    <PrimaryBtn onPress={onPress} disabled={isLoading}>
      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator size="small" color="#fff" />
          {loadingText && <LoadingText>{loadingText}</LoadingText>}
        </LoadingContainer>
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

const LoadingContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const LoadingText = styled.Text`
  color: ${({ theme }: any) => theme.colors.background};
  font-size: 17px;
  font-weight: 700;
  margin-left: 10px;
`;
