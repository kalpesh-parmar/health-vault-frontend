import React, { useState } from "react";
import { FlatList } from "react-native";
import styled from "styled-components/native";
import EmptyContent from "../shared/EmptyContent";
import ScreenHeader from "../shared/Header";
import DocumentCard, { MedicalDocument } from "./DocumentCard";

const DUMMY_DOCS: MedicalDocument[] = [
  {
    id: "1",
    title: "Blood Test Results",
    category: "Medical",
    createdAt: "12 Oct 2025",
    notes: "This is a blood test result.",
    AISummary: "This is an AI summary of the blood test result.",
  },
  {
    id: "2",
    title: "Dental X-Ray",
    category: "Medical",
    createdAt: "05 Nov 2025",
  },
  {
    id: "3",
    title: "Vaccination Record",
    category: "Medical",
    createdAt: "20 Nov 2025",
  },
  {
    id: "4",
    title: "MRI Scan - Knee",
    category: "Medical",
    createdAt: "01 Dec 2025",
  },
  {
    id: "5",
    title: "Prescription - Vitamins",
    category: "Medical",
    createdAt: "15 Dec 2025",
  },
];

const DocumentList = () => {
  const [documents, setDocuments] = useState<MedicalDocument[]>(DUMMY_DOCS);

  const renderItem = ({ item }: { item: MedicalDocument }) => {
    return <DocumentCard document={item} />;
  };

  return (
    <Container>
      <HeaderBand>
        <ScreenHeader title="Documents" showBack />
        <HeaderContent>
          <HeaderTitle>Your Health Records</HeaderTitle>
          <HeaderSubtitle>
            {documents.length} documents stored securely
          </HeaderSubtitle>
        </HeaderContent>
      </HeaderBand>

      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingBottom: 100,
          paddingTop: 0,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <>
            <SectionLabel>
              <SectionLabelText>Recent</SectionLabelText>
            </SectionLabel>
          </>
        }
        ListEmptyComponent={
          <EmptyStateWrapper>
            <EmptyContent />
            <EmptySubText>
              No documents yet. Add your first record.
            </EmptySubText>
          </EmptyStateWrapper>
        }
      />
    </Container>
  );
};

export default DocumentList;

const Container = styled.View`
  flex: 1;
  background-color: #f0f4ff;
`;

const HeaderBand = styled.View`
  margin-bottom: 20px;
`;

const HeaderContent = styled.View`
  padding: 8px 20px 0;
`;

const HeaderTitle = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: #000000;
  margin-top: 13px;
`;

const HeaderSubtitle = styled.Text`
  font-size: 13px;
  color: #000000;
`;

const SectionLabel = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionLabelText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  padding-left: 13px;
`;

const EmptyStateWrapper = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
`;

const EmptySubText = styled.Text`
  margin-top: 8px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
`;
