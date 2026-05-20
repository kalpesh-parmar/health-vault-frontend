import React, { useState, useMemo, useRef } from "react";
import {
  FlatList,
  LayoutAnimation,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { AppStackParamList } from "../../../navigation/types";
import { useAppTheme } from "../../../context/ThemeContext";
import FilterTabs from "../../../components/shared/FilterTabs";
import { Reminder } from "../../../types";
import ReminderCard from "../../../components/shared/ReminderCard";
import SearchBar from "../../../components/shared/SearchBar";
import FilterBottomSheet from "../../../components/shared/FilterBottomSheet";

const CATEGORY_TABS = ["All", "Overdue", "Upcoming", "Completed"];

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "rem-1",
    title: "Morning Lisinopril Dose",
    category: "Medication",
    medicationName: "Lisinopril 10mg",
    time: "08:00 AM",
    date: "2026-05-20",
    status: "upcoming",
    notes: "Take with food after waking up.",
  },
  {
    id: "rem-2",
    title: "Flu Shot Appointment",
    category: "Vaccination",
    medicationName: "Influenza Vaccine",
    time: "02:30 PM",
    date: "2026-05-21",
    status: "upcoming",
    notes: "Bring medical details to Central Pharmacy.",
  },
  {
    id: "rem-3",
    title: "Physiotherapy Session",
    category: "Appointment",
    time: "10:00 AM",
    date: "2026-05-18",
    status: "overdue",
    notes: "Focus on lower back exercise.",
  },
  {
    id: "rem-4",
    title: "Complete Vitamin D",
    category: "Medication",
    medicationName: "Vitamin D3",
    time: "01:00 PM",
    date: "2026-05-17",
    status: "completed",
    notes: "Weekly dose with heavy meal.",
  },
  {
    id: "rem-5",
    title: "Cardiologist Consultation",
    category: "Appointment",
    time: "11:30 AM",
    date: "2026-05-25",
    status: "upcoming",
    notes: "Dr. Angela Patel, Suite 402.",
  },
];

const ReminderScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "Reminders">>();
  const { isDark } = useAppTheme();

  // Pick up optional initial filter from navigation parameters
  const initialFilter = route.params?.filter || "All";
  const [activeTab, setActiveTab] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("date_desc");
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);

  const filterSheetRef = useRef<BottomSheetModal>(null);

  const filteredReminders = useMemo(() => {
    return reminders
      .filter((rem) => {
        // Tab Filter: All, Overdue, Upcoming, Completed
        if (activeTab !== "All") {
          if (rem.status.toLowerCase() !== activeTab.toLowerCase()) {
            return false;
          }
        }

        // Search Query Filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const matchTitle = rem.title.toLowerCase().includes(q);
          const matchNotes = rem.notes?.toLowerCase().includes(q);
          const matchMedName = rem.medicationName?.toLowerCase().includes(q);
          const matchCategory = rem.category.toLowerCase().includes(q);
          return !!(matchTitle || matchNotes || matchMedName || matchCategory);
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case "name_asc":
            return a.title.localeCompare(b.title);
          case "name_desc":
            return b.title.localeCompare(a.title);
          case "date_asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case "date_desc":
          default:
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
      });
  }, [reminders, activeTab, searchQuery, sortOption]);

  const handleToggleStatus = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReminders((prev) =>
      prev.map((rem) => {
        if (rem.id === id) {
          const newStatus = rem.status === "completed" ? "upcoming" : "completed";
          return { ...rem, status: newStatus as any };
        }
        return rem;
      })
    );
  };

  const renderReminderCard = ({ item }: { item: Reminder }) => (
    <ReminderCard
      item={item}
      isDark={isDark}
      onActionPress={() => handleToggleStatus(item.id)}
      onAlarmPress={() => {}}
    />
  );

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
                Your healthcare schedule assistant
              </HeaderSubtitle>
            </Header>
          </HeaderLeft>
          <FilterButton onPress={() => filterSheetRef.current?.present()}>
            <MaterialCommunityIcons name="filter" size={20} color="#fff" />
          </FilterButton>
        </HeaderTop>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search health events..."
        />
      </HeaderGradient>

      <FilterTabs
        data={CATEGORY_TABS}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDark={isDark}
      />

      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminderCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
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
              {searchQuery
                ? `We couldn't find anything matching "${searchQuery}".`
                : `Hooray! No pending ${activeTab.toLowerCase()} reminders at the moment.`}
            </EmptyDesc>
          </EmptyContainer>
        }
      />

      <FilterBottomSheet
        ref={filterSheetRef}
        selectedSort={sortOption}
        onSelectSort={setSortOption}
        onApply={() => filterSheetRef.current?.dismiss()}
      />
    </Container>
  );
};

export default ReminderScreen;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 25px;
  border-bottom-left-radius: 32px;
  border-bottom-right-radius: 32px;
`;

const HeaderTop = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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
  margin-bottom: 8px;
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

const FilterButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
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

const EmptyDesc = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  text-align: center;
  padding-horizontal: 30px;
  line-height: 20px;
`;
