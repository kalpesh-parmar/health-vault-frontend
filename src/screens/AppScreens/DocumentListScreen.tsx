import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import EmptyContent from "../../components/shared/EmptyContent";

import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useQuery } from "@tanstack/react-query";
import { documentListPaginated } from "../../services/documentService";
import { useAuth } from "../../context/ContextAPI";
import type { MedicalDocument } from "../../types";
import DocumentCard from "../../components/Documents/DocumentCard";
import { useAppNavigation } from "../../types/navigation";

const CATEGORIES = ["All", "Family", "Medical Documents", "Insurance", "Other"];

const DocumentList = () => {
  const navigation = useAppNavigation();
  const refRBSheet = useRef<BottomSheetModal>(null);
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState("All");

  const {
    handleGalleryPick,
    handleOpenCamera,
  } = useDocumentMedia();

  const { data: documentListData, isFetching } = useQuery({
    queryKey: ["documents", userId, activeTab],
    queryFn: () =>
      documentListPaginated({
        activeCategory: activeTab,
        page: 1,
        pageLimit: 10,
      }),
    enabled: !!userId,
  });

  const documents = documentListData?.data || [];

  const renderItem = useCallback(
    ({ item }: any) => (
      <DocumentCard document={item} />
    ),
    [],
  );

  return (
    <Container>
      <StatusBar barStyle="light-content" />

      <HeaderWrapper>
        <HeaderMain>
          <BackButton onPress={() => navigation.navigate("Home")}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </BackButton>
          <HeaderTitle>My Documents</HeaderTitle>
        </HeaderMain>
      </HeaderWrapper>

      <ContentContainer>
        <FilterWrapper>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {CATEGORIES.map((cat) => (
              <TabItem
                key={cat}
                active={activeTab === cat}
                onPress={() => setActiveTab(cat)}
              >
                <TabText active={activeTab === cat}>{cat}</TabText>
              </TabItem>
            ))}
          </ScrollView>
        </FilterWrapper>

        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            isFetching ? (
              <ActivityIndicator size={"large"} style={{ marginTop: 50 }} color="#8b5cf6" />
            ) : (
              <EmptyContent />
            )
          }
        />
      </ContentContainer>

      <BottomSheet ref={refRBSheet}>
        <AddDocumentSheet
          onGalleryPick={() =>
            handleGalleryPick(() => refRBSheet.current?.dismiss())
          }
          onCameraOpen={() =>
            handleOpenCamera(() => refRBSheet.current?.dismiss())
          }
        />
      </BottomSheet>
    </Container>
  );
};

export default DocumentList;

const Container = styled.View`
  flex: 1;
  background-color: #8b5cf6; /* Matching the primary purple from the header */
`;

const HeaderWrapper = styled.SafeAreaView`
  background-color: transparent;
  padding-top: 30px;
  padding-bottom: 25px;
`;

const HeaderMain = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 20px;
  height: 50px; /* Give it a fixed height for better alignment */
  position: relative;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  z-index: 10; /* Ensures it sits above the title layer */
  padding: 5px; /* Increases touch target area */
`;

const HeaderTitle = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: white;
  width: 100%;
  text-align: center;
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: white;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
`;

const FilterWrapper = styled.View`
  padding-vertical: 25px;
`;

const TabItem = styled.TouchableOpacity<{ active: boolean }>`
  padding-horizontal: 25px;
  padding-vertical: 10px;
  border-radius: 25px;
  background-color: ${({ active }: { active: boolean }) =>
    active ? "#6d48ddff" : "white"};
  margin-right: 12px;
  border-width: 1px;
  border-color: ${({ active }: { active: boolean }) =>
    active ? "#a78bfa" : "#f1f5f9"};
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
  elevation: 2;
`;

const TabText = styled.Text<{ active: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ active }: { active: boolean }) =>
    active ? "white" : "#1e293b"};
`;