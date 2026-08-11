import React, { useRef, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  ListRenderItem,
  Modal,
  View,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import { EditDocumentBottomSheet } from "../../components/shared/EditDocumentBottomSheet";
import { ShareDocumentSheet } from "../../components/shared/ShareDocumentSheet";
import { EmptyDocuments } from "../../components/shared/DefensiveStates";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import FilterTabs from "../../components/shared/FilterTabs";
import SearchBar from "../../components/shared/SearchBar";
import FilterBottomSheet, {
  FilterOptionItem,
} from "../../components/shared/FilterBottomSheet";

import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { safeArray } from "../../utils/arrayUtils";
import {
  documentListPaginated,
  filterDocuments,
  listDocument,
  deleteDocument,
} from "../../services/documentService";
import { useAuth } from "../../context/ContextAPI";
import DocumentCard from "../../components/Documents/DocumentCard";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";
import { MedicalDocument } from "../../types";
import ErrorBoundary from "../../components/shared/ErrorBoundary";

const CATEGORIES = [
  { key: "All", value: "All" },
  { key: "Prescription", value: "Prescription" },
  { key: "Lab Report", value: "Lab Report" },
  { key: "Imaging Report", value: "Imaging Report" },
  { key: "Discharge Summary", value: "Discharge Summary" },
  { key: "Consultation Report", value: "Consultation Report" },
  { key: "Surgery Report", value: "Surgery Report" },
  { key: "Vaccination Report", value: "Vaccination Report" },
  { key: "Medical Certificate", value: "Medical Certificate" },
  { key: "Other Medical Document", value: "Other Medical Document" },
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
  const editSheetRef = useRef<BottomSheetModal>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);
  const { userId } = useAuth();

  const [selectedEditDoc, setSelectedEditDoc] = useState<MedicalDocument | null>(null);
  const [selectedShareDoc, setSelectedShareDoc] = useState<MedicalDocument | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("date_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomBarPadding();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIds, setDeleteIds] = useState("");

  // Focus hook to reset filters and selections when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setActiveTab("All");
      setSortOption("date_desc");
      setSearchQuery("");
      setIsFilterApplied(false);
      setSelectedDocIds([]);
    }, []),
  );

  const handleFeatureComingSoon = useCallback(() => {
    Toast.show({
      type: "info",
      text1: "Coming Soon",
      text2: "This feature will be implemented soon.",
      position: "bottom",
    });
  }, []);



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

  // Fetch paginated documents when "All" is active.
  const {
    data: allDocsData,
    isLoading: isLoadingAll,
    fetchNextPage: fetchNextPageAll,
    hasNextPage: hasNextPageAll,
    isFetchingNextPage: isFetchingNextPageAll,
  } = useInfiniteQuery({
    queryKey: ["allDocuments", userId],
    queryFn: ({ pageParam = 1 }) =>
      documentListPaginated({
        activeCategory: "All",
        page: pageParam as number,
        pageLimit: 10,
      }),
    getNextPageParam: (lastPage: any, allPages) => {
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
    getNextPageParam: (lastPage: any, allPages) => {
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
      const pages = Array.isArray(allDocsData?.pages)
        ? allDocsData.pages
        : [];
      return pages.flatMap((page) => getSafeArray(page));
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

  const handleSelectDocument = useCallback((id: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const isSelectionMode = selectedDocIds.length > 0;

  const renderItem: ListRenderItem<MedicalDocument> = useCallback(
    ({ item }) => {
      const isSelected = selectedDocIds.includes(item.id);
      return (
        <DocumentCard
          document={item}
          selected={isSelected}
          onSelect={handleSelectDocument}
          isSelectionMode={isSelectionMode}
          onEdit={(doc) => {
            setSelectedEditDoc(doc);
            editSheetRef.current?.present();
          }}
          onShare={(doc) => {
            setSelectedShareDoc(doc);
            shareSheetRef.current?.present();
          }}
        />
      );
    },
    [selectedDocIds, handleSelectDocument, isSelectionMode],
  );

  const handleBulkDownload = useCallback(() => {
    if (selectedDocIds.length === 0) return;
    Toast.show({
      type: "info",
      position: "top",
      text1: "Feature will be implemented soon.",
    });
    setSelectedDocIds([]);
  }, [selectedDocIds]);

  const handleBulkShare = useCallback(() => {
    if (selectedDocIds.length === 0) return;
    Toast.show({
      type: "info",
      position: "top",
      text1: "Feature will be implemented soon.",
    });
    setSelectedDocIds([]);
  }, [selectedDocIds]);

  const handleBulkDelete = useCallback(() => {
    if (selectedDocIds.length === 0) return;
    setDeleteIds(selectedDocIds.join(","));
    setShowDeleteModal(true);
  }, [selectedDocIds]);

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

        <View style={{ height: 1, backgroundColor: "white", marginTop: 10 }} />

        <FamilySection>
          <FamilyHeader>
            <FamilyTitle>Family Members</FamilyTitle>
            <ManageButton onPress={handleFeatureComingSoon}>
              <ManageText>Manage</ManageText>
            </ManageButton>
          </FamilyHeader>
          <FamilyScroll>
            <MemberItem activeOpacity={0.8}>
              <SelectedOuterCircle>
                <AvatarImage
                  source={{
                    uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
                  }}
                />
              </SelectedOuterCircle>
              <MemberName active>Me (You)</MemberName>
            </MemberItem>
            <MemberItem activeOpacity={0.7} onPress={handleFeatureComingSoon}>
              <AddCircle>
                <Ionicons
                  name="add"
                  size={30}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
              </AddCircle>
              <MemberName>Add</MemberName>
            </MemberItem>
          </FamilyScroll>
        </FamilySection>

        <View style={{ height: 1, backgroundColor: "white", marginTop: 10 }} />
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
          keyExtractor={(item, index) => index + item.createdAt}
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
            if (activeTab === "All") {
              if (hasNextPageAll && !isFetchingNextPageAll) {
                fetchNextPageAll();
              }
            } else {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            (activeTab === "All" && isFetchingNextPageAll) || (activeTab !== "All" && isFetchingNextPage) ? (
              <ActivityIndicator
                size="small"
                color="#8b5cf6"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
        />

        {isSelectionMode && (
          <SelectionBottomBar isDark={isDark} insets={insets}>
            <SelectionText isDark={isDark}>
              {selectedDocIds.length} selected
            </SelectionText>
            <BarActionsContainer>
              <BarActionButton onPress={handleBulkDownload}>
                <Ionicons name="download-outline" size={22} color={isDark ? "#cbd5e1" : "#1e293b"} />
                <BarActionLabel isDark={isDark}>Download</BarActionLabel>
              </BarActionButton>
              <BarActionButton onPress={handleBulkShare}>
                <Ionicons name="share-social-outline" size={22} color={isDark ? "#cbd5e1" : "#1e293b"} />
                <BarActionLabel isDark={isDark}>Share</BarActionLabel>
              </BarActionButton>
              <BarActionButton onPress={handleBulkDelete}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <BarActionLabel style={{ color: "#ef4444" }}>Delete</BarActionLabel>
              </BarActionButton>
            </BarActionsContainer>
          </SelectionBottomBar>
        )}
      </ContentContainer>

      <ConfirmationModal
        showModal={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedDocIds([]);
        }}
        mode="Delete Document"
        documentId={deleteIds}
      />

      <DocumentUploadBottomSheet ref={refRBSheet} />

      <EditDocumentBottomSheet
        ref={editSheetRef}
        document={selectedEditDoc}
        onSuccess={() => {
          setSelectedEditDoc(null);
        }}
        onClose={() => {
          editSheetRef.current?.dismiss();
          setSelectedEditDoc(null);
        }}
      />

      <ShareDocumentSheet
        ref={shareSheetRef}
        document={selectedShareDoc}
        onClose={() => {
          shareSheetRef.current?.dismiss();
          setSelectedShareDoc(null);
        }}
      />

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
  background-color: ${(props: any) => props.theme.colors.surface};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
`;

const FamilySection = styled.View`
  padding-top: 16px;
  padding-bottom: 8px;
`;

const FamilyHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: 20px;
  margin-bottom: 12px;
`;

const FamilyTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: white;
`;

const ManageButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ManageText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: white;
`;

const FamilyScroll = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
})`
  flex-direction: row;
`;

const MemberItem = styled.TouchableOpacity`
  align-items: center;
  margin-right: 18px;
`;

const SelectedOuterCircle = styled.View`
  width: 66px;
  height: 66px;
  borderRadius: 33px;
  borderWidth: 2px;
  borderColor: #10b981;
  justify-content: center;
  align-items: center;
`;

const AvatarImage = styled.Image`
  width: 56px;
  height: 56px;
  borderRadius: 28px;
`;

const AddCircle = styled.View`
  width: 66px;
  height: 66px;
  borderRadius: 33px;
  borderWidth: 1px;
  borderColor: white;
  backgroundColor: white;
  justify-content: center;
  align-items: center;
`;

const MemberName = styled.Text<{ active?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
  color: white;
`;

const ModalContainer = styled.View<{ bottomPadding: number }>`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.45);
  justify-content: flex-end;
  align-items: center;
  padding-bottom: ${(props: any) => props.bottomPadding + 20}px;
`;

const SelectionBottomBar = styled.View<{ isDark: boolean; insets: any }>`
  position: absolute;
  bottom: ${(props: { isDark: boolean; insets: any }) => Math.max(16, props.insets.bottom + 12)}px;
  left: 20px;
  right: 20px;
  background-color: ${(props: { isDark: boolean; insets: any }) => props.isDark ? "#1e293b" : "#ffffff"};
  border-radius: 20px;
  padding-vertical: 14px;
  padding-horizontal: 20px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-color: ${(props: { isDark: boolean; insets: any }) => props.isDark ? "#334155" : "#e2e8f0"};
  
  elevation: 8;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 12px;
`;

const SelectionText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: { isDark: boolean }) => props.isDark ? "#f8fafc" : "#1e293b"};
`;

const BarActionsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 20px;
`;

const BarActionButton = styled.TouchableOpacity`
  align-items: center;
  justify-content: center;
`;

const BarActionLabel = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${(props: { isDark: boolean }) => props.isDark ? "#cbd5e1" : "#475569"};
  margin-top: 4px;
`;
