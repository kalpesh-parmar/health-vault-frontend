import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  BackHandler,
} from "react-native";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Toast from "react-native-toast-message";

import { useDocumentUpload } from "../../context/DocumentUploadContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/ContextAPI";
import { useNavigation } from "@react-navigation/native";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import CameraModal from "../shared/CameraModal";
import { capturePhoto } from "../../services/cameraServices";
import { SelectedDocument } from "../../types/documentUpload";

interface DocumentRowItemProps {
  file: SelectedDocument;
  isUploading: boolean;
  isDark: boolean;
  onStartEdit: () => void;
  onRemove: () => void;
}

const DocumentRowItem = ({
  file,
  isUploading,
  isDark,
  onStartEdit,
  onRemove,
}: DocumentRowItemProps) => {
  const isPdf = file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DocRowCard isDark={isDark}>
      {isPdf ? (
        <MaterialCommunityIcons
          name="file-pdf-box"
          size={36}
          color="#ef4444"
          style={{ marginRight: 12 }}
        />
      ) : (
        <Image
          source={{ uri: file.uri }}
          style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }}
          resizeMode="cover"
        />
      )}
      <DocInfoArea style={{ flex: 1 }}>
        <DocDisplayName isDark={isDark} numberOfLines={1}>
          {file.displayName}
        </DocDisplayName>
        <DocMetaText>
          {file.documentType}
        </DocMetaText>
      </DocInfoArea>

      {!isUploading && (
        <RowActions>
          <IconButton onPress={onStartEdit}>
            <Feather name="edit-2" size={18} color="#64748b" />
          </IconButton>
          <IconButton onPress={onRemove} style={{ marginLeft: 8 }}>
            <Feather name="trash-2" size={18} color="#ef4444" />
          </IconButton>
        </RowActions>
      )}
    </DocRowCard>
  );
};

interface EditDocumentModalProps {
  file: SelectedDocument | null;
  isDark: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const EditDocumentModal = ({ file, isDark, onClose, onSave }: EditDocumentModalProps) => {
  if (!file) return null;

  const { theme } = useAppTheme();
  const [tempName, setTempName] = useState(file.displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isPdf = file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");
  const fileExtension = file.originalName.split(".").pop() || "jpg";

  const handleSave = () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      setNameError("Document name cannot be empty.");
      return;
    }
    onSave(trimmed);
  };

