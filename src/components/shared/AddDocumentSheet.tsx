import React from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface AddDocumentSheetProps {
  onGalleryPick: () => void;
  onCameraOpen: () => void;
}

const AddDocumentSheet = ({
  onGalleryPick,
  onCameraOpen,
}: AddDocumentSheetProps) => {
  const { isDark } = useAppTheme();

  return (
    <SheetContentWrapper>
      <SheetTitle>Add Document</SheetTitle>
      <SheetSubtitle>Securely upload or capture your record</SheetSubtitle>

      <SheetButtonsContainer>
        <SheetActionButton onPress={onGalleryPick}>
          <IconWrapper
            style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}
          >
            <MaterialCommunityIcons
              name="image-plus"
              size={28}
              color="#3b82f6"
            />
          </IconWrapper>
          <SheetActionButtonText>Gallery</SheetActionButtonText>
        </SheetActionButton>

        <SheetActionButton onPress={onCameraOpen}>
          <IconWrapper
            style={{ backgroundColor: isDark ? "#14532d" : "#f0fdf4" }}
          >
            <MaterialCommunityIcons
              name="camera-plus"
              size={28}
              color="#22c55e"
            />
          </IconWrapper>
          <SheetActionButtonText>Camera</SheetActionButtonText>
        </SheetActionButton>
      </SheetButtonsContainer>
    </SheetContentWrapper>
  );
};

export default AddDocumentSheet;

const SheetContentWrapper = styled.View`
  padding: 25px 20px;
  align-items: center;
`;

const SheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 6px;
  margin-bottom: 30px;
  text-align: center;
`;

const SheetButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-evenly;
  width: 100%;
`;

const SheetActionButton = styled.TouchableOpacity`
  align-items: center;
  width: 100px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 16px;
  border-radius: 20px;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
  elevation: 3;
`;

const IconWrapper = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SheetActionButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;
