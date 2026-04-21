import React from "react";
import styled from "styled-components/native";
import ScreenHeader from "../components/shared/Header";
import { MedicalDocument } from "../components/Documents/DocumentCard";
import { Ionicons } from "@expo/vector-icons";

interface DocumentsProps {
  document: MedicalDocument;
}


const SummaryScreen = ({document}: DocumentsProps) => {
  const handleDelete = (id: string) => {
    // Document Deletion API call will be made here.
  }

  const handleEdit = (id: string, updatedData?: Partial<MedicalDocument>) => {
    // Document Edit API call will be made here.
  }

  return (
    <Container>
      <ScreenHeader title="Summary" showBack={true} />

      <TitleRow>
          <TitleSection>
            <DocumentTitle>{document.title}</DocumentTitle>
            <DocumentDate>{document.createdAt}</DocumentDate>
          </TitleSection>

          <EditButton onPress={() => handleEdit(document.id)}>
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </EditButton>
        </TitleRow>

      {document.imageUri && (
        <PreviewCard>
          <PreviewImage source={{ uri: document.imageUri }} />
        </PreviewCard>
      )}

      <SummaryCard>
        <SummaryTitle>AI Summary</SummaryTitle>
        <SummaryText>
          {document.AISummary || "AI summary will be generated on OCR API call."}
        </SummaryText>
      </SummaryCard>

      <DeleteButton onPress={() => handleDelete(document.id)}>
          <Ionicons name="trash-outline" size={18} color="#ffffff" />
          <DeleteText>Delete Document</DeleteText>
        </DeleteButton>
    </Container>
  );
};

export default SummaryScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #ffffff;
`;

const TitleRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
`;

const TitleSection = styled.View`
  padding: 20px;
`;

const EditButton = styled.TouchableOpacity`
  background-color: #eff6ff;
  padding: 10px;
  border-radius: 12px;
  shadow-color: #2563eb;
  shadow-opacity: 0.1;
  shadow-radius: 6px;
  elevation: 2;
`;

const DocumentTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
`;

const DocumentDate = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const PreviewCard = styled.View`
  margin: 0 20px;
  border-radius: 20px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-radius: 10px;
  elevation: 4;
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: 220px;
`;

const SummaryCard = styled.View`
  margin: 20px;
  padding: 20px;
  border-radius: 20px;
  background-color: #f8fafc;
  shadow-color: #2563eb;
  shadow-opacity: 0.08;
  shadow-radius: 10px;
  elevation: 3;
`;

const SummaryTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: #2563eb;
  margin-bottom: 10px;
`;

const SummaryText = styled.Text`
  font-size: 14px;
  color: #334155;
  line-height: 22px;
`;

const DeleteButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin: 10px 20px 30px;
  padding: 16px;
  border-radius: 18px;
  background-color: #ef4444;
  shadow-color: #ef4444;
  shadow-opacity: 0.2;
  shadow-radius: 10px;
  elevation: 4;
`;

const DeleteText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  margin-left: 8px;
`;
