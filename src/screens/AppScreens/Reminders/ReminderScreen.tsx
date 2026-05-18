import React, { useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../../navigation/types";
import { useAppTheme } from "../../../context/ThemeContext";
import FilterTabs from "../../../components/shared/FilterTabs";
import { Reminder } from "../../../types";
import ReminderCard from "../../../components/shared/ReminderCard";

// Enable LayoutAnimation for smooth note expansion on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_TABS = ["All", "Overdue", "Upcoming", "Completed"];

const ReminderScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "Reminders">>();
  const { isDark, theme } = useAppTheme();

  // Pick up optional initial filter from navigation parameters
  const initialFilter = route.params?.filter || "All";
  const [activeTab, setActiveTab] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(
    null,
  );

  const toggleExpandNotes = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedReminderId(expandedReminderId === id ? null : id);
  };

  const renderReminderCard = ({ item }: { item: Reminder }) => (
    <ReminderCard
      item={item}
      isDark={isDark}
      onActionPress={() => {}}
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
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={30} color="#fff" />
          </BackButton>
          <Header>
            <HeaderTitle>Reminders</HeaderTitle>
            <HeaderSubtitle>
              Your healthcare schedule assistant
            </HeaderSubtitle>
          </Header>
        </HeaderTop>

        {/* <SearchContainer>
          <SearchIcon>
            <Ionicons name="search-outline" size={20} color="#cbd5e1" />
          </SearchIcon>
          <SearchInput
            placeholder="Search health events..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            isDark={isDark}
          />
          {searchQuery.length > 0 && (
            <ClearButton onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </ClearButton>
          )}
        </SearchContainer> */}
      </HeaderGradient>

      <FilterTabs
        data={CATEGORY_TABS}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDark={isDark}
      />

        <FlatList
          data={[]}
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
    </Container>
  );
};

export default ReminderScreen;

/**
 * ─── Styled Components ──────────────────────────────────────────────
 */

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
  gap: 10px;
  margin-bottom: 20px;
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

const SearchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding-horizontal: 14px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.15);
  height: 48px;
`;

const SearchIcon = styled.View`
  margin-right: 10px;
`;

const SearchInput = styled.TextInput<{ isDark: boolean }>`
  flex: 1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  height: 100%;
`;

const ClearButton = styled.TouchableOpacity`
  padding: 4px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text<{ isDark: boolean }>`
  margin-top: 12px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  font-weight: 600;
`;

const Card = styled.TouchableOpacity<{ isDark: boolean; status: string }>`
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "white"};
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 14px;
  elevation: 4;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
  overflow: hidden;
`;

const CardBody = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const StatusIndicator = styled.View<{ status: string }>`
  position: absolute;
  left: -16px;
  top: 0;
  bottom: 0;
  width: 5px;
  background-color: ${({ status }: { status: string }) =>
    status === "overdue"
      ? "#ef4444"
      : status === "completed"
        ? "#10b981"
        : "#6366f1"};
`;

const IconWrapper = styled.View`
  width: 46px;
  height: 46px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const TextContent = styled.View`
  flex: 1;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const CardTitle = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#1e293b"};
  flex: 1;
  margin-right: 8px;
`;

const CategoryBadge = styled.View`
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 8px;
`;

const CategoryText = styled.Text`
  font-size: 10px;
  font-weight: 700;
`;

const MedicationSubtext = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  margin-top: 3px;
`;

const ScheduleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
`;

const ScheduleItem = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ScheduleText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  font-weight: 500;
  margin-left: 5px;
`;

const NotesSection = styled.View<{ isDark: boolean }>`
  margin-top: 14px;
  padding-top: 12px;
  border-top-width: 1px;
  border-top-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
`;

const NotesTitle = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#cbd5e1" : "#475569"};
  margin-bottom: 4px;
`;

const NotesBody = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  line-height: 18px;
`;

const CardFooter = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 12px;
  border-top-width: 1px;
  border-top-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const StatusLabel = styled.Text`
  font-size: 11px;
  font-weight: 800;
  margin-left: 6px;
  letter-spacing: 0.3px;
`;

const ActionsContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ActionButton = styled.TouchableOpacity<{
  isDark: boolean;
  completed?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${({
    isDark,
    completed,
  }: {
    isDark: boolean;
    completed?: boolean;
  }) =>
    completed
      ? isDark
        ? "#334155"
        : "#cbd5e1"
      : isDark
        ? "#334155"
        : "#e2e8f0"};
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const ActionButtonLabel = styled.Text`
  font-size: 11px;
  font-weight: 700;
  margin-left: 4px;
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
