import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { getInitials } from "../../utils/avatarUtils";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import { useQuery } from "@tanstack/react-query";
import { getNotificationCount } from "../../services/notificationService";
import { getUser } from "../../services/userService";
import { ActivityIndicator, View } from "react-native";
import ReminderCard from "../../components/shared/ReminderCard";

const UPCOMING_REMINDERS = [
  {
    id: "rec1",
    title: "Morning Lisinopril Dose",
    category: "Medication",
    medicationName: "Lisinopril 10mg",
    time: "08:00 AM",
    date: "Tomorrow",
    status: "upcoming",
    notes: "Take with food after waking up.",
  },
  {
    id: "rec2",
    title: "Flu Shot Appointment",
    category: "Vaccination",
    medicationName: "Influenza Vaccine",
    time: "02:30 PM",
    date: "20 May 2026",
    status: "upcoming",
    notes: "Bring medical details to Central Pharmacy.",
  },
];

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
  const refRBSheet = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);

  const {
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
  } = useDocumentMedia();

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

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [data?.profileImageKey]);

  const initials = useMemo(() => {
    const res = getInitials(data?.firstName, data?.lastName);
    console.log("[Avatar Audit] firstName:", data?.firstName);
    console.log("[Avatar Audit] lastName:", data?.lastName);
    console.log("[Avatar Audit] profileImage:", data?.profileImageKey);
    console.log("[Avatar Audit] generated initials:", res);
    return res;
  }, [data?.firstName, data?.lastName, data?.profileImageKey]);

  const showInitials = imageError || !data?.profileImageKey || data.profileImageKey.trim() === "" || data.profileImageKey.includes("placeholder");

  const { data: notificationData } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: getNotificationCount,
  });

  const notificationBadgeCount = notificationData?.data?.count ?? 0;

  // Vibrant gradient style matching your reference design theme
  const headerColors = useMemo(
    () => (isDark ? ["#3b0764", "#1e1b4b"] : ["#a855f7", "#6366f1"]),
    [isDark],
  );

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => takePicture(cameraRef)}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {isCapturing && <Loader visible={isCapturing} />}

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
          {showInitials ? (
            <InitialsAvatar>
              {initials ? (
                <InitialsText allowFontScaling={true}>{initials}</InitialsText>
              ) : (
                <Ionicons name="person" size={24} color="#fff" />
              )}
            </InitialsAvatar>
          ) : (
            <Avatar
              source={{
                uri: data?.profileImageKey,
              }}
              onError={() => setImageError(true)}
            />
          )}
          <UserTextContent>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <GreetingText>Hi, {data?.firstName}!</GreetingText>
                <SubGreetingText>
                  Health Vault Welcomes You.
                </SubGreetingText>
              </>
            )}
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      {/* --- OVERLAPPING FIXED CARD CONTEXT --- */}
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

      {/* --- MAIN BODY SCROLL VIEW (PULLED BEHIND CARD) --- */}
      <ScrollContent showsVerticalScrollIndicator={false}>
        {/* --- SECTION: TODAY'S SUMMARY --- */}
        <SectionHeader>
          <SectionTitle>Today's Summary</SectionTitle>
        </SectionHeader>

        <SummaryRow horizontal showsHorizontalScrollIndicator={false}>
          <SummaryCard>
            <SummaryIconCircle color="#ffe4e6">
              <Ionicons name="heart" size={20} color="#f43f5e" />
            </SummaryIconCircle>
            <SummaryCardLabel>Heart Rate</SummaryCardLabel>
            <SummaryValueGroup>
              <SummaryPrimaryValue>72</SummaryPrimaryValue>
              <SummaryUnitValue>bpm</SummaryUnitValue>
            </SummaryValueGroup>
          </SummaryCard>

          <SummaryCard>
            <SummaryIconCircle color="#dbeafe">
              <MaterialCommunityIcons
                name="shoe-print"
                size={20}
                color="#2563eb"
              />
            </SummaryIconCircle>
            <SummaryCardLabel>Steps</SummaryCardLabel>
            <SummaryPrimaryValue>4,350</SummaryPrimaryValue>
            <SummaryTargetValue>/ 10,000</SummaryTargetValue>
          </SummaryCard>

          <SummaryCard>
            <SummaryIconCircle color="#e0f2fe">
              <Ionicons name="water" size={20} color="#0284c7" />
            </SummaryIconCircle>
            <SummaryCardLabel>Water</SummaryCardLabel>
            <SummaryValueGroup>
              <SummaryPrimaryValue>6</SummaryPrimaryValue>
              <SummaryUnitValue>Glass</SummaryUnitValue>
            </SummaryValueGroup>
            <SummaryTargetValue>/ 8 Glass</SummaryTargetValue>
          </SummaryCard>
        </SummaryRow>

        {/* --- SECTION: QUICK ACTIONS --- */}
        <SectionHeader style={{ marginTop: 15 }}>
          <SectionTitle>Quick Actions</SectionTitle>
          <ViewAllButton onPress={() => {}}>
            <ViewAllText>View All</ViewAllText>
          </ViewAllButton>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() => refRBSheet?.current?.present()}
            icon="document-attach-outline"
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
          <SectionTitle>Upcoming Reminders</SectionTitle>
          <ViewAllButton onPress={() => navigation.navigate("Reminders")}>
            <ViewAllText>View All</ViewAllText>
          </ViewAllButton>
        </SectionHeader>

        <RemindersListContainer>
          {UPCOMING_REMINDERS.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              item={reminder as any}
              isDark={isDark}
              onActionPress={() => {}}
              onAlarmPress={() => {}}
            />
          ))}
        </RemindersListContainer>

        <BottomSpacing />
      </ScrollContent>

      <BottomSheet ref={refRBSheet}>
        <AddDocumentSheet
          onGalleryPick={() =>
            handleGalleryPick(() => refRBSheet.current?.dismiss())
          }
          onCameraOpen={() =>
            handleOpenCamera(() => refRBSheet.current?.dismiss())
          }
          onDocumentPick={() => {}}
        />
      </BottomSheet>
    </Container>
  );
};

export default HomeScreen;

// --- Styled Components ---

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#0f172a" : "#f8fafc")};
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

const Avatar = styled.Image`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
`;

const InitialsAvatar = styled.View`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
  background-color: rgba(255, 255, 255, 0.22);
  justify-content: center;
  align-items: center;
`;

const InitialsText = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
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
const SummaryRow = styled.ScrollView`
  padding-left: 24px;
  flex-direction: row;
`;

const SummaryCard = styled.View`
  background-color: #ffffff;
  width: 98px;
  border-radius: 14px;
  padding: 14px;
  margin-right: 14px;
`;

const SummaryIconCircle = styled.View<{ color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: ${({ color }: {color: string}) => color};
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SummaryCardLabel = styled.Text`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

const SummaryValueGroup = styled.View`
  flex-direction: row;
  align-items: baseline;
  margin-top: 6px;
`;

const SummaryPrimaryValue = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 4px;
`;

const SummaryUnitValue = styled.Text`
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin-left: 4px;
`;

const SummaryTargetValue = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
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
  background-color: ${({ color }: {color: string}) => color};
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
