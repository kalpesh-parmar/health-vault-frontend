import React, { forwardRef } from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "../shared/BottomSheet";
import { useAppTheme } from "../../context/ThemeContext";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

interface UploadBottomSheetProps {
  fromScreen?: boolean;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onChooseDocument: () => void;
}

export const UploadBottomSheet = forwardRef<any, UploadBottomSheetProps>(
  ({ fromScreen, onTakePhoto, onChooseGallery, onChooseDocument }, ref) => {
    const bottomPadding = useBottomBarPadding(32, 16);

    const handleOptionPress = (callback: () => void) => {
      if (ref && "current" in ref && ref.current) {
        ref.current.dismiss();
      }
      callback();
    };

    return (
      <BottomSheet ref={ref}>
        <SheetContentWrapper bottomPadding={bottomPadding}>
          <HeaderSection>
            <SheetTitle>Upload Medical Document</SheetTitle>
            <SheetSubtitle>
              Please select a source to upload your file
            </SheetSubtitle>
          </HeaderSection>

          <OptionsContainer>
            {/* Take Photo */}
            <OptionRow onPress={() => handleOptionPress(onTakePhoto)} isFirst>
              <IconContainer bgColor="#f5f3ff">
                <Ionicons name="camera-outline" size={24} color="#7c3aed" />
              </IconContainer>
              <TextContent>
                <OptionTitle>Take Photo</OptionTitle>
                <OptionDesc>Use camera to capture document</OptionDesc>
              </TextContent>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </OptionRow>

            {/* Choose from Gallery */}
            <OptionRow onPress={() => handleOptionPress(onChooseGallery)}>
              <IconContainer bgColor="#fff1f2">
                <Ionicons name="image-outline" size={24} color="#f43f5e" />
              </IconContainer>
              <TextContent>
                <OptionTitle>Choose from Gallery</OptionTitle>
                <OptionDesc>Select from your photo library</OptionDesc>
              </TextContent>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </OptionRow>

            {/* Choose Document */}
            {!fromScreen && (
              <OptionRow
                onPress={() => handleOptionPress(onChooseDocument)}
                isLast
              >
                <IconContainer bgColor="#f0fdf4">
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color="#16a34a"
                  />
                </IconContainer>
                <TextContent>
                  <OptionTitle>Choose Document</OptionTitle>
                  <OptionDesc>Select PDF or image file</OptionDesc>
                </TextContent>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </OptionRow>
            )}
          </OptionsContainer>

          <CancelButton
            onPress={() => ref && "current" in ref && ref.current?.dismiss()}
          >
            <CancelButtonText>Cancel</CancelButtonText>
          </CancelButton>
        </SheetContentWrapper>
      </BottomSheet>
    );
  },
);

export default UploadBottomSheet;

const SheetContentWrapper = styled.View<{ bottomPadding: number }>`
  padding: 12px 20px ${(props: any) => props.bottomPadding}px;
`;

const HeaderSection = styled.View`
  margin-bottom: 24px;
`;

const SheetTitle = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textSecondary};
  margin-top: 4px;
`;

const OptionsContainer = styled.View`
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 20px;
  overflow: hidden;
  background-color: ${({ theme }: any) => theme.colors.surface};
  margin-bottom: 20px;
`;

const OptionRow = styled.TouchableOpacity<{
  isFirst?: boolean;
  isLast?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding: 16px;
  border-bottom-width: ${({ isLast }: any) => (isLast ? 0 : 1)}px;
  border-bottom-color: ${({ theme }: any) => theme.colors.border};
`;

const IconContainer = styled.View<{ bgColor: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: ${({ bgColor }: any) => bgColor};
  justify-content: center;
  align-items: center;
`;

const TextContent = styled.View`
  flex: 1;
  margin-left: 16px;
`;

const OptionTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const OptionDesc = styled.Text`
  font-size: 12.5px;
  color: ${({ theme }: any) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const CancelButton = styled.TouchableOpacity`
  width: 100%;
  height: 52px;
  border-radius: 26px;
  background-color: ${({ theme }: any) => theme.colors.border};
  justify-content: center;
  align-items: center;
`;

const CancelButtonText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;
