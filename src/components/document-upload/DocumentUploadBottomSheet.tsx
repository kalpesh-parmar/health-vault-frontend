import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
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
import { SelectedDocument, DOCUMENT_TYPE_OPTIONS } from "../../types/documentUpload";

interface EditFileCardProps {
  file: SelectedDocument;
  isDark: boolean;
  onCancel: () => void;
  onSave: (newName: string) => void;
}

const EditFileCard = ({ file, isDark, onCancel, onSave }: EditFileCardProps) => {
  const [editName, setEditName] = useState(file.displayName);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setNameError("Document name cannot be empty.");
      return;
    }
    onSave(trimmed);
  };

  return (
    <EditFormCard isDark={isDark}>
      <LabelText>Original File Name</LabelText>
      <OriginalNameText isDark={isDark} numberOfLines={1}>
        {file.originalName}
      </OriginalNameText>

      <LabelText style={{ marginTop: 12 }}>Document Name</LabelText>
      <InputWrapper style={{ borderColor: nameError ? "#ef4444" : "#cbd5e1" }}>
        <NameInput
          value={editName}
          onChangeText={(text: string) => {
            setEditName(text);
            if (!text.trim()) {
              setNameError("Document name cannot be empty.");
            } else {
              setNameError(null);
            }
          }}
          placeholder="Enter document name"
          placeholderTextColor="#94a3b8"
          isDark={isDark}
        />
      </InputWrapper>
      {nameError ? (
        <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4, fontWeight: "500" }}>
          {nameError}
        </Text>
      ) : null}

      <ActionButtonsRow>
        <CancelEditBtn onPress={onCancel}>
          <CancelEditBtnText>Cancel</CancelEditBtnText>
        </CancelEditBtn>

        <SaveEditBtn onPress={handleSave}>
          <Ionicons name="save-outline" size={16} color="white" style={{ marginRight: 6 }} />
          <SaveEditBtnText>Save</SaveEditBtnText>
        </SaveEditBtn>
      </ActionButtonsRow>
    </EditFormCard>
  );
};

interface DocumentUploadBottomSheetProps {
  fromScreen?: string;
}

export const DocumentUploadBottomSheet = React.forwardRef(({ fromScreen }: DocumentUploadBottomSheetProps, ref: any) => {
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
  const totalBottomPadding = keyboardHeight > 0
    ? keyboardHeight + 140
    : bottomPadding;

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
    setUploadMessage("Uploading documents...");

    const messages = [
      "Starting OCR parsing...",
      "Analyzing document structure...",
      "Preparing secure processing...",
      "Finishing setup..."
    ];
    let msgIdx = 0;
    const intervalId = setInterval(() => {
      if (msgIdx < messages.length) {
        setUploadMessage(messages[msgIdx]);
        msgIdx++;
      }
    }, 2000);

    try {
      await startUpload(userId, fromScreen, (jobIds, filesInfo) => {
        clearInterval(intervalId);
        ref.current?.dismiss();
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
      clearInterval(intervalId);
    } finally {
      clearInterval(intervalId);
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose={!isUploading}
        onChange={(index) => {
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
          paddingBottom: 15,
        }}
        handleIndicatorStyle={{
          width: 40,
          height: 5,
          backgroundColor: theme.colors.bottomSheetBorder,
          borderRadius: 20,
        }}
      >
        <BottomSheetView style={{ maxHeight: 750 }}>
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: totalBottomPadding }}
          >
          {/* Header Section & Upload Options */}
          <HeaderSection>
            <SheetTitle isDark={isDark}>Add Document</SheetTitle>
            <SheetSubtitle>Select documents and edit metadata before starting processing.</SheetSubtitle>
          </HeaderSection>

          {/* Document selection options - Disabled when uploading */}
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

          {/* Selected documents list */}
          {selectedFiles.length > 0 && (
            <SelectedSection>
              <SectionTitle isDark={isDark}>Selected Documents ({selectedFiles.length})</SectionTitle>
              {selectedFiles.map((file) => {
                const isEditing = editingId === file.id;
                const isPdf = file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");

                if (isEditing) {
                  return (
                    <EditFileCard
                      key={file.id}
                      file={file}
                      isDark={isDark}
                      onCancel={() => setEditingId(null)}
                      onSave={(newName) => saveEditing(file.id, newName)}
                    />
                  );
                }

                return (
                  <DocRowCard key={file.id} isDark={isDark}>
                    <MaterialCommunityIcons
                      name={isPdf ? "file-pdf-box" : "image"}
                      size={28}
                      color={isPdf ? "#ef4444" : "#3b82f6"}
                      style={{ marginRight: 12 }}
                    />
                    <DocInfoArea>
                      <DocDisplayName isDark={isDark} numberOfLines={1}>
                        {file.displayName}
                      </DocDisplayName>
                      <DocMetaText>
                        Type: {file.documentType}
                      </DocMetaText>
                    </DocInfoArea>

                    {/* Row actions are hidden when uploading to prevent manipulation */}
                    {!isUploading && (
                      <RowActions>
                        <IconButton onPress={() => startEditing(file)}>
                          <Feather name="edit-2" size={18} color="#64748b" />
                        </IconButton>
                        <IconButton onPress={() => removeSelectedFile(file.id)} style={{ marginLeft: 8 }}>
                          <Feather name="trash-2" size={18} color="#ef4444" />
                        </IconButton>
                      </RowActions>
                    )}
                  </DocRowCard>
                );
              })}
            </SelectedSection>
          )}

          {/* Bottom actions */}
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
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={() => handleCapturePhoto(cameraRef)}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />
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

const EditFormCard = styled.View<{ isDark: boolean }>`
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#ffffff")};
  border-width: 1.5px;
  border-color: #0d9488;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 10px;
`;

const LabelText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const OriginalNameText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#94a3b8" : "#475569")};
  font-style: italic;
`;

const InputWrapper = styled.View`
  height: 48px;
  border-width: 1px;
  border-color: #cbd5e1;
  border-radius: 10px;
  padding-horizontal: 12px;
  justify-content: center;
`;

const NameInput = styled.TextInput<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const DropdownSelector = styled.TouchableOpacity<{ isDark: boolean }>`
  height: 48px;
  border-width: 1px;
  border-color: #cbd5e1;
  border-radius: 10px;
  padding-horizontal: 12px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#ffffff")};
`;

const DropdownSelectorText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const DropdownList = styled.View<{ isDark: boolean }>`
  border-width: 1px;
  border-color: #e2e8f0;
  border-radius: 10px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#ffffff")};
  margin-top: 4px;
  max-height: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.TouchableOpacity<{ isDark: boolean }>`
  padding: 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9")};
`;

const DropdownItemText = styled.Text<{ isDark: boolean; active: boolean }>`
  font-size: 13.5px;
  color: ${({ active, isDark }: { active: boolean; isDark: boolean }) => (active ? "#0d9488" : isDark ? "#cbd5e1" : "#475569")};
  font-weight: ${({ active }: { active: boolean }) => (active ? "700" : "500")};
`;

const ActionButtonsRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 12px;
`;

const CancelEditBtn = styled.TouchableOpacity`
  padding-vertical: 8px;
  padding-horizontal: 16px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #cbd5e1;
`;

const CancelEditBtnText = styled.Text`
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
`;

const SaveEditBtn = styled.TouchableOpacity`
  padding-vertical: 8px;
  padding-horizontal: 16px;
  border-radius: 8px;
  background-color: #0d9488;
  flex-direction: row;
  align-items: center;
`;

const SaveEditBtnText = styled.Text`
  font-size: 13px;
  color: white;
  font-weight: 600;
`;
