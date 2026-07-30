import React, { useRef, useCallback, useMemo } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  DrawerActions,
  useNavigation,
  useIsFocused,
} from "@react-navigation/native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import Toast from "react-native-toast-message";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../config/queryClient";
import { getNotificationCount } from "../../services/notificationService";
import { getUser } from "../../services/userService";
import { getFileSource } from "../../services/fileService";
import { ActivityIndicator, View } from "react-native";
import ReminderCard from "../../components/shared/ReminderCard";
import {
  listTodayOccurrences,
  updateReminderOccurrenceStatus,
} from "../../services/reminderService";
import { listMedications } from "../../services/medicationservice";
import { listDocument } from "../../services/documentService";
import { Reminder } from "../../types";
import { getInitials } from "../../utils/avatarUtils";

interface ActionItemProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
}

const memo = React.memo;

const ActionItem = memo(
  ({ onPress, icon, label, color, iconColor }: ActionItemProps) => (
    <ActionItemContainer onPress={onPress}>
      <ActionIcon color={color}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </ActionIcon>
      <ActionLabel>{label}</ActionLabel>
    </ActionItemContainer>
  ),
);

const HomeScreen = () => {
  const isFocused = useIsFocused();
  const refRBSheet = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const [profileImageSource, setProfileImageSource] = React.useState<any>(null);

  React.useEffect(() => {
    if (data?.profileImageKey) {
      const fetchImage = async () => {
        try {
          const res = await getFileSource(data.profileImageKey!);
          setProfileImageSource(res);
        } catch (e) {
          console.log("Failed to load profile image URL", e);
        }
      };
      fetchImage();
    }
  }, [data?.profileImageKey]);

  const { data: notificationData } = useQuery(
    {
      queryKey: ["notificationCount"],
      queryFn: getNotificationCount,
    },
  );

  const { data: remindersData, isLoading: isLoadingReminders } = useQuery({
    queryKey: ["todayReminders"],
    queryFn: listTodayOccurrences,
  });

  const rawReminders =
    remindersData?.data?.occurrences ||
    remindersData?.data ||
    remindersData ||
    [];
  const reminders = Array.isArray(rawReminders) ? rawReminders : [];

  const { data: medicationsData } = useQuery({
    queryKey: ["allMedications"],
    queryFn: listMedications,
  });

  const { data: documentsData } = useQuery({
    queryKey: ["allDocuments"],
    queryFn: listDocument,
  });

  const medicationsCount = Array.isArray(medicationsData?.data) 
    ? medicationsData.data.length 
    : 0;

  const documentsCount = Array.isArray((documentsData?.data as any)?.items) 
    ? (documentsData?.data as any).items.length 
    : (Array.isArray(documentsData?.data) ? documentsData.data.length : 0);

  const pendingMedicinesCount = reminders.filter(
    (r: Reminder) => (r.status || "").toLowerCase() === "pending"
  ).length;

  const recentTwoReminders = useMemo(() => {
    return reminders
      .filter((r: Reminder) => r.status?.toUpperCase() !== "COMPLETED")
      .sort((a: any, b: any) => {
        const timeA = new Date(a.actualMedicationTime).getTime();
        const timeB = new Date(b.actualMedicationTime).getTime();
        return timeA - timeB; // Ascending: soonest first
      })
      .slice(0, 2);
  }, [reminders]);

  const updateStatusMutation = useMutation({
    mutationFn: updateReminderOccurrenceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
    },
  });

  const handleToggleStatus = async (item: Reminder) => {
    if (item.status === "completed") return;

    await updateStatusMutation.mutateAsync({
      occurrenceId: item.id!,
      status: "COMPLETED",
    });
  };

  const notificationBadgeCount = notificationData?.data?.count ?? 0;

  // Vibrant gradient style matching your reference design theme
  const headerColors = useMemo(
    () => (isDark ? ["#3b0764", "#1e1b4b"] : ["#a855f7", "#6366f1"]),
    [isDark],
  );

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />



      {/* --- BACKGROUND HEADER REGION --- */}
      <HeaderGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <IconButton onPress={handleOpenDrawer}>
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </IconButton>
          <NotificationWrapper
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={26} color="#fff" />
            {notificationBadgeCount > 0 && (
              <Badge>
                <BadgeText>{notificationBadgeCount}</BadgeText>
              </Badge>
            )}
          </NotificationWrapper>
        </TopRow>

        <UserRow>
          {profileImageSource ? (
            <Avatar
              source={profileImageSource}
            />
          ) : (
            <UserAvatarFallback>
              <UserAvatarFallbackText>
                {getInitials(data?.firstName, data?.lastName) || "?"}
              </UserAvatarFallbackText>
            </UserAvatarFallback>
          )}
          <UserTextContent>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <GreetingText>Hi, {data?.firstName}!</GreetingText>
                <SubGreetingText>Health Vault Welcomes You.</SubGreetingText>
              </>
            )}
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      <FixedOverviewCard
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <OverviewTextContainer>
          <OverviewTitle>Health Overview</OverviewTitle>
          <OverviewSubtitle>
            Complete insights about your health
          </OverviewSubtitle>
        </OverviewTextContainer>
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={42}
          color="#818cf8"
          style={{ opacity: 0.6 }}
        />
      </FixedOverviewCard>

      <ScrollContent showsVerticalScrollIndicator={false}>
        <SectionHeader>
          <SectionTitle>Health Vault Summary</SectionTitle>
        </SectionHeader>

        <SummaryRow>
          <Animated.View
            style={{ flex: 1 }}
            key={isFocused ? "med-f" : "med-u"}
            entering={FadeInRight.delay(100).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#ffe4e6">
                <MaterialCommunityIcons name="pill" size={20} color="#f43f5e" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={1}>Medications</SummaryCardLabel>
              <SummaryPrimaryValue>{medicationsCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>

          <Animated.View
            style={{ flex: 1, marginHorizontal: 10 }}
            key={isFocused ? "doc-f" : "doc-u"}
            entering={FadeInRight.delay(200).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#dbeafe">
                <Ionicons name="document-text" size={20} color="#2563eb" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={1}>Documents</SummaryCardLabel>
              <SummaryPrimaryValue>{documentsCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>

          <Animated.View
            style={{ flex: 1 }}
            key={isFocused ? "tod-f" : "tod-u"}
            entering={FadeInRight.delay(300).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#e0f2fe">
                <Ionicons name="calendar" size={20} color="#0284c7" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={2} style={{ textAlign: "center" }}>Today's Doses</SummaryCardLabel>
              <SummaryPrimaryValue>{pendingMedicinesCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>
        </SummaryRow>

        {/* --- SECTION: QUICK ACTIONS --- */}
        <SectionHeader style={{ marginTop: 15 }}>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() => refRBSheet?.current?.present()}
            icon="add"
            label="Add Documents"
            color="#ecfdf5"
            iconColor="#10b981"
          />
          <ActionItem
            onPress={() =>
              navigation.navigate("DocumentStack", {
                screen: "DocumentList",
                params: { category: "all" },
              })
            }
            icon="document-text-outline"
            label="My Documents"
            color="#eff6ff"
            iconColor="#2563eb"
          />
          <ActionItem
            onPress={() => navigation.navigate("Reminders")}
            icon="calendar-outline"
            label="Reminders"
            color="#f5f3ff"
            iconColor="#8b5cf6"
          />
          <ActionItem
            onPress={() =>
              navigation.navigate("MedicationStack", {
                screen: "MedicationList",
              })
            }
            icon="medkit"
            label="Medications"
            color="#fff1f2"
            iconColor="#f43f5e"
          />
        </ActionsRow>

        {/* --- SECTION: UPCOMING REMINDERS --- */}
        <SectionHeader style={{ marginTop: 25 }}>
          <SectionTitle>Today's Reminders</SectionTitle>
          <ViewAllButton onPress={() => navigation.navigate("Reminders")}>
            <ViewAllText>View All</ViewAllText>
          </ViewAllButton>
        </SectionHeader>

        <RemindersListContainer>
          {isLoadingReminders ? (
            <ActivityIndicator
              size="large"
              color="#6366f1"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <>
              {recentTwoReminders.map((reminder: Reminder) => (
                <ReminderCard
                  key={reminder.id}
                  item={reminder}
                  isDark={isDark}
                  onActionPress={() => handleToggleStatus(reminder)}
                />
              ))}
              {recentTwoReminders.length === 0 && (
                <View style={{ alignItems: "center", marginVertical: 20 }}>
                  <SectionTitle style={{ fontSize: 14, color: "#64748b" }}>
                    No Reminders For Today
                  </SectionTitle>
                </View>
              )}
            </>
          )}
        </RemindersListContainer>

        <BottomSpacing />
      </ScrollContent>

      <DocumentUploadBottomSheet ref={refRBSheet} />
    </Container>
  );
};

export default HomeScreen;

// --- Styled Components ---

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 24px 60px;
  border-bottom-left-radius: 50px;
  border-bottom-right-radius: 50px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const IconButton = styled.TouchableOpacity``;

const NotificationWrapper = styled.TouchableOpacity`
  position: relative;
`;

const Badge = styled.View`
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: #ef4444;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #a855f7;
`;

const BadgeText = styled.Text`
  color: white;
  font-size: 8px;
  font-weight: bold;
`;

const UserRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
`;

const UserAvatarFallback = styled.View`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
`;

const UserAvatarFallbackText = styled.Text`
  color: white;
  font-size: 24px;
  font-weight: bold;
`;

const Avatar = styled.Image`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
`;

const UserTextContent = styled.View`
  margin-left: 14px;
`;

const GreetingText = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: 700;
`;

const SubGreetingText = styled.Text`
  color: rgba(255, 255, 255, 0.84);
  font-size: 14px;
  margin-top: 2px;
`;

/* Overlapping Health Overview Card Container absolute position configurations */
const FixedOverviewCard = styled.View`
  position: absolute;
  top: 160px;
  left: 20px;
  right: 20px;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 24px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
`;

const OverviewTextContainer = styled.View`
  flex: 1;
`;

const OverviewTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;

const OverviewSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 12px 24px;
  align-items: center;
  margin-top: 35px;
`;

const SectionTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
`;

const ViewAllButton = styled.TouchableOpacity``;

const ViewAllText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

/* Summary Row Styling setup */
const SummaryRow = styled.View`
  padding-horizontal: 24px;
  flex-direction: row;
  justify-content: space-between;
`;

const SummaryCard = styled.View`
  background-color: #ffffff;
  flex: 1;
  border-radius: 14px;
  padding: 14px 6px;
  align-items: center;
`;

const SummaryIconCircle = styled.View<{ color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: ${({ color }: { color: string }) => color};
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SummaryCardLabel = styled.Text`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

const SummaryPrimaryValue = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 4px;
`;

/* Actions Layout Row Updates */
const ActionsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 0 24px;
  margin-top: 4px;
`;

const ActionItemContainer = styled.TouchableOpacity`
  align-items: center;
  width: 22%;
`;

const ActionIcon = styled.View<{ color: string }>`
  background-color: ${({ color }: { color: string }) => color};
  width: 56px;
  height: 56px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
`;

const ActionLabel = styled.Text`
  font-size: 11px;
  text-align: center;
  color: #334155;
  margin-top: 8px;
  font-weight: 600;
`;

const RemindersListContainer = styled.View`
  padding-horizontal: 24px;
  margin-top: 4px;
`;

const BottomSpacing = styled.View`
  height: 120px;
`;
