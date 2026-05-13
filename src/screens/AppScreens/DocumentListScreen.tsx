import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import EmptyContent from "../../components/shared/EmptyContent";

import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useQuery } from "@tanstack/react-query";
import { documentListPaginated } from "../../services/documentService";
import { useAuth } from "../../context/ContextAPI";
import DocumentCard from "../../components/Documents/DocumentCard";
import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";

const CATEGORIES = ["All", "Family", "Medical Documents", "Insurance", "Other"];

const DocumentList = () => {
  const navigation = useAppNavigation();
  const { isDark } = useAppTheme();
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
    <Container
      colors={
        isDark
          ? ["#064e3b", "#0369a1", "#312e81"]
          : ["#0f766e", "#0ea5e9", "#4f46e5"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />

      <HeaderWrapper>
        <HeaderMain>
          <BackButton onPress={() => navigation.navigate("Home")}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </BackButton>
          <HeaderTitle>My Documents</HeaderTitle>
          <RightButton onPress={() => refRBSheet.current?.present()}>
            <Ionicons name="add" size={30} color="black" />
          </RightButton>
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

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderWrapper = styled.SafeAreaView`
  background-color: transparent;
  padding-top: 40px;
  padding-bottom: 20px;
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

const RightButton = styled.TouchableOpacity`
  position: absolute;
  right: 20px;
  z-index: 10;
  padding: 5px;
  background-color: #FFFFFF;
  border-radius: 24px;
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

const TabItem = ({ active, onPress, children }: any) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.8} 
      style={{
        borderRadius: 25, 
        overflow: 'hidden', 
        backgroundColor: active ? 'transparent' : 'white',
        marginRight: 12,
        borderWidth: 1,
        borderColor: active ? 'transparent' : '#f1f5f9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4
      }}
    >
      {active ? (
        <LinearGradient
          colors={["#4f46e5", "#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 25, paddingVertical: 10 }}
        >
          {children}
        </LinearGradient>
      ) : (
        <View style={{ paddingHorizontal: 25, paddingVertical: 10 }}>
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
};

const TabText = styled.Text<{ active: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ active }: { active: boolean }) =>
    active ? "white" : "#1e293b"};
`;