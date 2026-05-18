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
  const cameraRef = useRef<any>(null);
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<Category>("All");
  const [sortOption, setSortOption] = useState("date_desc");
  const [showDropdown, setShowDropdown] = useState(false);
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
            <IconButton onPress={() => setShowDropdown(!showDropdown)}>
              <MaterialCommunityIcons name="filter" size={20} color="white" />
            </IconButton>
            <RightButton onPress={() => refRBSheet.current?.present()}>
              <Ionicons name="add" size={30} color="black" />
            </RightButton>
          </RightActions>
        </HeaderMain>

        <SearchBarWrapper>
          <SearchContainer>
            <SearchIcon>
              <Ionicons name="search-outline" size={18} color="#cbd5e1" />
            </SearchIcon>
            <SearchInput
              placeholder="Search documents..."
              placeholderTextColor="#cbd5e1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <ClearButton onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#cbd5e1" />
              </ClearButton>
            )}
          </SearchContainer>
        </SearchBarWrapper>
      </HeaderWrapper>

      {showDropdown && (
        <>
          <DropdownOverlay
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          />
          <DropdownContainer isDark={isDark}>
            {SORT_OPTIONS.map((option) => {
              const isActive = sortOption === option.value;
              return (
                <DropdownItem
                  key={option.value}
                  active={isActive}
                  isDark={isDark}
                  onPress={() => {
                    setSortOption(option.value);
                    setShowDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={option.icon as any}
                    size={18}
                    color={
                      isActive
                        ? isDark
                          ? "#818cf8"
                          : "#2563eb"
                        : isDark
                          ? "#94a3b8"
                          : "#64748b"
                    }
                  />
                  <DropdownText active={isActive} isDark={isDark}>
                    {option.label}
                  </DropdownText>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={isDark ? "#818cf8" : "#2563eb"}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </DropdownItem>
              );
            })}
          </DropdownContainer>
        </>
      )}

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
  padding-bottom: 12px;
`;

const SearchBarWrapper = styled.View`
  padding-horizontal: 20px;
  margin-top: 10px;
`;

const SearchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding-horizontal: 12px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.18);
  height: 44px;
`;

const SearchIcon = styled.View`
  margin-right: 4px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  height: 100%;
  padding-horizontal: 4px;
`;

const ClearButton = styled.TouchableOpacity`
  padding: 4px;
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

const DropdownOverlay = styled.TouchableOpacity`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
`;

const DropdownContainer = styled.View<{ isDark: boolean }>`
  position: absolute;
  top: 110px;
  right: 20px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "white"};
  border-radius: 12px;
  padding: 8px;
  z-index: 100;
  elevation: 10;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 8px;
  width: 230px;
`;

const DropdownItem = styled.TouchableOpacity<{
  active: boolean;
  isDark: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: ${({
    active,
    isDark,
  }: {
    active: boolean;
    isDark: boolean;
  }) =>
    active ? (isDark ? "rgba(79, 70, 229, 0.2)" : "#eff6ff") : "transparent"};
  margin-bottom: 2px;
`;

const DropdownText = styled.Text<{ active: boolean; isDark: boolean }>`
  font-size: 14px;
  font-weight: ${({ active }: { active: boolean }) => (active ? "700" : "500")};
  color: ${({ active, isDark }: { active: boolean; isDark: boolean }) =>
    active ? (isDark ? "#818cf8" : "#2563eb") : isDark ? "#cbd5e1" : "#475569"};
  margin-left: 10px;
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: white;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
`;
