import React, { useState, useMemo, useRef } from "react";
import { FlatList, LayoutAnimation, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { queryClient } from "../../../config/queryClient";
import { AppStackParamList } from "../../../navigation/types";
import { useAppTheme } from "../../../context/ThemeContext";
import DatePicker from "react-native-date-picker";
import { format } from "date-fns";
import { Reminder, ListRemindersRequest } from "../../../types";
import ReminderCard from "../../../components/shared/ReminderCard";
import FilterBottomSheet, {
  FilterGridItem,
} from "../../../components/shared/FilterBottomSheet";
import {
  listSubReminders,
  updateReminderOccurrenceStatus,
  filterAndSortReminders,
} from "../../../services/reminderService";

const MEDICATION_TYPES = [
  { label: "Tablet", value: "TABLET", icon: "pill" },
  { label: "Capsule", value: "CAPSULE", icon: "pill" },
  { label: "Syrup", value: "SYRUP", icon: "bottle-tonic-outline" },
  { label: "Drop", value: "DROP", icon: "water-outline" },
  { label: "Injection", value: "INJECTION", icon: "needle" },
];

const ReminderScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const initialFilter = "Pending";
  const [activeTab, setActiveTab] = useState<string>(
    initialFilter.toLowerCase(),
  );

  const [medTypeFilter, setMedTypeFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [datePicker, setDatePicker] = useState<{ visible: boolean; type: "start" | "end" }>({ visible: false, type: "start" });

  const { data: allRemindersData, isLoading: isLoadingCounts } = useQuery({
    queryKey: ["allRemindersCounts"],
    queryFn: listSubReminders,
  });

  const allRemindersForCounts = allRemindersData?.data || [];

  const pendingCount = allRemindersForCounts.filter(
    (r: any) => r.status?.toLowerCase() === "pending" && !r.isOverdue,
  ).length;
  const completedCount = allRemindersForCounts.filter(
    (r: any) => r.status?.toLowerCase() === "completed",
  ).length;
  const overdueCount = allRemindersForCounts.filter(
    (r: any) => r.status?.toLowerCase() === "pending" && r.isOverdue,
  ).length;

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingReminders,
  } = useInfiniteQuery({
    queryKey: ["paginatedReminders", activeTab, medTypeFilter, startDateFilter, endDateFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const payload: ListRemindersRequest = {
        filter: {
          status: activeTab.toLowerCase() === "overdue" ? "PENDING" : activeTab.toUpperCase(),
          medicationType: medTypeFilter || undefined,
          startDate: startDateFilter ? format(startDateFilter, "yyyy-MM-dd") : undefined,
          endDate: endDateFilter ? format(endDateFilter, "yyyy-MM-dd") : undefined,
          isOverdue: activeTab.toLowerCase() === "overdue" ? true : false,
        },
        sort: {
          sortBy: "actualMedicationTime",
          sortOrder: "asc",
        },
        page: {
          pageNumber: pageParam,
          pageLimit: 10,
        },
      };

      Object.keys(payload.filter).forEach((key) => {
        const k = key as keyof typeof payload.filter;
        if (payload.filter[k] === undefined) delete payload.filter[k];
      });

      return filterAndSortReminders(payload);
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      let items = [];
      if (Array.isArray(lastPage?.data)) {
        items = lastPage.data;
      } else if (Array.isArray(lastPage?.data?.data)) {
        items = lastPage.data.data;
      } else if (Array.isArray(lastPage?.data?.occurrences)) {
        items = lastPage.data.occurrences;
      }
      
      if (items.length < 10) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  const filteredReminders = useMemo(() => {
    return infiniteData?.pages.flatMap((page: any) => {
      if (Array.isArray(page?.data)) return page.data;
      if (Array.isArray(page?.data?.data)) return page.data.data;
      if (Array.isArray(page?.data?.occurrences)) return page.data.occurrences;
      return [];
    }) || [];
  }, [infiniteData]);

  const updateStatusMutation = useMutation({
    mutationFn: updateReminderOccurrenceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
    },
  });

  const summaryCards = [
    {
      id: "pending",
      title: "Pending",
      count: pendingCount,
      subtitle: "Upcoming reminders",
      icon: "time-outline",
      color: "#f97316",
      bgLight: "#fff8f1",
      bgDark: "#2c1c0e",
    },
    {
      id: "completed",
      title: "Completed",
      count: completedCount,
      subtitle: "Tasks completed",
      icon: "checkmark-circle-outline",
      color: "#10b981",
      bgLight: "#f0fdf4",
      bgDark: "#0f291e",
    },
    {
      id: "overdue",
      title: "Overdue",
      count: overdueCount,
      subtitle: "Requires attention",
      icon: "alarm-outline",
      color: "#ef4444",
      bgLight: "#fef2f2",
      bgDark: "#2d1618",
    },
  ];

  const filterSheetRef = useRef<BottomSheetModal>(null);

  const handleToggleStatus = async (item: Reminder) => {
    if (item.status === "COMPLETED") return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await updateStatusMutation.mutateAsync({
      occurrenceId: item.id!,
      status: "COMPLETED"
    });
  };

  const renderReminderCard = ({ item, index }: { item: Reminder, index: number }) => (
    <ReminderCard
      item={item}
      index={index}
      isDark={isDark}
      onActionPress={() => handleToggleStatus(item)}
    />
  );

  const handleTabPress = (id: string) => {
    if (activeTab !== id) {
      setActiveTab(id);
    }
  };

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />
      
      <HeaderGradient
        colors={
          isDark
            ? ["#1e1b4b", "#312e81", "#020617"]
            : ["#4f46e5", "#3730a3", "#1e1b4b"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <HeaderTop>
          <HeaderLeft>
            <BackButton onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back-outline" size={30} color="#fff" />
            </BackButton>
            <Header>
              <HeaderTitle>Reminders</HeaderTitle>
              <HeaderSubtitle>
                Stay on track with your daily reminders
              </HeaderSubtitle>
            </Header>
          </HeaderLeft>
        </HeaderTop>
      </HeaderGradient>

      <SummaryCardsRow
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {summaryCards.map((card) => {
          const isActive = activeTab === card.id;
          const bgColor = isDark ? card.bgDark : card.bgLight;
          return (
            <SummaryCardContainer
              key={card.id}
              bgColor={bgColor}
              isActive={isActive}
              onPress={() => handleTabPress(card.id)}
              activeOpacity={0.8}
            >
              <SummaryCardTop>
                <SummaryIconCircle bgColor={isDark ? "#00000040" : "#ffffff80"}>
                  <Ionicons
                    name={card.icon as any}
                    size={22}
                    color={card.color}
                  />
                </SummaryIconCircle>
                <SummaryCountCol>
                  <SummaryCardTitle color={card.color} numberOfLines={1}>
                    {card.title}
                  </SummaryCardTitle>
                  <SummaryCardCount color={card.color} numberOfLines={1}>
                    {card.count < 10 ? `0${card.count}` : card.count}
                  </SummaryCardCount>
                </SummaryCountCol>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#94a3b8"
                  style={{ alignSelf: "center", marginLeft: 8 }}
                />
              </SummaryCardTop>
              <SummaryCardSubtitle numberOfLines={1}>
                {card.subtitle}
              </SummaryCardSubtitle>
            </SummaryCardContainer>
          );
        })}
      </SummaryCardsRow>

      <SectionHeader>
        <SectionTitle isDark={isDark}>
          {`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Reminders`}
        </SectionTitle>
        <SectionControls>
          <SortButton
            onPress={() => filterSheetRef.current?.present()}
            isDark={isDark}
          >
            <SortButtonText isDark={isDark}>Filter</SortButtonText>
            <Ionicons
              name="chevron-down"
              size={14}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </SortButton>
        </SectionControls>
      </SectionHeader>

      <FlatList
        data={filteredReminders}
        keyExtractor={(item, index) => `${activeTab}-${item.id || index.toString()}`}
        renderItem={renderReminderCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              size="small"
              color="#6366f1"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
        ListEmptyComponent={
          (isLoadingCounts || isLoadingReminders) ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
          ) : (
          <EmptyContainer>
            <EmptyImageWrapper>
              <Ionicons
                name="calendar-clear-outline"
                size={60}
                color={isDark ? "#334155" : "#e2e8f0"}
              />
            </EmptyImageWrapper>
            <EmptyTitle isDark={isDark}>No Reminders Found</EmptyTitle>
            <EmptyDesc isDark={isDark}>
              {`No pending ${activeTab !== "all" ? activeTab : ""} reminders at the moment.`}
            </EmptyDesc>
          </EmptyContainer>
          )
        }
      />

      <FilterBottomSheet
        ref={filterSheetRef}
        title="Filter Reminders"
        subtitle="Narrow down your reminders list"
        onApply={() => filterSheetRef.current?.dismiss()}
        onReset={() => {
          setMedTypeFilter("");
          setStartDateFilter(undefined);
          setEndDateFilter(undefined);
        }}
      >
        <FilterSectionTitle isDark={isDark}>
          By Medication Type
        </FilterSectionTitle>
        <FilterGrid>
          {MEDICATION_TYPES.map((option) => (
            <FilterGridItem
              key={option.value}
              title={option.label}
              isActive={medTypeFilter === option.value}
              onPress={() => {
                if (medTypeFilter === option.value) setMedTypeFilter("");
                else setMedTypeFilter(option.value);
              }}
            />
          ))}
        </FilterGrid>

        <FilterSectionTitle isDark={isDark} style={{ marginTop: 16 }}>
          By Custom Date
        </FilterSectionTitle>
        <DateRow>
          <DateBtn
            isDark={isDark}
            onPress={() => setDatePicker({ visible: true, type: "start" })}
          >
            <Ionicons name="calendar-outline" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
            <DateBtnText isDark={isDark} hasDate={!!startDateFilter}>
              {startDateFilter ? format(startDateFilter, "dd MMM yyyy") : "Start Date"}
            </DateBtnText>
          </DateBtn>

          <DateBtn
            isDark={isDark}
            onPress={() => setDatePicker({ visible: true, type: "end" })}
          >
            <Ionicons name="calendar-outline" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
            <DateBtnText isDark={isDark} hasDate={!!endDateFilter}>
              {endDateFilter ? format(endDateFilter, "dd MMM yyyy") : "End Date"}
            </DateBtnText>
          </DateBtn>
        </DateRow>

        <DatePicker
          modal
          open={datePicker.visible}
          mode="date"
          date={
            datePicker.type === "start"
              ? startDateFilter || new Date()
              : endDateFilter || new Date()
          }
          onConfirm={(date) => {
            setDatePicker((prev) => ({ ...prev, visible: false }));
            if (datePicker.type === "start") setStartDateFilter(date);
            else setEndDateFilter(date);
          }}
          onCancel={() => setDatePicker((prev) => ({ ...prev, visible: false }))}
        />
      </FilterBottomSheet>
    </Container>
  );
};

export default ReminderScreen;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#ffffff"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 60px 20px 25px;
  border-bottom-left-radius: 32px;
  border-bottom-right-radius: 32px;
`;

const HeaderTop = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

const BackButton = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
  justify-content: center;
  margin-left: -5px;
`;

const Header = styled.View`
  flex-direction: column;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
`;

const HeaderSubtitle = styled.Text`
  color: #c7d2fe;
  font-size: 13px;
  font-weight: 500;
  margin-top: 2px;
`;

const SummaryCardsRow = styled.ScrollView`
  padding-left: 16px;
  margin-top: 16px;
  margin-bottom: 8px;
  flex-grow: 0;
  flex-shrink: 0;
`;

const SummaryCardContainer = styled.TouchableOpacity<{
  bgColor: string;
  isActive: boolean;
}>`
  background-color: ${({ bgColor }: { bgColor: string }) => bgColor};
  padding: 14px 16px;
  border-radius: 16px;
  min-width: 175px;
  margin-right: 12px;
  border-width: 1.5px;
  border-color: ${({
    isActive,
    bgColor,
  }: {
    isActive: boolean;
    bgColor: string;
  }) => (isActive ? "#6366f1" : bgColor)};
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const SummaryCardTop = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 6px;
`;

const SummaryIconCircle = styled.View<{ bgColor: string }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ bgColor }: { bgColor: string }) => bgColor};
  align-items: center;
  justify-content: center;
  margin-right: 10px;
