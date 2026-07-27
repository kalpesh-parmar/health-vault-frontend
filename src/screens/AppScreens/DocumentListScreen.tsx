import React, { useRef, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  ListRenderItem,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import { EmptyDocuments } from "../../components/shared/DefensiveStates";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import FilterTabs from "../../components/shared/FilterTabs";
import SearchBar from "../../components/shared/SearchBar";
import FilterBottomSheet, {
  FilterOptionItem,
} from "../../components/shared/FilterBottomSheet";

import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { safeArray } from "../../utils/arrayUtils";
import {
  documentListPaginated,
  filterDocuments,
  listDocument,
} from "../../services/documentService";
import { useAuth } from "../../context/ContextAPI";
import DocumentCard from "../../components/Documents/DocumentCard";
import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";
import { MedicalDocument } from "../../types";
import ErrorBoundary from "../../components/shared/ErrorBoundary";

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
    description: "Recently added items",
    value: "date_desc",
    icon: "calendar",
  },
  {
    label: "Oldest First",
    description: "Earliest added items",
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

const DocumentList = () => {
  const navigation = useAppNavigation();
  const { isDark } = useAppTheme();
  const refRBSheet = useRef<BottomSheetModal>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("date_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // Focus hook to reset filters when screen gains focus (so it does not persist across navigations)
  useFocusEffect(
    useCallback(() => {
      setActiveTab("All");
      setSortOption("date_desc");
      setSearchQuery("");
      setIsFilterApplied(false);
    }, []),
  );

  const {
    handleGalleryPick,
    handleOpenCamera,
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    isProcessing,
    takePicture,
    handleDocumentPick,
  } = useDocumentMedia();

  // Fetch filtered documents when a filter/sort option is applied from FilterBottomSheet
  const { data: filteredDocuments, isLoading: isLoadingFiltered } = useQuery({
    queryKey: ["filteredDocuments", userId, activeTab, sortOption, searchQuery],
    queryFn: () => {
      let sortBy = "createdAt";
      let orderBy: "asc" | "desc" = "desc";

      if (sortOption === "date_desc") {
        sortBy = "createdAt";
        orderBy = "desc";
      } else if (sortOption === "date_asc") {
        sortBy = "createdAt";
        orderBy = "asc";
      } else if (sortOption === "name_asc") {
        sortBy = "fileName";
        orderBy = "asc";
      } else if (sortOption === "name_desc") {
        sortBy = "fileName";
        orderBy = "desc";
      }

      return filterDocuments({
        filter: {
          search:
            searchQuery.trim().length > 0
              ? searchQuery
              : activeTab === "All"
                ? ""
                : activeTab,
        },
        sort: {
          sortBy,
          orderBy,
        },
      });
    },
    enabled: (isFilterApplied || searchQuery.trim().length > 0) && !!userId,
  });

  // Fetch all documents when "All" is active.
  const { data: allDocsData, isLoading: isLoadingAll } = useQuery({
    queryKey: ["allDocuments", userId],
    queryFn: listDocument,
    enabled: activeTab === "All" && !isFilterApplied && !!userId,
  });

  // Fetch paginated documents when a specific tab is active (useInfiniteQuery)
  const {
    data: documentListData,
    isLoading: isLoadingInfinite,
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
      const data = lastPage?.data
        ? Array.isArray(lastPage.data)
          ? lastPage.data
          : Array.isArray(lastPage.data.items)
            ? lastPage.data.items
            : []
        : [];
      return data.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab !== "All" && !isFilterApplied && !!userId,
  });

  const isLoading =
    isFilterApplied || searchQuery.trim().length > 0
      ? isLoadingFiltered
      : activeTab === "All"
        ? isLoadingAll
        : isLoadingInfinite;

  const documents = useMemo(() => {
    const getSafeArray = (response: any) => {
      if (!response) return [];
      const arr = safeArray(response);
      if (arr.length > 0) return arr;
      if (response.data) {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data.items)) return response.data.items;
      }
      if (Array.isArray(response.items)) return response.items;
      return [];
    };

    if (isFilterApplied || searchQuery.trim().length > 0) {
      return getSafeArray(filteredDocuments?.data || filteredDocuments);
    } else if (activeTab === "All") {
      return getSafeArray(allDocsData);
    } else {
      const pages = Array.isArray(documentListData?.pages)
        ? documentListData.pages
        : [];
      return pages.flatMap((page) => getSafeArray(page));
    }
  }, [
    allDocsData,
    documentListData,
    filteredDocuments,
    activeTab,
    isFilterApplied,
    searchQuery,
  ]);

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
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="rgba(0,0,0,0.2)"
      />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef)}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {(isCapturing || isProcessing) && <Loader visible={isCapturing || isProcessing} currentStage={isProcessing ? "VALIDATING" : undefined} />}

      <HeaderWrapper edges={["top"]}>
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
          data={CATEGORIES.map((category) => category.value)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsFilterApplied(false); // Reset sort/filter on tab change
          }}
          isDark={isDark}
        />

        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                size="large"
                style={{ marginTop: 50 }}
                color="#8b5cf6"
              />
            ) : (
              <EmptyDocuments
                message={`No ${activeTab === "All" ? "documents" : activeTab.toLowerCase() + " documents"} found.`}
              />
            )
          }
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={() => {
            if (activeTab !== "All" && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            activeTab !== "All" && isFetchingNextPage ? (
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
          onMultiUploadPick={() => {
            refRBSheet.current?.dismiss();
            navigation.navigate("MultiUpload");
          }}
          onGalleryPick={() =>
            handleGalleryPick(() => refRBSheet.current?.dismiss())
          }
          onCameraOpen={() =>
            handleOpenCamera(() => refRBSheet.current?.dismiss())
          }
          onDocumentPick={() =>
            handleDocumentPick(() => refRBSheet.current?.dismiss())
          }
        />
      </BottomSheet>

      <FilterBottomSheet
        ref={filterSheetRef}
        title="Sort Documents"
        subtitle="Choose how to order your items"
        onApply={() => {
          setIsFilterApplied(true);
          filterSheetRef.current?.dismiss();
        }}
        onReset={() => {
          setSortOption("date_desc");
          setIsFilterApplied(false);
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <FilterOptionItem
            key={option.value}
            title={option.label}
            subtitle={option.description}
            icon={option.icon}
            isActive={sortOption === option.value}
            onPress={() => setSortOption(option.value)}
          />
        ))}
      </FilterBottomSheet>
    </Container>
  );
};

const DocumentListWithErrorBoundary = (props: any) => (
  <ErrorBoundary
    componentName="DocumentList"
    receivedProps={props}
    navigationParams={props.route?.params}
    fallbackTitle="Unable to load documents"
    fallbackSubtitle="There was an error displaying your documents list."
  >
    <DocumentList {...props} />
  </ErrorBoundary>
);

export default DocumentListWithErrorBoundary;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderWrapper = styled(SafeAreaView)`
  background-color: transparent;
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
