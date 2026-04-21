import React from "react";
import styled from "styled-components/native";

type TextParam = {
  text: string;
};

const PrimaryButton = ({ text}: TextParam) => {
  return (
    <PrimaryBtn>
      <PrimaryButtonText>{text}</PrimaryButtonText>
    </PrimaryBtn>
  );
};

export default PrimaryButton;

const PrimaryBtn = styled.TouchableOpacity`
  background-color: #1d60ff;
  width: 100%;
  padding: 16px;
  border-radius: 15px;
  align-items: center;
  margin-bottom: 12px;
  elevation: 5;
`;

const PrimaryButtonText = styled.Text`
  color: white;
  font-size: 17px;
  font-weight: 700;
`;