  return (
    <Modal
      visible={file !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <ModalBackdrop onPress={onClose}>
        <ModalPressableContainer onPress={Keyboard.dismiss}>
          <ModalCard isDark={isDark}>
            {/* Header Section */}
            <ModalHeaderRow>
              <ModalTitleSection>
                <ModalTitleText isDark={isDark}>Edit Document</ModalTitleText>
                <ModalSubtitleText>
                  Review the document and update the name if needed.
                </ModalSubtitleText>
              </ModalTitleSection>
              <ModalCloseButton onPress={onClose}>
                <Ionicons name="close" size={20} color={isDark ? "#cbd5e1" : "#64748b"} />
              </ModalCloseButton>
            </ModalHeaderRow>

            {/* Scrollable Form Content */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flexShrink: 1 }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight + 10 : 20,
                }}
              >
                {/* Document Preview */}
                <PreviewLabel>Document Preview</PreviewLabel>
                <PreviewWrapper isDark={isDark}>
                  {isPdf ? (
                    <PdfPreviewWrapper>
                      <MaterialCommunityIcons name="file-pdf-box" size={56} color="#ef4444" />
                      <PdfPreviewText isDark={isDark}>PDF Document</PdfPreviewText>
                    </PdfPreviewWrapper>
                  ) : (
                    <Image
                      source={{ uri: file.uri }}
                      style={{ width: "100%", height: 180, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  )}
                </PreviewWrapper>

                {/* Original File Name (Show in a line) */}
                <FieldLabelText style={{ marginTop: 16 }}>Original File Name</FieldLabelText>
                <OriginalNameTextLine isDark={isDark} numberOfLines={1}>
                  {file.originalName}
                </OriginalNameTextLine>

                {/* Editable Document Name */}
                <FieldLabelText style={{ marginTop: 16 }}>Document Name *</FieldLabelText>
                <ModalInputWrapper
                  isDark={isDark}
                  style={{ borderColor: nameError ? "#ef4444" : isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1" }}
                >
                  <ModalNameInput
                    value={tempName}
                    onChangeText={(text: string) => {
                      setTempName(text);
                      if (text.trim()) setNameError(null);
                    }}
                    placeholder="Enter document name"
                    placeholderTextColor="#94a3b8"
                    isDark={isDark}
                  />
                  <ModalExtensionText isDark={isDark}>.{fileExtension}</ModalExtensionText>
                </ModalInputWrapper>
                {nameError && <ErrorText>{nameError}</ErrorText>}
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Action Buttons */}
            <ModalFooterButtons>
              <DiscardButton onPress={onClose}>
                <DiscardButtonText>Discard</DiscardButtonText>
              </DiscardButton>

              <SaveButton onPress={handleSave}>
                <SaveButtonText>Save</SaveButtonText>
              </SaveButton>
            </ModalFooterButtons>
          </ModalCard>
        </ModalPressableContainer>
      </ModalBackdrop>
    </Modal>
  );
};

interface DocumentUploadBottomSheetProps {
  fromScreen?: string;
  onSuccess?: (jobIds: string[], filesInfo: any[]) => void;
  onUploadStart?: () => void;
}

export const DocumentUploadBottomSheet = React.forwardRef(({ fromScreen, onSuccess, onUploadStart }: DocumentUploadBottomSheetProps, ref: any) => {
  const { theme, isDark } = useAppTheme();
  const { userId } = useAuth();
  const navigation = useNavigation<any>();
  const cameraRef = useRef<any>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // In v5, dynamic sizing is handled natively by enableDynamicSizing={true} prop

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPadding = useBottomBarPadding(40, 30);
  const totalBottomPadding = keyboardHeight > 0 ? keyboardHeight + 80 : bottomPadding;

  const {
    selectedFiles,
    addSelectedFiles,
    removeSelectedFile,
    updateSelectedFile,
    startUpload,
    isUploading,
    isBottomSheetVisible,
    setIsBottomSheetVisible,
  } = useDocumentUpload();

  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("Uploading documents...");

  // Editing file states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(-1);

  useEffect(() => {
    const onBackPress = () => {
      if (sheetIndex >= 0) {
        if (!isUploading) {
          ref.current?.dismiss();
        }
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => subscription.remove();
  }, [sheetIndex, isUploading]);


  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDocumentPickMultiple = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const files = result.assets.map((asset) => {
        let decName = asset.name;
        try {
          decName = decodeURIComponent(asset.name);
        } catch (e) {}

        return {
          id: Math.random().toString(36).substring(7),
          uri: asset.uri,
          originalName: decName,
          displayName: decName.replace(/\.[^/.]+$/, ""),
          documentType: "Other Medical Document",
          mimeType: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        };
      });

      addSelectedFiles(files);
    } catch (err) {
      console.error("Error picking documents: ", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick documents.",
      });
    }
  };

  const handleGalleryPickMultiple = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Please grant gallery permission in settings.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const files = result.assets.map((asset, index) => {
        const fileUri = asset.uri;
        const uriParts = fileUri.split("/");
        let fileName = asset.fileName || uriParts[uriParts.length - 1] || `image_${index + 1}.jpg`;
        try {
          fileName = decodeURIComponent(fileName);
        } catch (e) {}

        return {
          id: Math.random().toString(36).substring(7),
          uri: fileUri,
          originalName: fileName,
          displayName: fileName.replace(/\.[^/.]+$/, ""),
          documentType: "Other Medical Document",
          mimeType: asset.mimeType || "image/jpeg",
          size: (asset as any).fileSize || 0,
        };
      });

      addSelectedFiles(files);
    } catch (err) {
      console.error("Error picking images: ", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick images.",
      });
    }
  };

  const handleOpenCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      setIsCameraVisible(true);
    } else {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Camera permission is required.",
      });
    }
  };

  const handleCapturePhoto = async (refCamera: React.RefObject<any>) => {
    if (!refCamera.current) return;
    setIsCapturing(true);
    try {
      const photoUri = await capturePhoto(refCamera);
      if (photoUri) {
        setIsCameraVisible(false);
        const fileName = `camera_capture_${Date.now()}.jpg`;
        addSelectedFiles([
          {
            id: Math.random().toString(36).substring(7),
            uri: photoUri,
            originalName: fileName,
            displayName: fileName.replace(/\.[^/.]+$/, ""),
            documentType: "Other Medical Document",
            mimeType: "image/jpeg",
            size: 0,
          },
        ]);
      }
    } catch (err) {
      console.error("Camera capture error:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  const startEditing = (file: SelectedDocument) => {
    setEditingId(file.id);
  };

  const saveEditing = (fileId: string, newName: string) => {
    const file = selectedFiles.find((f) => f.id === fileId);
    if (file) {
      updateSelectedFile(fileId, newName, file.documentType);
      setEditingId(null);
    }
  };

  const handleUpload = async () => {
    if (!userId) return;
    ref.current?.dismiss();
    if (onUploadStart) {
      onUploadStart();
    }
    try {
      await startUpload(userId, fromScreen, (jobIds, filesInfo) => {
        if (onSuccess) {
          onSuccess(jobIds, filesInfo);
          return;
        }
        if (fromScreen === "AIChat" || fromScreen === "AIChatScreen") {
          navigation.navigate("Home", {
            screen: "DocumentProcessing",
            params: {
              jobIds,
              filesInfo,
              fromScreen,
            },
          });
        } else {
          navigation.navigate("DocumentProcessing", {
            jobIds,
            filesInfo,
            fromScreen,
          });
        }
      });
    } catch (err) {
      console.warn("Background upload starting error:", err);
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose={!isUploading}
        onChange={(index) => {
          setSheetIndex(index);
          setIsBottomSheetVisible(index >= 0);
          if (index === -1) {
            setEditingId(null);
          }
        }}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={true}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          backgroundColor: theme.colors.surface,
          paddingBottom: bottomPadding,
        }}
        handleIndicatorStyle={{
          width: 40,
          height: 5,
          backgroundColor: theme.colors.bottomSheetBorder,
          borderRadius: 20,
        }}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: bottomPadding }}>
          {/* Header Section & Upload Options - FIXED */}
          <HeaderSection>
            <SheetTitle isDark={isDark}>Add Document</SheetTitle>
            <SheetSubtitle>Select documents and edit metadata before starting processing.</SheetSubtitle>
          </HeaderSection>

          {/* Document selection options - FIXED */}
          <OptionsRow style={{ opacity: isUploading ? 0.5 : 1 }}>
            <OptionItem onPress={handleOpenCamera} disabled={isUploading}>
              <IconCircle bgColor="#f5f3ff">
                <MaterialCommunityIcons name="camera-outline" size={24} color="#7c3aed" />
              </IconCircle>
              <OptionLabel isDark={isDark}>Camera</OptionLabel>
            </OptionItem>

            <OptionItem onPress={handleGalleryPickMultiple} disabled={isUploading}>
              <IconCircle bgColor="#fff1f2">
                <MaterialCommunityIcons name="image-outline" size={24} color="#f43f5e" />
              </IconCircle>
              <OptionLabel isDark={isDark}>Gallery</OptionLabel>
            </OptionItem>

            <OptionItem onPress={handleDocumentPickMultiple} disabled={isUploading}>
              <IconCircle bgColor="#f0fdfa">
                <MaterialCommunityIcons name="file-document-outline" size={24} color="#0d9488" />
              </IconCircle>
              <OptionLabel isDark={isDark}>Files</OptionLabel>
            </OptionItem>
          </OptionsRow>

          {/* Selected documents list - SCROLLABLE */}
          {selectedFiles.length > 0 && (
            <SelectedSection>
              <SectionTitle isDark={isDark}>Selected Documents ({selectedFiles.length})</SectionTitle>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: totalBottomPadding }}
              >
                {selectedFiles.map((file) => {
                  return (
                    <DocumentRowItem
                      key={file.id}
                      file={file}
                      isUploading={isUploading}
                      isDark={isDark}
                      onStartEdit={() => startEditing(file)}
                      onRemove={() => removeSelectedFile(file.id)}
                    />
                  );
                })}
              </ScrollView>
            </SelectedSection>
          )}

          {/* Bottom actions - FIXED */}
          {selectedFiles.length > 0 && (
            <UploadButton
              onPress={handleUpload}
              disabled={isUploading || editingId !== null}
              activeOpacity={0.8}
              style={{ opacity: isUploading || editingId !== null ? 0.6 : 1 }}
            >
              {isUploading ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <ActivityIndicator color="white" size="small" />
                  <UploadButtonText>{uploadMessage}</UploadButtonText>
                </View>
              ) : (
                <UploadButtonText>Upload Files</UploadButtonText>
              )}
            </UploadButton>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => handleCapturePhoto(cameraRef)}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      {editingId !== null && (
        <EditDocumentModal
          file={selectedFiles.find((f) => f.id === editingId) || null}
          isDark={isDark}
          onClose={() => setEditingId(null)}
          onSave={(newName) => saveEditing(editingId, newName)}
        />
      )}
    </>
  );
});

