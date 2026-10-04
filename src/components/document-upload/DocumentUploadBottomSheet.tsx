import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Platform,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatSize = (bytes: number) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const safeDecode = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

const newId = () => Math.random().toString(36).substring(2, 10);

const buildFileFromAsset = (
  asset: DocumentPicker.DocumentPickerAsset,
  fallbackMime: string
): SelectedDocument =>
({
  id: newId(),
  uri: asset.uri,
  originalName: safeDecode(asset.name),
  displayName: safeDecode(asset.name).replace(/\.[^/.]+$/, ""),
  documentType: "Other Medical Document",
  mimeType: asset.mimeType || fallbackMime,
  size: asset.size || 0,
  validationStatus: "VALIDATING" as const,
} as SelectedDocument);

/* ------------------------------------------------------------------ */
/* Document row                                                        */
/* ------------------------------------------------------------------ */

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
  const ext = (file.originalName.split(".").pop() || "FILE").toUpperCase();
  const isPdf = ext === "PDF" || file.mimeType === "application/pdf";
  const isWord = ext === "DOC" || ext === "DOCX";
  const isImage =
    ["JPG", "JPEG", "PNG", "WEBP", "TIFF", "TIF"].includes(ext) ||
    file.mimeType.startsWith("image/");

  const isInvalid = file.validationStatus === "INVALID";
  const isValidating = file.validationStatus === "VALIDATING";
  const isReady = file.validationStatus === "READY";

  return (
    <DocRowCard isDark={isDark} isInvalid={isInvalid}>
      <CardTopRow>
        {isPdf ? (
          <MaterialCommunityIcons
            name="file-pdf-box"
            size={36}
            color="#ef4444"
            style={{ marginRight: 12 }}
          />
        ) : isImage && file.uri ? (
          <Image
            source={{ uri: file.uri }}
            style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }}
            resizeMode="cover"
          />
        ) : isWord ? (
          <MaterialCommunityIcons
            name="file-word-box"
            size={36}
            color="#2563eb"
            style={{ marginRight: 12 }}
          />
        ) : (
          <MaterialCommunityIcons
            name="file-document-outline"
            size={36}
            color="#64748b"
            style={{ marginRight: 12 }}
          />
        )}

        <DocInfoArea>
          <DocDisplayName isDark={isDark} numberOfLines={1}>
            {file.displayName || file.originalName}
          </DocDisplayName>
          <DocMetaText>
            {ext} • {formatSize(file.size)}
          </DocMetaText>

          {/* Status is inline so each row stays compact and more files fit on screen */}
          {isValidating && (
            <StatusInline>
              <ActivityIndicator
                size="small"
                color="#0d9488"
                style={{ marginRight: 4, transform: [{ scale: 0.7 }] }}
              />
              <StatusText color="#0d9488">Validating...</StatusText>
            </StatusInline>
          )}
          {isReady && (
            <StatusInline>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginRight: 4 }} />
              <StatusText color="#10b981">Ready to upload</StatusText>
            </StatusInline>
          )}
        </DocInfoArea>

        {!isUploading && (
          <RowActions>
            {isReady && (
              <IconButton
                onPress={onStartEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="edit-2" size={18} color="#64748b" />
              </IconButton>
            )}
            <RemoveActionBtn onPress={onRemove} isInvalid={isInvalid}>
              <RemoveActionText isInvalid={isInvalid}>Remove</RemoveActionText>
            </RemoveActionBtn>
          </RowActions>
        )}
      </CardTopRow>

      {isInvalid && (
        <InvalidContainer>
          <InvalidHeaderRow>
            <Ionicons name="close-circle" size={15} color="#ef4444" style={{ marginRight: 5 }} />
            <InvalidTitleText>{file.validationErrorTitle || "Invalid file"}</InvalidTitleText>
          </InvalidHeaderRow>
          <InvalidMessageText>
            {file.validationErrorMessage || "This file could not be validated."}
          </InvalidMessageText>
        </InvalidContainer>
      )}
    </DocRowCard>
  );
};

/* ------------------------------------------------------------------ */
/* Edit modal                                                          */
/* ------------------------------------------------------------------ */

