import React, { useState, useMemo, useRef, useCallback } from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../../../context/ThemeContext";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMedicationsPaginated,
  updateMedication,
  listMedications,
  filterMedications,
} from "../../../../services/medicationservice";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";
import { AddOrEditMedication } from "../../../../types";
import { TimeText } from "../../../../components/MedicationForm";
import Toast from "react-native-toast-message";
import FilterTabs from "../../../../components/shared/FilterTabs";
import { MedicationStackParamList } from "../../../../types/navigation";
import SearchBar from "../../../../components/shared/SearchBar";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import FilterBottomSheet from "../../../../components/shared/FilterBottomSheet";

const MED_CATEGORIES = [
  "All",
  "Tablet",
  "Capsule",
  "Syrup",
  "Drop",
  "Injection",
];

const MedicationScreen = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [sortOption, setSortOption] = useState("date_desc");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const filterSheetRef = useRef<BottomSheetModal>(null);

  // Reset filteration states when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      setActiveTab("All");
      setSortOption("date_desc");
      setSearchQuery("");
      setIsFilterApplied(false);
    }, []),
  );

  const navigation =
    useNavigation<NativeStackNavigationProp<MedicationStackParamList>>();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();

  const { mutateAsync: toggleMedicationStatus } = useMutation({
    mutationFn: updateMedication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["allMedications"] });
      queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
      Toast.show({
        type: "success",
        text1: "Status Updated",
        text2: "Medication marked as completed.",
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update medication status.",
      });
    },
  });

  const handleToggleStatus = async (item: AddOrEditMedication) => {
    if (!item.id) return;
    await toggleMedicationStatus({
      medicationId: item.id,
      data: {
        medicationName: item?.medicationName,
        medicationType: item?.medicationType,
        prescribedBy: item?.prescribedBy,
        dosePerIntake: item?.dosePerIntake,
        frequency: item?.frequency,
        medicationTime: item?.medicationTime,
        bestTaken: item?.bestTaken,
        foodFrequency: item?.foodFrequency,
        startDate: item?.startDate,
        ongoing: !item?.ongoing,
        totalQuantity: item?.totalQuantity,
        doseReminders: item?.doseReminders,
        unit: item?.unit,
        reminderBeforeMinutes: item?.reminderBeforeMinutes,
        refillAlert: item?.refillAlert,
        notes: item?.notes,
      },
    });
  };

  // Fetch filtered medications when a filter/sort option is applied from FilterBottomSheet
  const { data: filteredMedicationData, isLoading: isLoadingFiltered } =
    useQuery({
      queryKey: ["filteredMedications", activeTab, sortOption, searchQuery],
      queryFn: () => {
        let sortBy = "startDate";
        let sortOrder: "asc" | "desc" = "desc";

        if (sortOption === "date_desc") {
          sortBy = "startDate";
          sortOrder = "desc";
        } else if (sortOption === "date_asc") {
          sortBy = "startDate";
          sortOrder = "asc";
        } else if (sortOption === "name_asc") {
          sortBy = "medicationName";
          sortOrder = "asc";
        } else if (sortOption === "name_desc") {
          sortBy = "medicationName";
          sortOrder = "desc";
        }

        return filterMedications({
          filter: {
            search: activeTab === "All" ? "" : activeTab,
          },
          sort: {
            sortBy,
            sortOrder,
          },
        });
      },
      enabled: isFilterApplied,
    });

  // Fetch all medications when "All" is active (standard useQuery)
  const { data: allMedsData, isLoading: isLoadingAll } = useQuery({
    queryKey: ["allMedications", "medications"],
    queryFn: listMedications,
    enabled: activeTab === "All" && !isFilterApplied,
  });

  // Fetch paginated medications when a specific tab is active (useInfiniteQuery)
  const {
    data: medicationList,
    isLoading: isLoadingInfinite,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["medications", activeTab],
    queryFn: ({ pageParam = 1 }) =>
      getMedicationsPaginated({
        MedicationType: activeTab,
        pageNumber: pageParam as number,
        pageLimit: 10,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.data.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab !== "All" && !isFilterApplied,
  });

  const isLoading = isFilterApplied
    ? isLoadingFiltered
    : activeTab === "All"
      ? isLoadingAll
      : isLoadingInfinite;


  const medicationData = useMemo(() => {
    // Helper function to handle different response structures safely
    const extractRows = (
      response: any,
      isFiltered: boolean,
    ): AddOrEditMedication[] => {
      if (!response) return [];

      // Structure for Filter API: response.data.rows
      if (isFiltered && response.data && Array.isArray(response.data.rows)) {
        return response.data.rows;
      }

      // Structure for Normal/Infinite API: response.data (Array)
      if (!isFiltered && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    };

    // 1. Prioritize Filter API response
    if (isFilterApplied) {
      return extractRows(filteredMedicationData, true);
    }

    // 2. Standard "All" Tab normal API
    if (activeTab === "All") {
      return extractRows(allMedsData, false);
    }

    // 3. Paginated Specific Tab API (Flatten pages)
    return (
      medicationList?.pages?.flatMap((page) => extractRows(page, false)) || []
    );
  }, [
    filteredMedicationData,
    allMedsData,
    medicationList,
    activeTab,
    isFilterApplied,
  ]);

  const renderMedicationCard = ({ item }: { item: AddOrEditMedication }) => (
    <Card>
      <CardTopRow>
        <MedIconBox>
          <Ionicons
            name={
              item.medicationType?.toUpperCase() === "TABLET"
                ? "medkit"
                : item.medicationType?.toUpperCase() === "CAPSULE"
                  ? "medical"
                  : item.medicationType?.toUpperCase() === "SYRUP"
                    ? "flask"
                    : item.medicationType?.toUpperCase() === "DROP"
                      ? "water"
                      : item.medicationType?.toUpperCase() === "INJECTION"
                        ? "bandage"
                        : "medkit"
            }
            size={24}
            color="#6366f1"
          />
        </MedIconBox>
        <MedInfoMain>
          <MedName>{item.medicationName}</MedName>
          <MedTime>
            {item.medicationTime?.map(
              (t: { time: string; period: string }, index: number) => (
                <TimeText key={index}>
                  {t.time} {t.period}{" "}
                </TimeText>
              ),
            )}
            <MedTypeLabel>
              {"\n"}
              {"\n"}• {item.medicationType}
            </MedTypeLabel>
          </MedTime>
        </MedInfoMain>
        <Tag context={item.foodFrequency}>
          <TagText context={item.foodFrequency}>{item.foodFrequency}</TagText>
        </Tag>
      </CardTopRow>

      <Divider />

      <CardBottomRow>
        <DateWrapper>
          <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
          <DateText>{item.startDate}</DateText>
        </DateWrapper>

        <ActionButtons>
          <IconButton
            style={{ marginRight: 10 }}
            onPress={() => handleToggleStatus(item)}
            disabled={!item.ongoing}
          >
            {item.ongoing ? (
              <Ionicons
                name={
                  item.ongoing
                    ? "checkmark-done-outline"
                    : "checkmark-done-circle"
                }
                size={18}
                color={item.ongoing ? "#10b981" : "#f59e0b"}
              />
            ) : (
              <Tag>
                <TagText>COMPLETED</TagText>
              </Tag>
            )}
          </IconButton>
          <IconButton
            onPress={() =>
              navigation.navigate("MedicationOperation", {
                operation: "edit",
                medication: item,
              })
            }
          >
            <Ionicons name="create-outline" size={18} color="#64748b" />
          </IconButton>
          <IconButton
            style={{ marginLeft: 10 }}
            onPress={() => {
              setDocumentId(item.id || "");
              setShowDeleteModal(true);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </IconButton>
        </ActionButtons>
      </CardBottomRow>
    </Card>
  );

  return (
    <Container>
      <StatusBar style="light" />

      <ConfirmationModal
        showModal={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        mode="Delete Medication"
        documentId={documentId}
      />

      <HeaderGradient
        colors={
          isDark
            ? ["#064e3b", "#0369a1", "#312e81"]
            : ["#0f766e", "#0ea5e9", "#4f46e5"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </BackButton>
          <HeaderTitle>Medications</HeaderTitle>
          <RightActions>
            <HeaderIconButton onPress={() => filterSheetRef.current?.present()}>
              <MaterialCommunityIcons name="filter" size={20} color="#fff" />
            </HeaderIconButton>
            <AddButton
              onPress={() =>
                navigation.navigate("MedicationOperation", {
                  operation: "add",
                })
              }
            >
              <Ionicons name="add" size={26} color="#fff" />
            </AddButton>
          </RightActions>
        </TopRow>

        <SearchBarWrapper>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search medications..."
          />
        </SearchBarWrapper>
      </HeaderGradient>

      <FilterTabs
        data={MED_CATEGORIES}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsFilterApplied(false);
        }}
        isDark={isDark}
      />

      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#6366f1" />
          <LoadingText>Fetching Medications...</LoadingText>
        </LoadingContainer>
      ) : (
        <ContentList
          data={medicationData}
          keyExtractor={(item: AddOrEditMedication) =>
            item.id || item.medicationName
          }
          renderItem={renderMedicationCard}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyText>
              No {activeTab.toLowerCase()} medications found.
            </EmptyText>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          onEndReached={() => {
            if (
              !isFilterApplied &&
              activeTab !== "All" &&
              hasNextPage &&
              !isFetchingNextPage
            ) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color="#6366f1"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
        />
      )}

      <FilterBottomSheet
        ref={filterSheetRef}
        selectedSort={sortOption}
        onSelectSort={(option) => {
          setSortOption(option);
        }}
        onApply={() => {
          setIsFilterApplied(true);
          filterSheetRef.current?.dismiss();
        }}
      />
    </Container>
  );
};

export default MedicationScreen;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 20px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
`;

const SearchBarWrapper = styled.View`
  margin-top: 15px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const BackButton = styled.TouchableOpacity``;

const AddButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
`;

const RightActions = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: 700;
  flex-grow: 1;
  margin-left: 10px;
`;

const ContentList = styled(FlatList as new () => FlatList<AddOrEditMedication>)`
  flex: 1;
  padding-horizontal: 16px;
`;

const Card = styled.View`
  background-color: white;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  elevation: 4;
`;

const CardTopRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MedIconBox = styled.View`
  background-color: #f5f3ff;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
`;

const MedInfoMain = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const MedName = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`;

const MedTime = styled.Text`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-top: 2px;
`;

const MedTypeLabel = styled.Text`
  color: #6366f1;
  font-weight: 600;
  font-style: italic;
`;

const Tag = styled.View<{ context: string }>`
  background-color: ${({ context }: { context: string }) =>
    context === "Before Meal" ? "#fff7ed" : "#f0fdf4"};
  padding: 4px 10px;
  border-radius: 8px;
`;

const TagText = styled.Text<{ context: string }>`
  font-size: 9px;
  font-weight: 800;
  color: ${({ context }: { context: string }) =>
    context === "Before Meal" ? "#9a3412" : "#166534"};
`;

const Divider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
  margin-vertical: 14px;
`;

const CardBottomRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const DateWrapper = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DateText = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-left: 6px;
  font-weight: 500;
`;

const ActionButtons = styled.View`
  flex-direction: row;
`;

const HeaderIconButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const IconButton = styled.TouchableOpacity`
  background-color: #f8fafc;
  padding: 8px;
  border-radius: 10px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text`
  margin-top: 12px;
  color: #64748b;
  font-weight: 500;
`;

const EmptyText = styled.Text`
  text-align: center;
  color: #94a3b8;
  margin-top: 60px;
  font-size: 15px;
`;
