import React from "react";
import styled from "styled-components/native";
import { COLORS } from "../../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const EmptyContent = () => {
  return (
    <EmptyContainer>
      <EmptyIconWrapper>
        <MaterialCommunityIcons name="cloud-upload-outline" size={80} color={COLORS.emptyText} />
      </EmptyIconWrapper>
      <EmptyTitle>Your vault is empty</EmptyTitle>
      <EmptySubtitle>
        Tap the ‘+’ button to securely upload your first medical document or
        report.
      </EmptySubtitle>
    </EmptyContainer>
  );
};

export default EmptyContent;

const EmptyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const EmptyIconWrapper = styled.View`
  width: 150px;
  height: 150px;
  border-radius: 75px;
  background-color: rgba(255, 255, 255, 0.9);
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  border: 2px dashed black;
`;

const EmptyTitle = styled.Text`
  font-size: 23px;
  font-weight: 700;
  color: black;
  margin-bottom: 10px;
`;

const EmptySubtitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: black;
  text-align: center;
  line-height: 22px;
`;
