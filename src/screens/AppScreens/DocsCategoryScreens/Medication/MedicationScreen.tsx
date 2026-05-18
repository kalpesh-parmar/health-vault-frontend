import React, { useState, useMemo } from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../../../navigation/types";
import { useAppTheme } from "../../../../context/ThemeContext";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMedicationsPaginated,
  updateMedication,
} from "../../../../services/medicationservice";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";
import { AddOrEditMedication } from "../../../../types";
import { TimeText } from "../../../../components/MedicationForm";
import Toast from "react-native-toast-message";
import FilterTabs from "../../../../components/shared/FilterTabs";

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
    description: "Recently added medications",
    value: "date_desc",
    icon: "calendar",
  },
  {
    label: "Oldest First",
    description: "Earliest added medications",
    value: "date_asc",
    icon: "calendar-outline",
  },
  {
    label: "Ongoing",
    description: "Only ongoing medications",
    value: "ongoing",
    icon: "checkmark",
  },
  {
    label: "Completed",
    description: "Only completed medications",
    value: "stopped",
    icon: "checkbox",
  },
];

// Give me 15 Mock medication according to this AddOrEditMedication mentioned below.
// export interface AddOrEditMedication {
//   id?: string;
//   medicationName: string;
//   medicationType: string;
//   prescribedBy: string;
//   dosePerIntake: number;
//   frequency: string;
//   medicationTime: {
//     time: string;
//     period: string;
//   }[];
//   bestTaken: string[];
//   foodFrequency: string;
//   startDate: string;
//   ongoing: boolean;
//   totalQuantity: number;
//   doseReminders: boolean;
//   unit: string;
//   refillAlert: boolean;
//   notes: string;
//   reminderBefore?: number;
// }
const MOCK_MEDICATION = Array.from({ length: 15 }, (_, index) => ({
  medicationName: `Medication ${index + 1}`,
  medicationType: index % 2 === 0 ? "Tablet" : "Capsule",
  prescribedBy: "Dr. Smith",
  dosePerIntake: 1,
  frequency: "Twice daily",
  medicationTime: [
    { time: "09:00", period: "AM" },
    { time: "09:00", period: "PM" },
  ],
  bestTaken: ["With food"],
  foodFrequency: "After meals",
  startDate: "2022-01-01",
  ongoing: true,
  totalQuantity: 30,
  doseReminders: true,
  unit: "tablet",
  refillAlert: true,
  notes: "Take as directed",
  reminderBeforeMinutes: 10,
}));

const MedicationScreen = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [sortOption, setSortOption] = useState("date_desc");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();

  const { mutateAsync: toggleMedicationStatus } = useMutation({
    mutationFn: updateMedication,
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      Toast.show({
        type: "success",
        text1: "Status Updated",
        text2: variables.data.ongoing
          ? "Medication marked as ongoing."
          : "Medication marked as completed.",
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
        ...item,
        ongoing: !item.ongoing,
      },
    });
  };

  const {
    data: medicationList,
    isLoading,
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
  });

  const medicationData = useMemo(() => {
    const flattened =
      medicationList?.pages.flatMap((page) => page.data) || MOCK_MEDICATION;

    return flattened
      .filter((item: AddOrEditMedication) => {
        if (
          activeTab !== "All" &&
          item.medicationType?.toUpperCase() !== activeTab.toUpperCase()
        )
          return false;
        if (sortOption === "ongoing" && item.ongoing === false) return false;
        if (sortOption === "stopped" && item.ongoing === true) return false;
        return true;
      })
      .sort((a: AddOrEditMedication, b: AddOrEditMedication) => {
        switch (sortOption) {
          case "name_asc":
            return (a.medicationName || "").localeCompare(
              b.medicationName || "",
            );
          case "name_desc":
            return (b.medicationName || "").localeCompare(
              a.medicationName || "",
            );
          case "date_asc":
            return (
              new Date(a.startDate || 0).getTime() -
              new Date(b.startDate || 0).getTime()
            );
          case "date_desc":
            return (
              new Date(b.startDate || 0).getTime() -
              new Date(a.startDate || 0).getTime()
            );
          default:
            return 0;
        }
      });
  }, [medicationList, activeTab, sortOption]);

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
              } as never)
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
            <HeaderIconButton onPress={() => setShowDropdown(!showDropdown)}>
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
      </HeaderGradient>

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
                  <Ionicons
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

      <FilterTabs
        data={MED_CATEGORIES}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
            if (hasNextPage && !isFetchingNextPage) {
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
    </Container>
  );
};

export default MedicationScreen;

/** * Styled Components */

const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 30px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
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
