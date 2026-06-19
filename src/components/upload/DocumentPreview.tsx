import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface DocumentPreviewProps {
  fileName: string;
  fileSize?: string | number;
  uri: string;
  fileType: "pdf" | "image";
  onRemove: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  fileName,
  fileSize,
  uri,
  fileType,
  onRemove,
}) => {
  const { isDark } = useAppTheme();

  const formattedSize = typeof fileSize === "number"
    ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
    : fileSize;

  return (
    <Container>
      <Card>
        {fileType === "image" ? (
          <ImagePreview source={{ uri }} />
        ) : (
          <PdfIconContainer>
            <Ionicons name="document-text" size={32} color="#ef4444" />
          </PdfIconContainer>
        )}

        <InfoSection>
          <FileName numberOfLines={1}>{fileName}</FileName>
          {formattedSize && <FileSize>{formattedSize}</FileSize>}
        </InfoSection>

        <RemoveButton onPress={onRemove}>
          <Ionicons name="close-circle" size={24} color={isDark ? "#ef4444" : "#dc2626"} />
        </RemoveButton>
      </Card>
    </Container>
  );
};

export default DocumentPreview;

const Container = styled.View`
  margin: 12px 16px;
`;

const Card = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 16px;
  padding: 12px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const ImagePreview = styled.Image`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: #e2e8f0;
`;

const PdfIconContainer = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: #fee2e2;
  justify-content: center;
  align-items: center;
`;

const InfoSection = styled.View`
  flex: 1;
  margin-left: 12px;
  margin-right: 8px;
`;

const FileName = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const FileSize = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const RemoveButton = styled.TouchableOpacity`
  padding: 4px;
`;
