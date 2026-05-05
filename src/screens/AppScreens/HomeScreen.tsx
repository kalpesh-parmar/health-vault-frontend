import React, { useState, useRef } from "react";
import { Modal } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import LogoutModal from "../../components/Auth/LogoutModal";
import BottomSheet from "../../components/shared/BottomSheet";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import Loader from "../../components/shared/Loader";
import HomeCard from "../../components/Documents/HomeCard";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useSaveDocument } from "../../hooks/useSaveDocument";
import ModernLoader from "../../components/shared/Loader";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AppStackParamList,
  DocumentsStackParamList,
} from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";

type CategoryType =
  | "family"
  | "medical_document"
  | "insurance"
  | "medication"
  | "other";

type HomeCardConfig = {
  title: string;
  subtitle: string;
  category: CategoryType;
  accentColor: string;
};

const homeCards: HomeCardConfig[] = [
  {
    title: "Family",
    subtitle: "Manage members",
    category: "family",
    accentColor: "#6366F1",
  },
  {
    title: "Medical Documents",
    subtitle: "Reports & history",
    category: "medical_document",
    accentColor: "#0EA5E9",
  },
  {
    title: "Insurance",
    subtitle: "Policies & claims",
    category: "insurance",
    accentColor: "#8B5CF6",
  },
  {
    title: "Medication",
    subtitle: "Track medicines",
    category: "medication",
    accentColor: "#10B981",
  },
  {
    title: "Others",
    subtitle: "Other documents",
    category: "other",
    accentColor: "#F59E0B",
  },
];

const HomeScreen = () => {
  const refRBSheet = useRef<BottomSheetModal>(null);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const cameraRef = useRef<any>(null);
  const {
    setIsPreviewVisible,
    isCameraVisible,
    setIsCameraVisible,
    isCapturing,
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
    setSelectedImages,
  } = useDocumentMedia();

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const fontsLoaded = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return <Loader visible={true} />;
  }

  const { isSaving } = useSaveDocument();
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {isSaving && <ModernLoader visible={isSaving} />}

      {isCameraVisible && (
        <Modal
          visible={isCameraVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <CameraContainer style={{ opacity: isCapturing ? 0.8 : 1 }}>
            <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }}>
              <CameraControls>
                <CloseBtn
                  onPress={() => {
                    setIsCameraVisible(false);
                  }}
                >
                  <Ionicons name="close" size={28} color="white" />
                </CloseBtn>

                <CaptureBtn
                  onPress={async () => {
                    await takePicture(cameraRef);
                  }}
                >
                  <CaptureInner />
                </CaptureBtn>
              </CameraControls>
            </CameraView>
          </CameraContainer>
        </Modal>
      )}

      <LogoutModal
        showModal={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />

      <Container>
        {isCapturing && <Loader visible={isCapturing} />}

        <Header>
          <Ionicons
            name="menu-outline"
            size={30}
            color={isDark ? "#f8fafc" : "#2563eb"}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          />

          <AppNameHeader>HealthVault</AppNameHeader>
        </Header>

        <WelcomeSection>
          <WelcomeText>Your Health, Organized</WelcomeText>
          <SubWelcomeText>
            Access, manage & secure all your medical records in one place
          </SubWelcomeText>
        </WelcomeSection>

        <CardsWrapper>
          {homeCards.map(
            (item) => (
              (
                <HomeCard
                  key={item.category}
                  title={item.title}
                  subtitle={item.subtitle}
                  accentColor={item.accentColor}
                  onPress={() =>
                    navigation.navigate("DocumentStack", {
                      screen: "DocumentList",
                      params: { category: item.category },
                    })
                  }
                />
              )
            ),
          )}
        </CardsWrapper>

        <FABWrapper>
          <FABButton
            onPress={() => {
              refRBSheet.current?.present();
            }}
          >
            <MaterialCommunityIcons name="plus" size={30} color="white" />
          </FABButton>
        </FABWrapper>

        <BottomSheet ref={refRBSheet}>
          <SheetContentWrapper>
            <SheetTitle>Add Document</SheetTitle>
            <SheetSubtitle>
              Securely upload or capture your record
            </SheetSubtitle>

            <SheetButtonsContainer>
              <SheetActionButton
                onPress={() =>
                  handleGalleryPick(() => refRBSheet.current?.dismiss())
                }
              >
                <IconWrapper style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}>
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={28}
                    color="#3b82f6"
                  />
                </IconWrapper>
                <SheetActionButtonText>Gallery</SheetActionButtonText>
              </SheetActionButton>

              <SheetActionButton
                onPress={() =>
                  handleOpenCamera(() => refRBSheet.current?.dismiss())
                }
              >
                <IconWrapper style={{ backgroundColor: isDark ? "#14532d" : "#f0fdf4" }}>
                  <MaterialCommunityIcons
                    name="camera-plus"
                    size={28}
                    color="#22c55e"
                  />
                </IconWrapper>
                <SheetActionButtonText>Camera</SheetActionButtonText>
              </SheetActionButton>
            </SheetButtonsContainer>
          </SheetContentWrapper>
        </BottomSheet>
      </Container>
    </>
  );
};

export default HomeScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 55px 20px 18px;
  background-color: ${({ theme }: any) => theme.colors.surfaceTransparent};
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.15;
  elevation: 8;
`;

const AppNameHeader = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 24px;
  color: ${({ theme }: any) => theme.colors.primary};
  font-family: "Montserrat_700Bold";
`;
const WelcomeSection = styled.View`
  padding: 20px 20px 10px;
`;

const WelcomeText = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SubWelcomeText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 6px;
  line-height: 20px;
`;

const CardsWrapper = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  overflow: hidden;
`;

const FABWrapper = styled.View`
  position: absolute;
  bottom: 100px;
  right: 25px;
`;

const FABButton = styled.TouchableOpacity`
  width: 65px;
  height: 65px;
  border-radius: 24px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.4;
  shadow-radius: 20px;
  elevation: 12;
`;

const SheetContentWrapper = styled.View`
  padding: 25px 20px;
  align-items: center;
`;

const SheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 6px;
  margin-bottom: 30px;
  text-align: center;
`;

const SheetButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-evenly;
  width: 100%;
`;

const SheetActionButton = styled.TouchableOpacity`
  align-items: center;
  width: 100px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 16px;
  border-radius: 20px;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
  elevation: 3;
`;

const IconWrapper = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SheetActionButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const CameraContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
  z-index: 9000;
`;

const CameraControls = styled.View`
  flex: 1;
  justify-content: flex-end;
  padding-bottom: 50px;
`;

const CloseBtn = styled.TouchableOpacity`
  position: absolute;
  top: 50px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 12px;
  border-radius: 30px;
`;

const CaptureBtn = styled.TouchableOpacity`
  align-self: center;
  width: 85px;
  height: 85px;
  border-radius: 45px;
  border-width: 6px;
  border-color: rgba(255, 255, 255, 0.4);
  padding: 6px;
`;

const CaptureInner = styled.View`
  flex: 1;
  background-color: white;
  border-radius: 35px;
`;