/* --- Styled Components --- */

const HeaderSection = styled.View`
  margin-bottom: 20px;
`;

const SheetTitle = styled.Text<{ isDark: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f8fafc" : "#1e293b")};
`;

const SheetSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const OptionsRow = styled.View`
  flex-direction: row;
  justify-content: space-around;
  margin-bottom: 20px;
  background-color: ${Platform.OS === "ios" ? "transparent" : "rgba(0,0,0,0.02)"};
  padding: 10px;
  border-radius: 16px;
`;

const OptionItem = styled.TouchableOpacity`
  align-items: center;
  flex: 1;
`;

const IconCircle = styled.View<{ bgColor: string }>`
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background-color: ${(props: { bgColor: string }) => props.bgColor};
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
`;

const OptionLabel = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#475569")};
`;

const SelectedSection = styled.View`
  margin-top: 10px;
`;

const SectionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f1f5f9" : "#334155")};
  margin-bottom: 12px;
`;

const DocRowCard = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  border-radius: 16px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#f8fafc")};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0")};
  margin-bottom: 8px;
`;

const DocInfoArea = styled.View`
  flex: 1;
`;

const DocDisplayName = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const DocMetaText = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const RowActions = styled.View`
  flex-direction: row;
`;

const IconButton = styled.TouchableOpacity`
  padding: 6px;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #0d9488;
  height: 52px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 10px;
  shadow-color: #0d9488;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 8px;
  elevation: 4;
`;

const UploadButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 700;
`;

const ModalBackdrop = styled.Pressable`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalPressableContainer = styled.Pressable`
  width: 100%;
  max-width: 400px;
  justify-content: center;
  align-items: center;
`;

const ModalCard = styled.View<{ isDark: boolean }>`
  width: 100%;
  max-height: 98%;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#ffffff")};
  border-radius: 24px;
  padding: 24px;
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.25;
  shadow-radius: 15px;
  elevation: 10;
`;

const ModalHeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const ModalTitleSection = styled.View`
  flex: 1;
  margin-right: 12px;
`;

const ModalTitleText = styled.Text<{ isDark: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f8fafc" : "#1e293b")};
`;

const ModalSubtitleText = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  line-height: 18px;
`;

const ModalCloseButton = styled.TouchableOpacity`
  padding: 4px;
  background-color: rgba(0,0,0,0.02);
  border-radius: 20px;
`;

const PreviewLabel = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const PreviewWrapper = styled.View<{ isDark: boolean }>`
  width: 100%;
  height: 160px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#0f172a" : "#f1f5f9")};
  overflow: hidden;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0")};
`;

const PdfPreviewWrapper = styled.View`
  align-items: center;
  justify-content: center;
`;

const PdfPreviewText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#475569")};
  margin-top: 8px;
`;

const FieldLabelText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const OriginalNameTextLine = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#475569")};
  font-weight: 500;
  margin-bottom: 4px;
`;

const ModalInputWrapper = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1")};
  border-radius: 12px;
  padding-horizontal: 14px;
  height: 48px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#0f172a" : "#ffffff")};
`;

const ModalNameInput = styled.TextInput<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
  flex: 1;
  padding: 0;
  margin: 0;
`;

const ModalExtensionText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  margin-left: 4px;
`;

const ErrorText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
`;

const ModalFooterButtons = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
  gap: 12px;
`;

const DiscardButton = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border-width: 1px;
  border-color: #cbd5e1;
  align-items: center;
  justify-content: center;
  background-color: transparent;
`;

const DiscardButtonText = styled.Text`
  font-size: 14px;
  color: #64748b;
  font-weight: 700;
`;

const SaveButton = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  border-radius: 12px;
  background-color: #0d9488;
  align-items: center;
  justify-content: center;
`;

const SaveButtonText = styled.Text`
  font-size: 14px;
  color: white;
  font-weight: 700;
`;
