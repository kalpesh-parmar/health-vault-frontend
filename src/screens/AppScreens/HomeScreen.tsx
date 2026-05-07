import React, { useRef, useCallback } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import HomeCard from "../../components/Documents/HomeCard";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import ScreenHeader from "../../components/shared/Header";
import BottomSheet from "../../components/shared/BottomSheet";
import CameraModal from "../../components/shared/CameraModal";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import Loader from "../../components/shared/Loader";

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

  const handleOpenNotifications = useCallback(() => {
    navigation.navigate("Notifications");
  }, [navigation]);

  const handleCardPress = useCallback(
    (category: CategoryType) => {
      if (category === "medication") {
        navigation.navigate("Medication");
      } else {
        navigation.navigate("DocumentStack", {
          screen: "DocumentList",
          params: { category },
        });
      }
    },
    [navigation],
  );

  const handleGalleryPickSheet = useCallback(() => {
    handleGalleryPick(() => refRBSheet.current?.dismiss());
  }, [handleGalleryPick]);

  const handleCameraOpenSheet = useCallback(() => {
    handleOpenCamera(() => refRBSheet.current?.dismiss());
  }, [handleOpenCamera]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={takePicture}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      <Container>
        {isCapturing && <Loader visible={isCapturing} />}

        <ScreenHeader
          title="HealthVault"
          leftAction={{
            icon: "menu-outline",
            onPress: handleOpenDrawer,
          }}
          rightAction={{
            icon: "notifications-sharp",
            onPress: handleOpenNotifications,
            badge: 3,
          }}
        />

        <WelcomeSection>
          <WelcomeText>Your Health, Organized</WelcomeText>
          <SubWelcomeText>
            Access, manage & secure all your medical records in one place
          </SubWelcomeText>
        </WelcomeSection>

        <CardsWrapper>
          {homeCards.map((item) => (
            <HomeCard
              key={item.category}
              title={item.title}
              subtitle={item.subtitle}
              accentColor={item.accentColor}
              isOther={item.category === "other"}
              onPress={() => handleCardPress(item.category)}
            />
          ))}
        </CardsWrapper>

        <FABWrapper>
          <FABButton onPress={() => refRBSheet.current?.present()}>
            <MaterialCommunityIcons name="plus" size={30} color="white" />
          </FABButton>
        </FABWrapper>

        <BottomSheet ref={refRBSheet}>
          <AddDocumentSheet
            onGalleryPick={handleGalleryPickSheet}
            onCameraOpen={handleCameraOpenSheet}
          />
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

const WelcomeSection = styled.View`
  padding: 20px 20px 10px;
`;

const WelcomeText = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SubWelcomeText = styled.Text`
  width: 70%;
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
  top: 130px;
  right: 25px;
`;

const FABButton = styled.TouchableOpacity`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.4;
  shadow-radius: 20px;
  elevation: 12;
`;
