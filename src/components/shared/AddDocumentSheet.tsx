import React from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

interface AddDocumentSheetProps {
  isProfilePicture?: boolean;
  onGalleryPick: () => void;
  onCameraOpen: () => void;
  onDocumentPick: () => void;
}

const AddDocumentSheet = ({
  isProfilePicture = false,
  onGalleryPick,
  onCameraOpen,
  onDocumentPick,
}: AddDocumentSheetProps) => {
  return (
    <SheetContentWrapper>
      <HeaderSection>
        <SheetTitle>
          {isProfilePicture ? "Upload Profile Picture" : "Upload Document"}
        </SheetTitle>
        <SheetSubtitle>Choose an option to upload</SheetSubtitle>
      </HeaderSection>

      <OptionsContainer>
        <OptionRow onPress={onCameraOpen} isFirst>
          <IconContainer bgColor="#f5f3ff">
            <MaterialCommunityIcons
              name="camera-outline"
              size={26}
              color="#7c3aed"
            />
          </IconContainer>
          <TextContent>
            <OptionTitle>Camera</OptionTitle>
            <OptionDesc>Take a photo</OptionDesc>
          </TextContent>
          <Feather name="chevron-right" size={20} color="#94a3b8" />
        </OptionRow>

        {/* Gallery Option */}
        <OptionRow onPress={onGalleryPick}>
          <IconContainer bgColor="#fff1f2">
            <MaterialCommunityIcons
              name="image-outline"
              size={26}
              color="#f43f5e"
            />
          </IconContainer>
          <TextContent>
            <OptionTitle>Gallery</OptionTitle>
            <OptionDesc>Choose from gallery</OptionDesc>
          </TextContent>
          <Feather name="chevron-right" size={20} color="#94a3b8" />
        </OptionRow>

        {/* PDF Option */}
        {!isProfilePicture && (
          <OptionRow onPress={onDocumentPick} isFirst>
          <IconContainer bgColor="#f5f3ff">
            <MaterialCommunityIcons
              name="file-outline"
              size={26}
              color="#7c3aed"
            />
          </IconContainer>
          <TextContent>
            <OptionTitle>PDF</OptionTitle>
            <OptionDesc>Choose PDF</OptionDesc>
          </TextContent>
          <Feather name="chevron-right" size={20} color="#94a3b8" />
        </OptionRow>
        )}
      </OptionsContainer>
    </SheetContentWrapper>
  );
};

export default AddDocumentSheet;

const SheetContentWrapper = styled.View`
  padding: 12px 20px 40px;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
`;

const HeaderSection = styled.View`
  margin-bottom: 25px;
`;

const SheetTitle = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
`;

const OptionsContainer = styled.View`
  border-width: 1px;
  border-color: #f1f5f9;
  border-radius: 20px;
  overflow: hidden;
`;

const OptionRow = styled.TouchableOpacity<{
  isFirst?: boolean;
  isLast?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-bottom-width: 1px;
  border-bottom-color: ${({ isLast }: { isLast?: boolean }) =>
    isLast ? "transparent" : "#f1f5f9"};
`;

const IconContainer = styled.View<{ bgColor: string }>`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background-color: ${({ bgColor }: { bgColor: string }) => bgColor};
  justify-content: center;
  align-items: center;
`;

const TextContent = styled.View`
  flex: 1;
  margin-left: 16px;
`;

const OptionTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
`;

const OptionDesc = styled.Text`
  font-size: 13px;
  color: #94a3b8;
  margin-top: 2px;
`;
