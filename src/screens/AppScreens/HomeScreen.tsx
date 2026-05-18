import React, { useRef, useCallback, useMemo } from "react";
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
import { ActivityIndicator } from "react-native";
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
        <Ionicons name={icon} size={24} color={iconColor} />
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

  const { data: notificationData } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: getNotificationCount,
  });

  const notificationBadgeCount = notificationData?.data?.count ?? 0;

  const headerColors = useMemo(
    () =>
      isDark
        ? ["#064e3b", "#0369a1", "#312e81"]
        : ["#0f766e", "#0ea5e9", "#4f46e5"],
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
          <Avatar source={{ uri: data?.profileImageKey! }} />
          <UserTextContent>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <GreetingText>Hi, {data?.firstName}! 👋</GreetingText>
                <SubGreetingText>Welcome To Health Vault</SubGreetingText>
              </>
            )}
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      <ScrollContent showsVerticalScrollIndicator={false}>
        <OverviewCard>
          <OverviewTextSection>
            <OverviewTitle>Health Overview</OverviewTitle>
            <OverviewSub>Insights about your health</OverviewSub>
          </OverviewTextSection>
          <MaterialCommunityIcons name="pulse" size={40} color="#3b82f6" />
        </OverviewCard>

        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() =>
              navigation.navigate("DocumentStack", {
                screen: "DocumentList",
                params: { category: "all" },
              })
            }
            icon="file-tray-full"
            label="My Documents"
            color="#eff6ff"
            iconColor="#3b82f6"
          />

          <ActionItem
            onPress={() =>
              navigation.navigate("MedicationStack", {
                screen: "MedicationList",
              })
            }
            icon="medkit-outline"
            label="Medications"
            color="#ecfdf5"
            iconColor="#10b981"
          />
        </ActionsRow>

        <SectionHeader>
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

      <FloatingAddButton
        activeOpacity={0.8}
        onPress={() => refRBSheet.current?.present()}
      >
        <FabGradient
          colors={headerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </FabGradient>
      </FloatingAddButton>

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

export default HomeScreen;

// --- Styled Components ---

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 40px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
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
  border-color: #6366f1;
`;

const BadgeText = styled.Text`
  color: white;
  font-size: 8px;
  font-weight: bold;
`;

const UserRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 25px;
`;

const Avatar = styled.Image`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.3);
`;

const UserTextContent = styled.View`
  margin-left: 15px;
`;

const GreetingText = styled.Text`
  color: white;
  font-size: 22px;
  font-weight: 700;
`;

const SubGreetingText = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
  margin-top: -30px;
`;

const OverviewCard = styled.View`
  background-color: white;
  margin: 0 20px;
  padding: 20px;
  border-radius: 20px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  elevation: 4;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
`;

const OverviewTextSection = styled.View``;

const OverviewTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;

const OverviewSub = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 25px 20px 15px;
  align-items: center;
`;

const ViewAllButton = styled.TouchableOpacity`
  padding-vertical: 4px;
  padding-horizontal: 8px;
`;

const ViewAllText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
`;

const RemindersListContainer = styled.View`
  padding-horizontal: 20px;
  margin-top: 5px;
`;

const SectionTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`;

const ActionsRow = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  padding: 0 20px;
  gap: 25px;
`;

const ActionItemContainer = styled.TouchableOpacity`
  align-items: center;
  width: 22%;
`;

const ActionIcon = styled.View<{ color: string }>`
  background-color: ${({ color }: { color: string }) => color};
  width: 50px;
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const ActionLabel = styled.Text`
  font-size: 11px;
  text-align: center;
  color: #475569;
  margin-top: 8px;
  font-weight: 700;
`;

const BottomSpacing = styled.View`
  height: 100px;
`;

const FloatingAddButton = styled.TouchableOpacity`
  position: absolute;
  bottom: 100px;
  right: 24px;
  width: 58px;
  height: 58px;
  border-radius: 29px;
  elevation: 10;
  shadow-color: #6366f1;
  shadow-opacity: 0.4;
  shadow-radius: 12px;
  shadow-offset: 0px 6px;
`;

const FabGradient = styled(LinearGradient)`
  flex: 1;
  justify-content: center;
  align-items: center;
  border-radius: 29px;
`;
