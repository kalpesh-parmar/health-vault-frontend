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
  listMedications,
  filterMedications,
  refillMedicationService,
} from "../../../../services/medicationservice";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";
import { AddOrEditMedication } from "../../../../types";
import Toast from "react-native-toast-message";
import { EmptyMedications } from "../../../../components/shared/DefensiveStates";
import FilterTabs from "../../../../components/shared/FilterTabs";
import { MedicationStackParamList } from "../../../../types/navigation";
import SearchBar from "../../../../components/shared/SearchBar";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import FilterBottomSheet, { FilterOptionItem } from "../../../../components/shared/FilterBottomSheet";
import RefillBottomSheet from "./RefillBottomSheet";

const MED_CATEGORIES = [
  "All",
  "Tablet",
  "Capsule",
  "Syrup",
  "Drop",
  "Injection",
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

const MedicationScreen = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [sortOption, setSortOption] = useState("date_desc");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const refillSheetRef = useRef<BottomSheetModal>(null);
  const [selectedMedicationForRefill, setSelectedMedicationForRefill] = useState<AddOrEditMedication | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isTipDismissed, setIsTipDismissed] = useState(false);

  // Reset filteration and selection states when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      setActiveTab("All");
      setSortOption("date_desc");
      setSearchQuery("");
      setIsFilterApplied(false);
      setIsSelectionMode(false);
      setSelectedMedicationIds([]);
    }, []),
  );

  const navigation =
    useNavigation<NativeStackNavigationProp<MedicationStackParamList>>();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();

  const { mutateAsync: refillMedication } = useMutation({
    mutationFn: refillMedicationService,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["medications"] }),
        queryClient.invalidateQueries({ queryKey: ["allMedications"] }),
        queryClient.invalidateQueries({ queryKey: ["filteredMedications"] }),
        queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] }),
        queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] }),
        queryClient.invalidateQueries({ queryKey: ["todayReminders"] }),
        queryClient.invalidateQueries({ queryKey: ["allReminders"] }),
        queryClient.invalidateQueries({ queryKey: ["notificationCount"] }),
        queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] }),
        queryClient.invalidateQueries({ queryKey: ["todayOccurrencesCount"] })
      ]);
      Toast.show({
        type: "success",
        text1: "Refilled",
        text2: "Medication quantity updated.",
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to refill medication.",
      });
    },
  });

  const handleRefillSubmit = async (amount: number) => {
    if (selectedMedicationForRefill?.id) {
      await refillMedication({
        medicationId: selectedMedicationForRefill.id,
        quantity: amount,
      });
      refillSheetRef.current?.dismiss();
    }
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
            search: searchQuery.trim().length > 0 ? searchQuery : (activeTab === "All" ? "" : activeTab),
          },
          sort: {
            sortBy,
            sortOrder,
          },
        });
      },
      enabled: isFilterApplied || searchQuery.trim().length > 0,
    });

  // Fetch all medications for category counts and when "All" is active (standard useQuery)
  const { data: allMedsData, isLoading: isLoadingAll } = useQuery({
    queryKey: ["allMedications", "medications"],
    queryFn: listMedications,
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
    getNextPageParam: (lastPage: any, allPages) => {
      const data = lastPage?.data
        ? (Array.isArray(lastPage.data)
            ? lastPage.data
            : (Array.isArray(lastPage.data.items)
                ? lastPage.data.items
                : (Array.isArray(lastPage.data.rows) ? lastPage.data.rows : [])))
        : [];
      return data.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab !== "All" && !isFilterApplied,
  });

  const isLoading = (isFilterApplied || searchQuery.trim().length > 0)
    ? isLoadingFiltered
    : activeTab === "All"
      ? isLoadingAll
      : isLoadingInfinite;

  const categoryCounts = useMemo(() => {
    let allList: AddOrEditMedication[] = [];
    if (allMedsData) {
      if (Array.isArray((allMedsData as any).data)) {
        allList = (allMedsData as any).data;
      } else if ((allMedsData as any).data && Array.isArray((allMedsData as any).data.data)) {
        allList = (allMedsData as any).data.data;
      } else if ((allMedsData as any).data && Array.isArray((allMedsData as any).data.items)) {
        allList = (allMedsData as any).data.items;
      } else if ((allMedsData as any).data && Array.isArray((allMedsData as any).data.rows)) {
        allList = (allMedsData as any).data.rows;
      } else if (Array.isArray(allMedsData)) {
        allList = allMedsData;
      }
    }

    const counts: Record<string, number> = {
      All: allList.length,
    };

    MED_CATEGORIES.forEach((cat) => {
      if (cat === "All") return;
      const catUpper = cat.toUpperCase();
      const count = allList.filter((m) => {
        const type = String(m.medicationType || "").toUpperCase().trim();
        return (
          type === catUpper ||
          type.startsWith(catUpper) ||
          (catUpper.endsWith("S") && type === catUpper.slice(0, -1)) ||
          (type.endsWith("S") && type.slice(0, -1) === catUpper)
        );
      }).length;
      counts[cat] = count;
    });

    return counts;
  }, [allMedsData]);

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

      // Structure for Normal/Infinite API: response.data (Array or paginated object)
      if (!isFiltered) {
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.data)) return response.data.data;
        if (response.data && Array.isArray(response.data.items)) return response.data.items;
        if (Array.isArray(response)) return response;
      }

      return [];
    };

    // 1. Prioritize Filter API response
    if (isFilterApplied || searchQuery.trim().length > 0) {
      return extractRows(filteredMedicationData, true);
    }

    // 2. Standard "All" Tab normal API
    if (activeTab === "All") {
      return extractRows(allMedsData, false);
    }

    // 3. Paginated Specific Tab API (Flatten pages)
    const pages = Array.isArray(medicationList?.pages) ? medicationList.pages : [];
    return pages.flatMap((page) => extractRows(page, false));
  }, [
    filteredMedicationData,
    allMedsData,
    medicationList,
    activeTab,
    isFilterApplied,
    searchQuery,
  ]);

  const allVisibleIds = useMemo(() => {
    return medicationData
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
  }, [medicationData]);

  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedMedicationIds.includes(id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedMedicationIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedMedicationIds(allVisibleIds);
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMedicationIds([]);
  };

  const toggleMedicationSelection = (id?: string) => {
    if (!id) return;
    setSelectedMedicationIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      if (next.length === 0) {
        setIsSelectionMode(false);
      } else if (!isSelectionMode) {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  const handleCardLongPress = (id?: string) => {
    if (!id) return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedMedicationIds([id]);
    } else {
      toggleMedicationSelection(id);
    }
  };

  const handleCardPress = (item: AddOrEditMedication) => {
    if (isSelectionMode && item.id) {
      toggleMedicationSelection(item.id);
    }
  };

  const renderMedicationCard = ({ item }: { item: AddOrEditMedication }) => {
    const isSelected = !!item.id && selectedMedicationIds.includes(item.id);

    return (
      <CardPressable
        activeOpacity={0.8}
        onLongPress={() => handleCardLongPress(item.id)}
        onPress={() => handleCardPress(item)}
        isSelected={isSelected && isSelectionMode}
      >
        <CardTopRow>
          {isSelectionMode && (
            <CheckboxTouchable
              onPress={() => toggleMedicationSelection(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={24}
                color={isSelected ? "#4f46e5" : "#94a3b8"}
              />
            </CheckboxTouchable>
          )}
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
              {(() => {
                const schedule = item.medicationSchedule || {};
                let timesList: string[] = [];
                if (Array.isArray(schedule)) {
                  timesList = schedule;
                } else if (Array.isArray(schedule.times)) {
                  timesList = schedule.times;
                } else if (Array.isArray(schedule.reminderTimes)) {
                  timesList = schedule.reminderTimes;
                } else {
                  Object.values(schedule).forEach((val: any) => {
                    if (Array.isArray(val)) {
                      timesList.push(...val);
                    } else if (typeof val === "string" && val.includes(":")) {
                      timesList.push(val);
                    }
                  });
                  if (timesList.length === 0) {
                    timesList = Object.keys(schedule).filter(key => typeof key === "string" && key.includes(":"));
                  }
                }
                
                const parseTime = (t: any) => {
                  if (typeof t !== "string" || !t.includes(":")) return { h: 8, m: 0 };
                  const [h, m] = t.split(":");
                  return { h: parseInt(h, 10) || 0, m: parseInt(m, 10) || 0 };
                };

                return (timesList || []).filter(Boolean).map((timeStr, index) => {
                  const { h, m } = parseTime(timeStr);
                  const ampm = h >= 12 ? "PM" : "AM";
                  const displayHour = h % 12 || 12;
                  const hourFormatted = displayHour < 10 ? `0${displayHour}` : displayHour;
                  const minuteFormatted = m < 10 ? `0${m}` : m;
                  return (
                    <TimeText key={index}>
                      {`${hourFormatted}:${minuteFormatted} ${ampm}`}{" "}
                    </TimeText>
                  );
                });
              })()}
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
            <DateText>{item.startDate?.split("T")[0]}</DateText>
          </DateWrapper>

          {!isSelectionMode && (
            <ActionButtons>
              <IconButton
                onPress={() =>
                  navigation.navigate("MedicationOperation", {
                    operation: "edit",
                    medication: item,
                  })
                }
              >
                <ActionText>Edit</ActionText>
              </IconButton>
              <IconButton
                style={{ marginLeft: 10 }}
                onPress={() => {
                  setSelectedMedicationForRefill(item);
                  refillSheetRef.current?.present();
                }}
              >
                <Ionicons name="refresh" size={20} color={"#10b981"} />
                <ActionText style={{ color: "#10b981" }}>Refill</ActionText>
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
          )}
        </CardBottomRow>
      </CardPressable>
    );
  };

  return (
    <Container>
      <StatusBar style="light" />

      <ConfirmationModal
        showModal={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        mode="Delete Medication"
        documentId={documentId}
      />

      <ConfirmationModal
        showModal={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        mode="Delete Medications Batch"
        documentIds={selectedMedicationIds}
        onSuccess={() => {
          setIsSelectionMode(false);
          setSelectedMedicationIds([]);
        }}
      />

      <HeaderGradient
        colors={
          isDark
            ? ["#1e1b4b", "#312e81", "#020617"]
            : ["#4f46e5", "#3730a3", "#1e1b4b"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {isSelectionMode ? (
          <TopRow>
            <BackButton onPress={handleCancelSelection}>
              <Ionicons name="close" size={28} color="#fff" />
            </BackButton>
            <HeaderTitle>
              {selectedMedicationIds.length > 0
                ? `${selectedMedicationIds.length} Selected`
                : "Select Medications"}
            </HeaderTitle>
            <RightActions>
              <SelectAllButton onPress={handleSelectAllToggle} activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name={
                    isAllSelected
                      ? "checkbox-marked-outline"
                      : "checkbox-blank-outline"
                  }
                  size={18}
                  color="#fff"
                />
                <SelectAllText>
                  {isAllSelected ? "Deselect All" : "Select All"}
                </SelectAllText>
              </SelectAllButton>
            </RightActions>
          </TopRow>
        ) : (
          <TopRow>
            <BackButton onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </BackButton>
            <HeaderTitle>Medications</HeaderTitle>
            <RightActions>
              {medicationData.length > 1 && (
                <HeaderIconButton
                  onPress={() => {
                    if (medicationData.length > 0 && medicationData[0]?.id) {
                      setIsSelectionMode(true);
                      setSelectedMedicationIds([medicationData[0].id]);
                    }
                  }}
                  accessibilityLabel="Select Multiple Medications"
                >
                  <MaterialCommunityIcons
                    name="checkbox-multiple-marked-outline"
                    size={20}
                    color="#fff"
                  />
                </HeaderIconButton>
              )}
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
        )}

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
        counts={categoryCounts}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsFilterApplied(false);
        }}
        isDark={isDark}
      />

      {!isSelectionMode && medicationData.length > 1 && !isTipDismissed && (
        <HintBanner>
          <HintLeft>
            <Ionicons name="information-circle" size={16} color="#6366f1" />
            <HintText>Tip: Long press any medication to select multiple</HintText>
          </HintLeft>
          <HintCloseButton
            onPress={() => setIsTipDismissed(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color="#94a3b8" />
          </HintCloseButton>
        </HintBanner>
      )}

      <ContentList
        data={medicationData}
        keyExtractor={(item: AddOrEditMedication) =>
          item.id || item.medicationName
        }
        renderItem={renderMedicationCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
          ) : (
            <EmptyMedications message={`No ${activeTab.toLowerCase() === 'all' ? 'medications' : activeTab.toLowerCase()} found.`} />
          )
        }
        contentContainerStyle={{
          paddingBottom:
            isSelectionMode && selectedMedicationIds.length > 0 ? 100 : 40,
        }}
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

      {isSelectionMode && selectedMedicationIds.length > 0 && (
        <SelectionBottomBar>
          <SelectionInfoText>
            {selectedMedicationIds.length}{" "}
            {selectedMedicationIds.length === 1
              ? "medication"
              : "medications"}{" "}
            selected
          </SelectionInfoText>
          <DeleteBatchButton
            onPress={() => setShowBatchDeleteModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <DeleteBatchButtonText>
              Delete ({selectedMedicationIds.length})
            </DeleteBatchButtonText>
          </DeleteBatchButton>
        </SelectionBottomBar>
      )}

      <FilterBottomSheet
        ref={filterSheetRef}
        title="Sort Medications"
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

      <RefillBottomSheet
        ref={refillSheetRef}
        medication={selectedMedicationForRefill}
        onCancel={() => refillSheetRef.current?.dismiss()}
        onRefill={handleRefillSubmit}
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

const CardPressable = styled.TouchableOpacity<{ isSelected?: boolean }>`
  background-color: ${({ isSelected }: { isSelected?: boolean }) =>
    isSelected ? "#f5f3ff" : "white"};
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  elevation: 4;
  border-width: 2px;
  border-color: ${({ isSelected }: { isSelected?: boolean }) =>
    isSelected ? "#6366f1" : "transparent"};
`;

const CheckboxTouchable = styled.TouchableOpacity`
  margin-right: 12px;
  justify-content: center;
  align-items: center;
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

const TimeText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
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
  padding: 8px 8px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const ActionText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-left: 6px;
`;

const SelectionBottomBar = styled.View`
  position: absolute;
  bottom: 24px;
  left: 20px;
  right: 20px;
  background-color: #1e1b4b;
  border-radius: 16px;
  padding: 14px 20px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  elevation: 8;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
`;

const SelectionInfoText = styled.Text`
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

const DeleteBatchButton = styled.TouchableOpacity`
  background-color: #ef4444;
  padding: 10px 16px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const DeleteBatchButtonText = styled.Text`
  color: #fff;
  font-size: 14px;
  font-weight: 700;
`;

const SelectAllButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 20px;
`;

const SelectAllText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  margin-left: 6px;
`;

const HintBanner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  margin-horizontal: 16px;
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 8px 12px;
`;

const HintLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const HintText = styled.Text`
  font-size: 12px;
  font-weight: 500;
  color: #4338ca;
  margin-left: 6px;
  flex: 1;
`;

const HintCloseButton = styled.TouchableOpacity`
  padding: 2px;
  margin-left: 8px;
`;