`;

const SummaryCountCol = styled.View`
  flex: 1;
  justify-content: center;
`;

const SummaryCardTitle = styled.Text<{ color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ color }: { color: string }) => color};
`;

const SummaryCardCount = styled.Text<{ color: string }>`
  font-size: 26px;
  font-weight: 800;
  color: ${({ color }: { color: string }) => color};
  margin-top: -2px;
  line-height: 30px;
`;

const SummaryCardSubtitle = styled.Text`
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-top: 4px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: 16px;
  margin-vertical: 16px;
`;

const SectionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#0f172a"};
`;

const SectionControls = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FilterSectionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-horizontal: -4px;
`;

const SortButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#f1f5f9"};
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 8px;
  margin-right: 10px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
`;

const SortButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#cbd5e1" : "#475569"};
  margin-right: 4px;
`;

const EmptyContainer = styled.View`
  align-items: center;
  justify-content: center;
  padding-vertical: 50px;
`;

const EmptyImageWrapper = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  background-color: transparent;
`;

const EmptyTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#1e293b"};
  margin-bottom: 6px;
`;

const DateRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 8px;
  gap: 12px;
`;

const DateBtn = styled.TouchableOpacity<{ isDark: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#f1f5f9"};
  padding: 12px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
`;

const DateBtnText = styled.Text<{ isDark: boolean; hasDate: boolean }>`
  margin-left: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ isDark, hasDate }: { isDark: boolean; hasDate: boolean }) =>
    hasDate
      ? isDark
        ? "#f8fafc"
        : "#0f172a"
      : isDark
      ? "#94a3b8"
      : "#64748b"};
`;

const EmptyDesc = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  text-align: center;
  padding-horizontal: 30px;
  line-height: 20px;
`;
