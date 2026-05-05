// src/hooks/useDocumentMedia.ts
import { useState } from "react";
import Toast from "react-native-toast-message";
import { Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  requestGalleryPermission,
  openGallery,
} from "../services/mediaServices";

import {
  requestCameraPermission,
  capturePhoto,
} from "../services/cameraServices";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../navigation/types";

export const useDocumentMedia = () => {
  const [selectedImages, setSelectedImages] = useState<string>("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [previewSource, setPreviewSource] = useState<
    "camera" | "gallery" | null
  >(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleGalleryPick = async (onClose?: () => void) => {
    const permission = await requestGalleryPermission();

    if (!permission.granted) {
      if (!permission.canAskAgain) {
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

    const images = await openGallery();
    if (!images) return;

    onClose?.();

    setPreviewSource("gallery");
    setSelectedImages(images);
    navigation.navigate("ImagePreview", {
      images: images,
    });
  };

  const handleOpenCamera = async (onClose?: () => void) => {
    const permission = await requestCameraPermission();

    if (permission.granted) {
      onClose?.();
      setIsCameraVisible(true);
    } else if (!permission.canAskAgain) {
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

  const takePicture = async (cameraRef: any) => {
    setIsCapturing(true);

    try {
      const images = await capturePhoto(cameraRef);
      if (!images) return;

      setPreviewSource("camera");
      navigation.navigate("ImagePreview", {
        images: images,
      });
    } catch (error) {
      console.log("Capture error:", error);
    } finally {
      setIsCapturing(false);
      setIsCameraVisible(false);
    }
  };

  const handleRetake = () => {
    setIsPreviewVisible(false);
    setSelectedImages("");

    if (previewSource === "camera") {
      setIsCameraVisible(true);
    }
  };

  return {
    // state
    selectedImages,
    isPreviewVisible,
    isCameraVisible,
    previewSource,
    isCapturing,

    // setters (only if needed)
    setIsCameraVisible,
    setIsPreviewVisible,
    setSelectedImages,

    // actions
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
    handleRetake,
  };
};