interface EditDocumentModalProps {
  file: SelectedDocument; // parent renders this only when a file exists
  isDark: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const EditDocumentModal = ({ file, isDark, onClose, onSave }: EditDocumentModalProps) => {
  // Hooks always run in the same order (no early return before them)
  const [tempName, setTempName] = useState(file.displayName);
  const [nameError, setNameError] = useState<string | null>(null);

  const isPdf =
    file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ModalBackdrop onPress={onClose}>
          <ModalPressableContainer onPress={Keyboard.dismiss}>
            <ModalCard isDark={isDark}>
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

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1 }}
              >
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
                      style={{ width: "100%", height: 150, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  )}
                </PreviewWrapper>

                <FieldLabelText style={{ marginTop: 16 }}>Original File Name</FieldLabelText>
                <OriginalNameTextLine isDark={isDark} numberOfLines={1}>
                  {file.originalName}
                </OriginalNameTextLine>

                <FieldLabelText style={{ marginTop: 16 }}>Document Name *</FieldLabelText>
                <ModalInputWrapper
                  isDark={isDark}
                  style={{
                    borderColor: nameError
                      ? "#ef4444"
                      : isDark
                        ? "rgba(255,255,255,0.15)"
                        : "#cbd5e1",
                  }}
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
                    autoFocus
                    selectTextOnFocus
                  />
                  <ModalExtensionText isDark={isDark}>.{fileExtension}</ModalExtensionText>
                </ModalInputWrapper>
                {!!nameError && <ErrorText>{nameError}</ErrorText>}
              </ScrollView>

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
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Main bottom sheet                                                   */
/* ------------------------------------------------------------------ */

interface DocumentUploadBottomSheetProps {
  fromScreen?: string;
  onSuccess?: (jobIds: string[], filesInfo: any[]) => void;
  onUploadStart?: () => void;
  singleDocument?: boolean;
}

