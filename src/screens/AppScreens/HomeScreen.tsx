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
import { ActivityIndicator, Text, View } from "react-native";
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
                <GreetingText>Hi, {data?.firstName}!</GreetingText>
                <SubGreetingText>Welcome To Health Vault</SubGreetingText>
              </>
            )}
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      <ScrollContent showsVerticalScrollIndicator={false}>
        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() => refRBSheet?.current?.present()}
            icon="add"
            label="Add Documents"
            color="#eff6ff"
            iconColor="#3b82f6"
          />
          <ActionItem
            onPress={() =>
              navigation.navigate("DocumentStack", {
                screen: "DocumentList",
                params: { category: "all" },
              })
            }
            icon="file-tray-full"
            label="View Documents"
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

        <View style={{ height: 20 }} />

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
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 20px;
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
  margin-top: 7px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 10px 20px 10px;
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
  font-size: 16px;
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
  width: 23%;
`;

const ActionIcon = styled.View<{ color: string }>`
  background-color: ${({ color }: { color: string }) => color};
  width: 55px;
  height: 55px;
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
