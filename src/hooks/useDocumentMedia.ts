// src/hooks/useDocumentMedia.ts
import { useState, useCallback } from "react";
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
import * as DocumentPicker from "expo-document-picker";

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

  const handleGalleryPick = useCallback(async (
    onClose?: () => void,
    from?: "Register" | "Profile" | "Document",
  ) => {
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
    if (from !== "Register" && from !== "Profile" && from !== "Document") {
      navigation.navigate("ImagePreview", {
        images: images,
      });
    }
  }, [navigation]);

  const handleOpenCamera = useCallback(async (onClose?: () => void) => {
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
  }, []);

  const takePicture = useCallback(async (cameraRef: React.RefObject<any>, from?: "Register" | "Profile" | "Document") => {
    if (!cameraRef.current) return;
    setIsCapturing(true);

    try {
      const images = await capturePhoto(cameraRef);
      if (!images) {
        setIsCapturing(false);
        setIsCameraVisible(false);
        return;
      }

      setPreviewSource("camera");
      if (from !== "Register" && from !== "Profile" && from !== "Document") {
        navigation.navigate("ImagePreview", {
          images: images,
        });
      }
      setSelectedImages(images);
    } catch (error) {
      console.error("Capture error:", error);
    } finally {
      setIsCapturing(false);
      setIsCameraVisible(false);
    }
  }, [navigation]);

  const handleRetake = useCallback(() => {
    setIsPreviewVisible(false);
    setSelectedImages("");

    if (previewSource === "camera") {
      setIsCameraVisible(true);
    }
  }, [previewSource]);

  const handleDocumentPick = useCallback(async (onClose?: () => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      onClose?.();

      const file = result.assets[0];
      const fileNameWithoutExt = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Document";

      navigation.navigate("SaveDocument", {
        images: file.uri,
        fileName: fileNameWithoutExt,
      });
    } catch (error) {
      console.error("Document pick error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick document.",
      });
    }
  }, [navigation]);

  return {
    // state
    selectedImages,
    isPreviewVisible,
    isCameraVisible,
    previewSource,
    isCapturing,

    // setters
    setIsCameraVisible,
    setIsPreviewVisible,
    setSelectedImages,

    // actions
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
    handleRetake,
    handleDocumentPick,
  };
};
