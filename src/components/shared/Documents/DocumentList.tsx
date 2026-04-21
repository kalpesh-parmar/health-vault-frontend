import React, { useState } from "react";
import { FlatList } from "react-native";
import styled from "styled-components/native";
import EmptyContent from "../EmptyContent";
import ScreenHeader from "../Header";
import { Ionicons } from "@expo/vector-icons";
import { MedicalDocument } from "./DocumentCard";

const DUMMY_DOCS: MedicalDocument[] = [
  { id: "1", title: "Blood Test Results", createdAt: "12 Oct 2025" },
  { id: "2", title: "Dental X-Ray", createdAt: "05 Nov 2025" },
  { id: "3", title: "Vaccination Record", createdAt: "20 Nov 2025" },
  { id: "4", title: "MRI Scan - Knee", createdAt: "01 Dec 2025" },
  { id: "5", title: "Prescription - Vitamins", createdAt: "15 Dec 2025" },
];

const DocumentList = ({ navigation }: any) => {
  const [documents, setDocuments] = useState<MedicalDocument[]>(DUMMY_DOCS);

  const renderItem = ({ item }: { item: MedicalDocument }) => {
    return (
      <DocCard
        activeOpacity={0.75}
        onPress={() => {
          navigation.navigate("SummaryScreen", { document: item });
        }}
      >
        <DocIconBox style={{ backgroundColor: "#EEF3FD" }}>
          <Ionicons name={"document-text"} size={20} color={"#1246A8"} />
        </DocIconBox>
        <DocInfo>
          <DocTitle numberOfLines={1}>{item.title}</DocTitle>
          <DocDate>{item.createdAt}</DocDate>
        </DocInfo>
        <DocRight>
          <Ionicons name="chevron-forward" size={16} color="#7a7f86ff" />
        </DocRight>
      </DocCard>
    );
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

const DocCard = styled.TouchableOpacity`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 14px 16px;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  border-width: 0.5px;
  border-color: #e2e8f0;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.04;
  shadow-radius: 6px;
  shadow-offset: 0px 2px;
`;

const DocIconBox = styled.View`
  width: 44px;
  height: 44px;
  background-color: #eef3fd;
  border-radius: 13px;
  align-items: center;
  justify-content: center;
`;

const DocInfo = styled.View`
  flex: 1;
`;

const DocTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 3px;
`;

const DocDate = styled.Text`
  font-size: 12px;
  color: #94a3b8;
`;

const DocRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
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
