import React, { useRef, useCallback, useEffect, useState } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AppStackParamList,
  DocumentsStackParamList,
} from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import BottomSheet from "../../components/shared/BottomSheet";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import { useMutation } from "@tanstack/react-query";
import { getNotificationCount } from "../../services/notificationService";
import { getUser } from "../../services/userService";

// Types for styling props
interface ThemeProps {
  theme: any;
}

interface ColorProps {
  color: string;
}

const HomeScreen = () => {
  const refRBSheet = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);
  const [firstName, setFirstName] = useState<string>("Guest User");
  const [notificationBadgeCount, setNotificationBadgeCount] = useState<number>(0);

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

  const { mutateAsync: getNotificationBadgeCount } = useMutation({
    mutationFn: getNotificationCount,
    onSuccess: (data) => {
      setNotificationBadgeCount(data.count);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const { mutateAsync: getProfile } = useMutation({
    mutationFn: getUser,
    onSuccess: (data) => {
      setFirstName(data?.firstName);
      console.log(data);
    },
    onError: (error) => {
      console.log(error);
    }
  })

  return (
    <Container>
      <StatusBar style="light" />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={takePicture}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {isCapturing && <Loader visible={isCapturing} />}

      <HeaderGradient
        colors={isDark ? ["#312E81", "#4F46E5"] : ["#6366f1", "#a855f7"]}
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
          <Avatar source={{ uri: "https://i.pravatar.cc/150?img=32" }} />
          <UserTextContent>
            <GreetingText>Hi, {firstName}! 👋</GreetingText>
            <SubGreetingText>Good morning</SubGreetingText>
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      <ScrollContent showsVerticalScrollIndicator={false}>
        <OverviewCard>
          <OverviewTextSection>
            <OverviewTitle>Health Overview</OverviewTitle>
            <OverviewSub>Insights about your health</OverviewSub>
          </OverviewTextSection>
          <MaterialCommunityIcons
            name="pulse"
            size={40}
            color="#818cf8"
            style={{ opacity: 0.5 }}
          />
        </OverviewCard>

        <SectionHeader>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem onPress={() => refRBSheet.current?.present()}>
            <ActionIcon color="#ecfdf5">
              <Ionicons name="document-text" size={24} color="#10b981" />
            </ActionIcon>
            <ActionLabel>Upload Documents</ActionLabel>
          </ActionItem>
          <ActionItem
            onPress={() =>
              navigation.navigate("DocumentStack", {
                screen: "DocumentList",
                params: { category: "all" },
              })
            }
          >
            <ActionIcon color="#eff6ff">
              <Ionicons name="file-tray-full" size={24} color="#3b82f6" />
            </ActionIcon>
            <ActionLabel>My Documents</ActionLabel>
          </ActionItem>

          <ActionItem onPress={() => {navigation.navigate("Medication")}}>
            <ActionIcon color="#ecfdf5">
              <Ionicons name="medkit-outline" size={24} color="#10b981" />
            </ActionIcon>
            <ActionLabel>Medications</ActionLabel>
          </ActionItem>
        </ActionsRow>

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
        />
      </BottomSheet>
    </Container>
  );
};

export default HomeScreen;

const Container = styled.View<ThemeProps>`
  flex: 1;
  background-color: #f8fafc;
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
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  elevation: 4;
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

const SectionTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`;

const ViewAll = styled.Text`
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
`;

const ActionsRow = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  padding: 0 20px;
  gap: 20px;
`;

const ActionItem = styled.TouchableOpacity`
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
  font-size: 10px;
  text-align: center;
  color: #475569;
  margin-top: 8px;
  font-weight: 500;
`;

const AppointmentCard = styled.TouchableOpacity`
  background-color: white;
  margin: 0 20px;
  padding: 15px;
  border-radius: 20px;
`;

const DoctorInfo = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DocIconBox = styled.View`
  background-color: #f5f3ff;
  padding: 10px;
  border-radius: 12px;
`;

const DocTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const DocName = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
`;

const DocSpec = styled.Text`
  font-size: 12px;
  color: #64748b;
`;

const DocDateTime = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
`;

const DocAvatar = styled.Image`
  width: 45px;
  height: 45px;
  border-radius: 22.5px;
`;

const BottomSpacing = styled.View`
  height: 100px;
`;
