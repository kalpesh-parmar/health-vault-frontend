import React, { useState, useRef } from "react";
import { Linking } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCameraPermissions, CameraView } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import LogoutModal from "../../components/Auth/LogoutModal";
import BottomSheet from "../../components/shared/BottomSheet";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import ImagePreview from "../../components/shared/ImagePreview";
import Loader from "../../components/shared/Loader";
import { RootStackParamList } from "../../navigation/types";
import HomeCard from "../../components/Documents/HomeCard";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { documentUpload } from "../../services/authService";
import { useMutation } from "@tanstack/react-query";

const HomeScreen = () => {
  const refRBSheet = useRef<BottomSheetModal>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);
  const [previewSource, setPreviewSource] = useState<"camera" | "gallery">(
    "camera",
  );
  const cameraRef = useRef<any>(null);
  const [filename, setFilename] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCapture = async () => {
    if (permission?.granted) {
      refRBSheet?.current?.dismiss();
      setIsCameraVisible(true);
      return;
    }

    const response = await requestPermission();
    if (response.granted) {
      setIsCameraVisible(true);
    } else if (!permission?.canAskAgain) {
      refRBSheet?.current?.dismiss();
      Toast.show({
        type: "error",
        text1: "Enable Camera Permission",
        text2: "Please enable camera access from device settings.",
        props: {
          buttonText: "Go To Settings",
          onPressButton: () => Linking.openSettings(),
        },
      });
    }
  };

  const takePicture = async () => {
    if (cameraRef?.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync();
        console.log("Photo URI :- ", photo.uri);
        setPreviewSource("camera");
        setSelectedImages([photo.uri]);
        setIsCapturing(false);
        setIsPreviewVisible(true);
        setIsCameraVisible(false);
      } catch (error) {
        console.log("capturing Error:-", error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleRetake = () => {
    setIsPreviewVisible(false);
    setSelectedImages([]);
    if (previewSource === "camera") {
      setIsCameraVisible(true);
      return;
    }

    void handleGalleryPick();
  };

  const { mutateAsync: saveDocumentMutation, isPending } = useMutation({
    mutationFn: documentUpload,
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Document Added",
        text2: "Your selected images are ready in the local list.",
      });
    },
    onError: (error) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message,
      });
    },
  });

  const handleSave = async (fileName: string, category: string, images: string[]) => {
    if (!images || images.length === 0) return;

    if (!fileName || !category) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill both filename and category.",
      });
      return;
    }

    setFilename(fileName);
    setCategory(category);

    try {
      const formData = new FormData();

      const uri = images[0];
      const filename = uri.split("/").pop();
      const type = filename?.split(".").pop();

      formData.append("file", {
        uri: uri,
        name: `${fileName}.${type}`,
        type: `image/${type}`,
      } as any);

      formData.append("fileName", `${fileName}.${type}`);
      console.log("Filename :-", `${fileName}.${type}`);
      formData.append("category", category);

      await saveDocumentMutation(formData);
    } catch (error) {
      console.log("Error :- ", error);
    }

    setIsPreviewVisible(false);
    setSelectedImages([]);

    Toast.show({
      type: "success",
      text1: "Document Added",
      text2: "Your selected images are ready in the local list.",
    });
  };

  const handleGalleryPick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log(permissionResult);

    if (!permissionResult.granted) {
      if (!permissionResult.canAskAgain) {
        Toast.show({
          type: "error",
          text1: "Enable Gallery Permission",
          text2: "Please enable photo library access from device settings.",
          props: {
            buttonText: "Go To Settings",
            onPressButton: () => Linking.openSettings(),
          },
        });
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: false,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    refRBSheet.current?.dismiss();
    setPreviewSource("gallery");
    const imageUris = result.assets.map((asset) => asset.uri);
    setSelectedImages(imageUris);
    setIsPreviewVisible(true);
  };

  return (
    <>
      <StatusBar style="dark" />

      {isCameraVisible && (
        <CameraContainer>
          <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }}>
            <CameraControls>
              <CloseBtn onPress={() => setIsCameraVisible(false)}>
                <Ionicons name="close" size={28} color="white" />
              </CloseBtn>

              <CaptureBtn onPress={takePicture}>
                <CaptureInner />
              </CaptureBtn>
            </CameraControls>
          </CameraView>
        </CameraContainer>
      )}

      <LogoutModal
        showModal={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />

      <ImagePreview
        images={selectedImages}
        isVisible={isPreviewVisible}
        setIsVisible={setIsPreviewVisible}
        onRetake={() => handleRetake()}
        onSave={handleSave}
        retakeLabel={previewSource === "camera" ? "Retake" : "Choose Another"}
        isPending={isPending}
      />

      <Container>
        {isCapturing && <Loader visible={isCapturing} />}

        <Header>
          <Ionicons
            name="menu-outline"
            size={30}
            color="#2563eb"
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
          <HomeCard
            title="Family"
            subtitle="Manage members"
            // onPress={() => navigation.navigate("Family")}
            accentColor="#6366F1"
          />

          <HomeCard
            title="Medical Documents"
            subtitle="Reports & history"
            onPress={() => navigation.navigate("DocumentList")}
            accentColor="#0EA5E9"
          />

          <HomeCard
            title="Insurance"
            subtitle="Policies & claims"
            // onPress={() => navigation.navigate("DocumentList")}
            accentColor="#8B5CF6"
          />

          <HomeCard
            title="Medication"
            subtitle="Track medicines"
            onPress={() => navigation.navigate("Medication")}
            accentColor="#10B981"
          />

          <HomeCard
            title="Others"
            subtitle="Other documents"
            // onPress={() => navigation.navigate("Others")}
            accentColor="#F59E0B"
          />
        </CardsWrapper>

        <FABWrapper>
          <FABButton onPress={() => refRBSheet.current?.present()}>
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
              <SheetActionButton onPress={() => void handleGalleryPick()}>
                <IconWrapper style={{ backgroundColor: "#eff6ff" }}>
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={28}
                    color="#2563eb"
                  />
                </IconWrapper>
                <SheetActionButtonText>Gallery</SheetActionButtonText>
              </SheetActionButton>

              <SheetActionButton onPress={handleCapture}>
                <IconWrapper style={{ backgroundColor: "#f0fdf4" }}>
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
  background-color: #ffffff;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 55px 20px 18px;
  background-color: rgba(255, 255, 255, 0.9);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  shadow-color: #3b82f6;
  shadow-opacity: 0.15;
  elevation: 8;
`;

const AppNameHeader = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 24px;
  font-weight: 900;
  color: #2563eb;
`;
const WelcomeSection = styled.View`
  padding: 20px 20px 10px;
`;

const WelcomeText = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
`;

const SubWelcomeText = styled.Text`
  font-size: 14px;
  color: #64748b;
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
  background-color: #2563eb;
  justify-content: center;
  align-items: center;
  shadow-color: #2563eb;
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
  color: #0f172a;
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: #64748b;
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
  background-color: white;
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
  color: #1e293b;
`;

const CameraContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
  z-index: 2000;
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
