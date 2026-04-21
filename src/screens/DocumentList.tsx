import React, { useState } from "react";
import { FlatList } from "react-native";
import styled from "styled-components/native";
import DocumentCard, { MedicalDocument } from "../components/Documents/DocumentCard";
import EmptyContent from "../components/shared/EmptyContent";

const DUMMY_DOCS: MedicalDocument[] = [
  { id: "1", title: "Blood Test Results", createdAt: "12 Oct 2025" },
  { id: "2", title: "Dental X-Ray", createdAt: "05 Nov 2025" },
  { id: "3", title: "Vaccination Record", createdAt: "20 Nov 2025" },
  { id: "4", title: "MRI Scan - Knee", createdAt: "01 Dec 2025" },
  { id: "5", title: "Prescription - Vitamins", createdAt: "15 Dec 2025" },
];

const DocumentList = ({navigation}: any) => {
  const [documents, setDocuments] = useState<MedicalDocument[]>(DUMMY_DOCS);

  const renderItem = ({ item }: { item: MedicalDocument }) => (
    <CardWrapper>
      <DocumentCard
        item={item}
      />
    </CardWrapper>
  );

  return (
    <Container>
      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 6,
          flexGrow: 1,
        }}
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
  margin-top: 6px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  padding: 0px 20px 8px;
`;

const SectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
`;

const CountText = styled.Text`
  font-size: 13px;
  color: #64748b;
  background-color: #e2e8f0;
  padding: 4px 10px;
  border-radius: 10px;
`;

const CardWrapper = styled.View`
  margin-bottom: 12px;
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