export const DocumentUploadBottomSheet = React.forwardRef(
  ({ fromScreen, onSuccess, onUploadStart, singleDocument }: DocumentUploadBottomSheetProps, ref: any) => {
    const { theme, isDark } = useAppTheme();
    const { userId } = useAuth();
    const navigation = useNavigation<any>();
    const cameraRef = useRef<any>(null);
    const listRef = useRef<any>(null);
    const prevCountRef = useRef(0);

    const isSingleDoc = Boolean(singleDocument || fromScreen === "Onboarding");

    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    /**
     * LAYOUT STRATEGY
     * - Header + Camera/Gallery/Files row: fixed (never scrolls)
     * - Document list: the ONLY scrollable part, capped to ~36% of screen height
     * - Summary + Upload button: always visible below the list
     */
    const listMaxHeight = Math.round(windowHeight * 0.36);
    const sheetMaxHeight = windowHeight - insets.top - 8;
    const bottomPadding = useBottomBarPadding(40, 30);

    const {
      selectedFiles,
      addSelectedFiles,
      removeSelectedFile,
      removeInvalidFiles,
      updateSelectedFile,
      clearSelectedFiles,
      startUpload,
      isUploading,
      uploadingDocs,
      setIsBottomSheetVisible,
    } = useDocumentUpload();

    const hasActiveProcessing =
      isUploading ||
      (uploadingDocs &&
        uploadingDocs.some(
          (d) =>
            d.status === "UPLOADING" ||
            d.status === "QUEUED" ||
            d.status === "PROCESSING" ||
            (d.progress !== undefined &&
              d.progress > 0 &&
              d.progress < 100 &&
              d.status !== "FAILED" &&
              d.status !== "REJECTED" &&
              d.status !== "COMPLETED"),
        ));

    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [uploadMessage] = useState("Uploading documents...");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sheetIndex, setSheetIndex] = useState(-1);

    // Scroll hint state
    const [listContentHeight, setListContentHeight] = useState(0);
    const [listAtEnd, setListAtEnd] = useState(true);

    const isListOverflowing = listContentHeight > listMaxHeight + 4;
    const showScrollHint = isListOverflowing && !listAtEnd;

    /* ---------- Android back button ---------- */
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

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [sheetIndex, isUploading]);

    /* ---------- Auto-scroll to newest file ---------- */
    useEffect(() => {
      if (selectedFiles.length > prevCountRef.current) {
        const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
        prevCountRef.current = selectedFiles.length;
        return () => clearTimeout(t);
      }
      prevCountRef.current = selectedFiles.length;
    }, [selectedFiles.length]);

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

    /* ---------- Pickers ---------- */
    const handleDocumentPickMultiple = async () => {
      if (hasActiveProcessing) {
        Toast.show({
          type: "info",
          position: "top",
          text1: "Processing in Progress",
          text2: "A document is currently being processed. Please wait for it to complete.",
        });
        return;
      }

      if (!isSingleDoc && selectedFiles.length >= 5) {
        Toast.show({
          type: "error",
          position: "top",
          text1: "Limit Exceeded",
          text2: "You can select up to 5 documents at a time.",
        });
        return;
      }

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["*/*"],
          multiple: !isSingleDoc,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) return;

        const files = result.assets.map((asset) =>
          buildFileFromAsset(asset, "application/octet-stream")
        );

        if (isSingleDoc) {
          const singleFile = files[0];
          if (!singleFile) return;
          clearSelectedFiles();
          addSelectedFiles([singleFile]);
          ref.current?.dismiss();
          if (onUploadStart) {
            onUploadStart();
          }
          if (userId) {
            startUpload(
              userId,
              fromScreen,
              (jobIds, filesInfo) => {
                if (onSuccess) {
                  onSuccess(jobIds, filesInfo);
                }
              },
              [singleFile],
            );
          }
        } else {
          addSelectedFiles(files);
        }
      } catch (err) {
        console.error("Error picking documents: ", err);
        Toast.show({
          type: "error",
          position: "top",
          text1: "Error",
          text2: "Failed to pick documents.",
        });
      }
    };

    const handleGalleryPickMultiple = async () => {
      if (hasActiveProcessing) {
        Toast.show({
          type: "info",
          position: "top",
          text1: "Processing in Progress",
          text2: "A document is currently being processed. Please wait for it to complete.",
        });
        return;
      }

      if (!isSingleDoc && selectedFiles.length >= 5) {
        Toast.show({
          type: "error",
          position: "top",
          text1: "Limit Exceeded",
          text2: "You can select up to 5 documents at a time.",
        });
        return;
      }

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "image/*",
          multiple: !isSingleDoc,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) return;

        const files = result.assets.map((asset) =>
          buildFileFromAsset(asset, "image/jpeg")
        );

        if (isSingleDoc) {
          const singleFile = files[0];
          if (!singleFile) return;
          clearSelectedFiles();
          addSelectedFiles([singleFile]);
          ref.current?.dismiss();
          if (onUploadStart) {
            onUploadStart();
          }
          if (userId) {
            startUpload(
              userId,
              fromScreen,
              (jobIds, filesInfo) => {
                if (onSuccess) {
                  onSuccess(jobIds, filesInfo);
                }
              },
              [singleFile],
            );
          }
        } else {
          addSelectedFiles(files);
        }
      } catch (err) {
        console.error("Error picking images: ", err);
        Toast.show({
          type: "error",
          position: "top",
          text1: "Error",
          text2: "Failed to pick images.",
        });
      }
    };

    const handleOpenCamera = async () => {
      if (hasActiveProcessing) {
        Toast.show({
          type: "info",
          position: "top",
          text1: "Processing in Progress",
          text2: "Documents are currently being processed. Please wait for it to complete.",
        });
        return;
      }

      if (!isSingleDoc && selectedFiles.length >= 5) {
        Toast.show({
          type: "error",
          position: "top",
          text1: "Limit Exceeded",
          text2: "You can select up to 5 documents at a time.",
        });
        return;
      }

      const currentPermission = await ImagePicker.getCameraPermissionsAsync();
      let permission = currentPermission;

      if (!currentPermission.granted) {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (permission.granted) {
        setIsCameraVisible(true);
      } else {
        Toast.show({
          type: "error",
          position: "top",
          text1: "Permission Denied",
          text2: permission.canAskAgain
            ? "Camera permission is required."
            : Platform.OS === "ios"
              ? "Please enable camera access from iPhone Settings."
              : "Please enable camera access from App Settings.",
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
          const singleFile: SelectedDocument = {
            id: newId(),
            uri: photoUri,
            originalName: fileName,
            displayName: fileName.replace(/\.[^/.]+$/, ""),
            documentType: "Other Medical Document",
            mimeType: "image/jpeg",
            size: 0,
            validationStatus: "VALIDATING" as const,
          };

          if (isSingleDoc) {
            clearSelectedFiles();
            addSelectedFiles([singleFile]);
            ref.current?.dismiss();
            if (onUploadStart) {
              onUploadStart();
            }
            if (userId) {
              startUpload(
                userId,
                fromScreen,
                (jobIds, filesInfo) => {
                  if (onSuccess) {
                    onSuccess(jobIds, filesInfo);
                  }
                },
                [singleFile],
              );
            }
          } else {
            addSelectedFiles([singleFile]);
          }
        }
      } catch (err) {
        console.error("Camera capture error:", err);
      } finally {
        setIsCapturing(false);
      }
    };

    /* ---------- Editing ---------- */
    const saveEditing = (fileId: string, newName: string) => {
      const file = selectedFiles.find((f) => f.id === fileId);
      if (file) {
        updateSelectedFile(fileId, newName, file.documentType || "Other Medical Document");
        setEditingId(null);
      }
    };

    /* ---------- Derived state ---------- */
    const validFiles = useMemo(
      () => selectedFiles.filter((f) => f.validationStatus === "READY"),
      [selectedFiles]
    );
    const invalidFiles = useMemo(
      () => selectedFiles.filter((f) => f.validationStatus === "INVALID"),
      [selectedFiles]
    );
    const validatingFiles = useMemo(
      () => selectedFiles.filter((f) => f.validationStatus === "VALIDATING"),
      [selectedFiles]
    );
    const totalValidSize = useMemo(
      () => validFiles.reduce((sum, f) => sum + (f.size || 0), 0),
      [validFiles]
    );

    const hasInvalid = invalidFiles.length > 0;
    const isValidatingAny = validatingFiles.length > 0;
    const uploadDisabled =
      isUploading || editingId !== null || validFiles.length === 0 || isValidatingAny;

    const editingFile = editingId
      ? selectedFiles.find((f) => f.id === editingId) || null
      : null;

    /* ---------- Upload ---------- */
    const handleUpload = async () => {
      if (!userId || validFiles.length === 0) return;
      if (hasActiveProcessing) {
        Toast.show({
          type: "info",
          position: "top",
          text1: "Processing in Progress",
          text2: "A document is currently being processed. Please wait for it to complete.",
        });
        return;
      }
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
              params: { jobIds, filesInfo, fromScreen },
            });
          } else {
            navigation.navigate("DocumentProcessing", { jobIds, filesInfo, fromScreen });
          }
        });
      } catch (err) {
        console.warn("Background upload starting error:", err);
      }
    };

    const handleDismiss = useCallback(() => {
      setSheetIndex(-1);
      setIsBottomSheetVisible(false);
      setEditingId(null);
      if (!isUploading) {
        clearSelectedFiles();
      }
    }, [isUploading, clearSelectedFiles, setIsBottomSheetVisible]);

    /* ---------- List scroll tracking ---------- */
    const handleListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const atEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - 8;
      setListAtEnd(atEnd);
    };

    const handleListContentSizeChange = (_w: number, h: number) => {
      setListContentHeight(h);
      if (h > listMaxHeight + 4) {
        setListAtEnd(false);
      } else {
        setListAtEnd(true);
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
              if (!isUploading) {
                clearSelectedFiles();
              }
            }
          }}
          onDismiss={handleDismiss}
          backdropComponent={renderBackdrop}
          enableDynamicSizing
          maxDynamicContentSize={sheetMaxHeight}
          topInset={insets.top}
          // Drag by the handle only, so swiping inside the list scrolls the list
          enableContentPanningGesture={false}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backgroundStyle={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            backgroundColor: theme.colors.surface,
          }}
          handleIndicatorStyle={{
            width: 40,
            height: 5,
            backgroundColor: theme.colors.bottomSheetBorder,
            borderRadius: 20,
          }}
        >
          <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: bottomPadding }}>
            {/* ===== FIXED: header ===== */}
            <HeaderSection>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <SheetTitle isDark={isDark}>Add Document</SheetTitle>
                <SheetSubtitle>
                  Select documents and edit metadata before starting processing.
                </SheetSubtitle>
              </View>
              <ModalCloseButton
                onPress={() => ref?.current?.dismiss()}
                disabled={isUploading}
              >
                <Ionicons name="close" size={24} color={isDark ? "#cbd5e1" : "#64748b"} />
              </ModalCloseButton>
            </HeaderSection>

            {/* ===== FIXED: Camera / Gallery / Files ===== */}
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

            {/* ===== SCROLLABLE: only the document list ===== */}
            {selectedFiles.length > 0 && (
              <SelectedSection>
                <SectionTitle isDark={isDark}>
                  Selected Documents ({selectedFiles.length})
                </SectionTitle>

                <GHScrollView
                  ref={listRef}
                  style={{ maxHeight: listMaxHeight, flexGrow: 0 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  scrollEventThrottle={16}
                  onScroll={handleListScroll}
                  onContentSizeChange={handleListContentSizeChange}
                  contentContainerStyle={{ paddingBottom: 2 }}
                >
                  {selectedFiles.map((file) => (
                    <DocumentRowItem
                      key={file.id}
                      file={file}
                      isUploading={isUploading}
                      isDark={isDark}
                      onStartEdit={() => setEditingId(file.id)}
                      onRemove={() => removeSelectedFile(file.id)}
                    />
                  ))}
                </GHScrollView>

                {/* Hint that more files are below */}
                {showScrollHint && (
                  <ScrollHintRow>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                    <ScrollHintText>Scroll to see all {selectedFiles.length} files</ScrollHintText>
                  </ScrollHintRow>
                )}
              </SelectedSection>
            )}

            {/* ===== FIXED: summary + upload button (always visible) ===== */}
            {selectedFiles.length > 0 && (
              <>
                {hasInvalid ? (
                  <SummaryContainer isDark={isDark}>
                    <SummaryTextSection>
                      <SummaryValidText>
                        {validFiles.length} file{validFiles.length !== 1 ? "s" : ""} ready to upload
                      </SummaryValidText>
                      <SummaryInvalidText>
                        {invalidFiles.length} file{invalidFiles.length !== 1 ? "s" : ""} need
                        {invalidFiles.length === 1 ? "s" : ""} attention
                      </SummaryInvalidText>
                      {isValidatingAny && (
                        <SummaryValidatingText>
                          ({validatingFiles.length} validating...)
                        </SummaryValidatingText>
                      )}
                    </SummaryTextSection>
                    <RemoveInvalidFilesButton
                      onPress={removeInvalidFiles}
                      disabled={isUploading}
                    >
                      <RemoveInvalidFilesText>Remove invalid files</RemoveInvalidFilesText>
                    </RemoveInvalidFilesButton>
                  </SummaryContainer>
                ) : (
                  validFiles.length > 0 && (
                    <TotalSummaryText>
                      {validFiles.length} file{validFiles.length !== 1 ? "s" : ""} •{" "}
                      {formatSize(totalValidSize)} total
                    </TotalSummaryText>
                  )
                )}

                <UploadButton
                  onPress={handleUpload}
                  disabled={uploadDisabled}
                  activeOpacity={0.8}
                  style={{ opacity: uploadDisabled ? 0.6 : 1 }}
                >
                  {isUploading ? (
                    <ButtonRow>
                      <ActivityIndicator color="white" size="small" />
                      <UploadButtonText>{uploadMessage}</UploadButtonText>
                    </ButtonRow>
                  ) : isValidatingAny ? (
                    <ButtonRow>
                      <ActivityIndicator color="white" size="small" />
                      <UploadButtonText>Validating Documents...</UploadButtonText>
                    </ButtonRow>
                  ) : (
                    <UploadButtonText>
                      {validFiles.length > 0
                        ? `Upload ${validFiles.length} File${validFiles.length !== 1 ? "s" : ""}`
                        : "No Valid Files"}
                    </UploadButtonText>
                  )}
                </UploadButton>
              </>
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

        {editingFile && (
          <EditDocumentModal
            file={editingFile}
            isDark={isDark}
            onClose={() => setEditingId(null)}
            onSave={(newName) => saveEditing(editingFile.id, newName)}
          />
        )}
      </>
    );
  }
);

/* ------------------------------------------------------------------ */
/* Styled components                                                   */
/* ------------------------------------------------------------------ */

const HeaderSection = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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
  margin-bottom: 16px;
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
  margin-top: 4px;
`;

const SectionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f1f5f9" : "#334155")};
  margin-bottom: 10px;
`;

const ScrollHintRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
`;

const ScrollHintText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-left: 4px;
`;

const DocRowCard = styled.View<{ isDark: boolean; isInvalid?: boolean }>`
  flex-direction: column;
  padding: 12px 14px;
  border-radius: 16px;
  background-color: ${({ isDark, isInvalid }: { isDark: boolean; isInvalid?: boolean }) =>
    isInvalid ? (isDark ? "rgba(239, 68, 68, 0.08)" : "#fef2f2") : isDark ? "#1e293b" : "#f8fafc"};
  border-width: 1px;
  border-color: ${({ isDark, isInvalid }: { isDark: boolean; isInvalid?: boolean }) =>
    isInvalid ? "#fca5a5" : isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"};
  margin-bottom: 8px;
`;

const CardTopRow = styled.View`
  flex-direction: row;
  align-items: center;
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

const StatusInline = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 4px;
`;

const StatusText = styled.Text<{ color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(props: { color: string }) => props.color};
`;

const RowActions = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconButton = styled.TouchableOpacity`
  padding: 6px;
`;

const RemoveActionBtn = styled.TouchableOpacity<{ isInvalid?: boolean }>`
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 8px;
  background-color: ${({ isInvalid }: { isInvalid?: boolean }) =>
    isInvalid ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.1)"};
  align-items: center;
  justify-content: center;
  margin-left: 8px;
`;

const RemoveActionText = styled.Text<{ isInvalid?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ isInvalid }: { isInvalid?: boolean }) => (isInvalid ? "#ef4444" : "#64748b")};
`;

const InvalidContainer = styled.View`
  margin-top: 8px;
  padding-top: 8px;
  border-top-width: 1px;
  border-top-color: rgba(239, 68, 68, 0.2);
`;

const InvalidHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const InvalidTitleText = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: #ef4444;
`;

const InvalidMessageText = styled.Text`
  font-size: 12px;
  color: #b91c1c;
  margin-top: 2px;
  line-height: 16px;
`;

const TotalSummaryText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-align: center;
  margin-top: 10px;
`;

const SummaryContainer = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(245, 158, 11, 0.1)" : "#fffbeb"};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(245, 158, 11, 0.25)" : "#fde68a"};
  margin-top: 10px;
`;

const SummaryTextSection = styled.View`
  flex: 1;
  margin-right: 10px;
`;

const SummaryValidText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #10b981;
`;

const SummaryInvalidText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  margin-top: 2px;
`;

const SummaryValidatingText = styled.Text`
  font-size: 11px;
  font-weight: 500;
  color: #0d9488;
  margin-top: 1px;
`;

const RemoveInvalidFilesButton = styled.TouchableOpacity`
  background-color: #ef4444;
  padding-horizontal: 10px;
  padding-vertical: 7px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
`;

const RemoveInvalidFilesText = styled.Text`
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #0d9488;
  height: 52px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  shadow-color: #0d9488;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 8px;
  elevation: 4;
`;

const ButtonRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
  max-height: 100%;
  justify-content: center;
  align-items: center;
`;

const ModalCard = styled.View<{ isDark: boolean }>`
  width: 100%;
  max-height: 100%;
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
  background-color: rgba(0, 0, 0, 0.02);
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
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"};
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
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"};
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
  margin-top: 16px;
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