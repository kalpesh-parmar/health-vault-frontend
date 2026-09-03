import { useState, useCallback } from "react";
import Toast from "react-native-toast-message";
import { Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  requestGalleryPermission,
  openGalleryAsset,
} from "../services/mediaServices";

import {
  requestCameraPermission,
  capturePhoto,
} from "../services/cameraServices";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import { isValidMedicalDocument } from "../utils/documentValidator";

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const ALLOWED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
];

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

export const useDocumentMedia = () => {
  const [selectedImages, setSelectedImages] = useState<string>("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [previewSource, setPreviewSource] = useState<
    "camera" | "gallery" | null
  >(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const validateFile = (file: { name: string; mimeType?: string; size?: number }) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const mime = file.mimeType?.toLowerCase() || "";
    const isAllowedExt = ["pdf", "png", "jpeg", "jpg", "webp", "tiff"].includes(ext || "");
    const isAllowedMime = ALLOWED_MIMES.some((m) => mime.includes(m.split("/")[1]));

    if (!isAllowedExt && !isAllowedMime) {
      return `File "${file.name}" has invalid format. Only PDF, PNG, JPEG, WEBP, and TIFF files are supported.`;
    }

    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" exceeds the maximum size limit of 150MB.`;
    }

    return null;
  };

  const handleMultiDocumentPick = useCallback(
    async (existingCount = 0): Promise<PickedFile[]> => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ALLOWED_MIMES,
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return [];
        }

        if (existingCount + result.assets.length > 5) {
          Toast.show({
            type: "error",
            text1: "Limit Exceeded",
            text2: "You can upload a maximum of 5 files at a time.",
          });
          return [];
        }

        const validFiles: PickedFile[] = [];

        for (const file of result.assets) {
          const errorMsg = validateFile({
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
          });

          if (errorMsg) {
            Toast.show({
              type: "error",
              text1: "Invalid File",
              text2: errorMsg,
            });
            return [];
          }

          let mimeType = file.mimeType || "application/octet-stream";
          if (!file.mimeType || file.mimeType === "application/octet-stream") {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (ext === "pdf") mimeType = "application/pdf";
            else if (ext === "png") mimeType = "image/png";
            else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
            else if (ext === "webp") mimeType = "image/webp";
            else if (ext === "tiff") mimeType = "image/tiff";
          }

          validFiles.push({
            uri: file.uri,
            name: file.name,
            type: mimeType,
            size: file.size || 0,
          });
        }

        return validFiles;
      } catch (error) {
        console.error("Multi document pick error:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to pick documents.",
        });
        return [];
      }
    },
    [],
  );

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

    const images = await openGalleryAsset();
    if (!images) return;

    onClose?.();

    setIsProcessing(true);
    try {
      if (from !== "Register" && from !== "Profile") {
        const isValid = await isValidMedicalDocument(images.uri, false);
        if (!isValid) {
          Toast.show({
            type: "error",
            text1: "Invalid Document",
            text2: "Please select a valid medical document.",
          });
          return;
        }
      }

      const fileNameWithoutExt = images.fileName ? images.fileName.replace(/\.[^/.]+$/, "") : "Document";

      setPreviewSource("gallery");
      setSelectedImages(images.uri);
      if (from !== "Register" && from !== "Profile" && from !== "Document") {
        navigation.navigate("ImagePreview", {
          images: images.uri,
          fileName: fileNameWithoutExt,
        });
      }
    } finally {
      setIsProcessing(false);
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

      setIsCameraVisible(false);
      setIsProcessing(true);

      if (from !== "Register" && from !== "Profile") {
        const isValid = await isValidMedicalDocument(images, false);
        if (!isValid) {
          Toast.show({
            type: "error",
            text1: "Invalid Document",
            text2: "Please capture a valid medical document.",
          });
          return;
        }
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
      setIsProcessing(false);
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
      
      setIsProcessing(true);
      try {
        const isValid = await isValidMedicalDocument(file.uri, true);
        if (!isValid) {
          Toast.show({
            type: "error",
            text1: "Invalid Document",
            text2: "Please select a valid medical PDF document.",
          });
          return;
        }

        const fileNameWithoutExt = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Document";

        navigation.navigate("SaveDocument", {
          images: file.uri,
          fileName: fileNameWithoutExt,
        });
      } finally {
        setIsProcessing(false);
      }
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
    isProcessing,

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
    handleMultiDocumentPick,
  };
};
