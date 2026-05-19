import React, { useState } from "react";
import {
  FlatList,
  LayoutAnimation,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../../navigation/types";
import { useAppTheme } from "../../../context/ThemeContext";
import FilterTabs from "../../../components/shared/FilterTabs";
import { Reminder } from "../../../types";
import ReminderCard from "../../../components/shared/ReminderCard";
import SearchBar from "../../../components/shared/SearchBar";

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
