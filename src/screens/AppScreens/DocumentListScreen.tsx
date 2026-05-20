import React, { useRef, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  ListRenderItem,
} from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import EmptyContent from "../../components/shared/EmptyContent";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import FilterTabs from "../../components/shared/FilterTabs";
import SearchBar from "../../components/shared/SearchBar";
import FilterBottomSheet from "../../components/shared/FilterBottomSheet";

import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useInfiniteQuery } from "@tanstack/react-query";
import { documentListPaginated } from "../../services/documentService";
import { useAuth } from "../../context/ContextAPI";
import DocumentCard from "../../components/Documents/DocumentCard";
import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";
import { MedicalDocument } from "../../types";

const CATEGORIES = [
  { key: "All", value: "All" },
  { key: "Family", value: "family" },
  { key: "Medical Documents", value: "medical_document" },
  { key: "Insurance", value: "insurance" },
  { key: "Other", value: "other" },
];

const SORT_OPTIONS = [
  {
    label: "Newest First",
    description: "Recently added documents",
    value: "date_desc",
    icon: "calendar",
  },
  {
    label: "Oldest First",
    description: "Earliest added documents",
    value: "date_asc",
    icon: "calendar-outline",
  },
  {
    label: "A-Z",
    description: "Alphabetical ascending",
    value: "name_asc",
    icon: "alpha-a-box",
  },
  {
    label: "Z-A",
    description: "Alphabetical descending",
    value: "name_desc",
    icon: "alpha-z-box",
  },
];

type Category = (typeof CATEGORIES)[number]["key"];

const DocumentList = () => {
  const navigation = useAppNavigation();
  const { isDark } = useAppTheme();
  const refRBSheet = useRef<BottomSheetModal>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<Category>("All");
  const [sortOption, setSortOption] = useState("date_desc");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    handleGalleryPick,
    handleOpenCamera,
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    takePicture,
  } = useDocumentMedia();

  const {
    data: documentListData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["documents", userId, activeTab],
    queryFn: ({ pageParam = 1 }) =>
      documentListPaginated({
        activeCategory: activeTab,
        page: pageParam as number,
        pageLimit: 10,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.data.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });

  const documents = useMemo(() => {
    const flattened =
      documentListData?.pages.flatMap((page) => page.data) || [];

    return flattened
      .filter((doc: MedicalDocument) => {
        if (activeTab !== "All") {
          const activeValue = CATEGORIES.find(
            (category) => category.key === activeTab,
          )?.value;
          if (doc.documentType?.toUpperCase() !== activeValue?.toUpperCase()) {
            return false;
          }
        }
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const matchName = (doc.title || doc.fileName || "").toLowerCase().includes(q);
          const matchNotes = doc.notes?.toLowerCase().includes(q);
          const matchType = doc.documentType?.toLowerCase().includes(q);
          return !!(matchName || matchNotes || matchType);
        }
        return true;
      })
      .sort((a: MedicalDocument, b: MedicalDocument) => {
        const firstName = a.title || a.fileName || "";
        const secondName = b.title || b.fileName || "";

        switch (sortOption) {
          case "name_asc":
            return firstName.localeCompare(secondName);
          case "name_desc":
            return secondName.localeCompare(firstName);
          case "date_asc":
            return (
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime()
            );
          case "date_desc":
            return (
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
            );
          default:
            return 0;
        }
      });
  }, [documentListData, activeTab, sortOption]);

  const renderItem: ListRenderItem<MedicalDocument> = useCallback(
    ({ item }) => <DocumentCard document={item} />,
    [],
  );

  const gradientColors = useMemo(
    () =>
      isDark
        ? ["#064e3b", "#0369a1", "#312e81"]
        : ["#0f766e", "#0ea5e9", "#4f46e5"],
    [isDark],
  );

  return (
    <Container
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef)}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {isCapturing && <Loader visible={isCapturing} />}

      <HeaderWrapper>
        <HeaderMain>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </BackButton>
          <HeaderTitle>My Documents</HeaderTitle>
          <RightActions>
            <IconButton onPress={() => filterSheetRef.current?.present()}>
              <MaterialCommunityIcons name="filter" size={20} color="white" />
            </IconButton>
            <RightButton onPress={() => refRBSheet.current?.present()}>
              <Ionicons name="add" size={30} color="black" />
            </RightButton>
          </RightActions>
        </HeaderMain>

        <SearchBarWrapper>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents..."
          />
        </SearchBarWrapper>
      </HeaderWrapper>

      <ContentContainer>
        <FilterTabs
          data={CATEGORIES.map((category) => category.key)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isDark={isDark}
        />

        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                size="large"
                style={{ marginTop: 50 }}
                color="#8b5cf6"
              />
            ) : (
              <EmptyContent />
            )
          }
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color="#8b5cf6"
                style={{ marginVertical: 20 }}
              />
            ) : null
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
          onDocumentPick={() => {}}
        />
      </BottomSheet>

      <FilterBottomSheet
        ref={filterSheetRef}
        selectedSort={sortOption}
        onSelectSort={setSortOption}
        onApply={() => filterSheetRef.current?.dismiss()}
      />
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
  padding-bottom: 12px;
`;

const SearchBarWrapper = styled.View`
  padding-horizontal: 20px;
  margin-top: 10px;
`;

const HeaderMain = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 20px;
  height: 50px;
  position: relative;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  z-index: 10;
  padding: 5px;
`;

const RightButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  padding: 5px;
  background-color: #ffffff;
  border-radius: 24px;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  padding-left: 50px;
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-align: center;
`;

const RightActions = styled.View`
  flex-direction: row;
  align-items: center;
  position: absolute;
  right: 20px;
  z-index: 10;
`;

const IconButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  margin-right: 8px;
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: white;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
`;
