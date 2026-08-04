import React, { forwardRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getFileSource } from "../../services/fileService";
import { createShareLink, ShareLinkResponse } from "../../services/documentService";
import { getFileExtension } from "../../utils/fileUtils";
import Toast from "react-native-toast-message";
import type { MedicalDocument } from "../../types";

interface ShareDocumentSheetProps {
  document: MedicalDocument | null;
  onLinkCreated?: (newLink: ShareLinkResponse) => void;
  onClose: () => void;
}

export const ShareDocumentSheet = forwardRef<any, ShareDocumentSheetProps>(
  ({ document, onLinkCreated, onClose }, ref: any) => {
    const { theme, isDark } = useAppTheme();
    const bottomPadding = useBottomBarPadding(24, 8);

    const [isPreparing, setIsPreparing] = useState(false);
    const [preparingText, setPreparingText] = useState("");
    const [showLinkConfig, setShowLinkConfig] = useState(false);
    const [selectedExpiry, setSelectedExpiry] = useState<number>(24); // default 24 hours
    const [generatedLink, setGeneratedLink] = useState<ShareLinkResponse | null>(null);
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Keyboard handling
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

    useEffect(() => {
      if (document) {
        setIsPreparing(false);
        setPreparingText("");
        setShowLinkConfig(false);
        setGeneratedLink(null);
        setIsCreatingLink(false);
        setApiError(null);
      }
    }, [document]);

    // Format file size
    const formattedSize = document?.fileSize
      ? document.fileSize >= 1024 * 1024
        ? (document.fileSize / (1024 * 1024)).toFixed(1) + " MB"
        : (document.fileSize / 1024).toFixed(1) + " KB"
      : "N/A";

    const getFileMimeType = (fileName: string) => {
      const ext = getFileExtension(fileName).toLowerCase();
      if (ext === "pdf") return "application/pdf";
      if (ext === "png") return "image/png";
      return "image/jpeg";
    };

    // A. Share File Functionality
    const handleShareFile = async () => {
      if (isPreparing || !document) return;
      setIsPreparing(true);
      setPreparingText("Downloading file securely...");
      setApiError(null);

      try {
        const fileSource = await getFileSource(document.s3Key || "");
        if (!fileSource) {
          throw new Error("Unable to resolve file location source.");
        }

        const extension = getFileExtension(document.fileName) || "jpg";
        const cleanName = document.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const localUri = `${FileSystem.cacheDirectory}${cleanName}`;

        const downloadResult = await FileSystem.downloadAsync(
          fileSource.uri,
          localUri,
          { headers: fileSource.headers }
        );

        if (downloadResult.status !== 200) {
          throw new Error("Secure download failed with status " + downloadResult.status);
        }

        setIsPreparing(false);
        setPreparingText("");

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (!isSharingAvailable) {
          Alert.alert("Sharing Not Supported", "Sharing is not supported on this device.");
          return;
        }

        Toast.show({
          type: "info",
          text1: "Sharing Document",
          text2: "Preparing native system sharing sheet...",
        });

        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: getFileMimeType(document.fileName),
          dialogTitle: `Share ${document.fileName}`,
        });

        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        onClose();
      } catch (error: any) {
        console.error("Error sharing file:", error);
        setApiError(error.message || "We couldn't prepare this document for sharing.");
        setIsPreparing(false);
        setPreparingText("");
      }
    };

    // B. Share Link Functionality
    const handleCreateLink = async () => {
      if (isCreatingLink || !document) return;
      setIsCreatingLink(true);
      setApiError(null);

      try {
        const response = await createShareLink(document.id, selectedExpiry);
        if (response.status.success && response.data) {
          setGeneratedLink(response.data);
          if (onLinkCreated) {
            onLinkCreated(response.data);
          }
          Toast.show({
            type: "success",
            text1: "Secure Link Created",
            text2: `Valid for next ${selectedExpiry} hours`,
          });
        } else {
          throw new Error("Failed to generate secure link.");
        }
      } catch (error: any) {
        console.error("Error creating share link:", error);
        setApiError(error.message || "Failed to generate temporary sharing URL.");
      } finally {
        setIsCreatingLink(false);
      }
    };

    const handleCopyLink = () => {
      if (!generatedLink) return;
      Clipboard.setString(generatedLink.shareUrl);
      Toast.show({
        type: "success",
        text1: "Link Copied",
        text2: "Sharing link copied to clipboard successfully.",
      });
    };

    const handleShareLinkDirectly = async () => {
      if (!generatedLink) return;
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(generatedLink.shareUrl, {
          dialogTitle: "Share Secure Link",
        });
      } else {
        Clipboard.setString(generatedLink.shareUrl);
        Alert.alert("Link Copied", "Sharing link copied to clipboard.");
      }
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      ),
      []
    );

    const totalBottomPadding = keyboardHeight > 0 ? keyboardHeight + 16 : bottomPadding;

    if (!document) {
      return (
        <BottomSheetModal
          ref={ref}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          enableDynamicSizing={true}
          backgroundStyle={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: theme.colors.surface,
          }}
          handleIndicatorStyle={{
            width: 40,
            height: 5,
            backgroundColor: theme.colors.bottomSheetBorder,
            borderRadius: 20,
          }}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: totalBottomPadding,
              paddingTop: 16,
            }}
          >
            <HeaderSection>
              <SheetTitle isDark={isDark}>Share Document</SheetTitle>
              <SheetSubtitle>Choose how you'd like to share this document</SheetSubtitle>
            </HeaderSection>
            <LoadingOverlay>
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </LoadingOverlay>
          </BottomSheetScrollView>
        </BottomSheetModal>
      );
    }

    return (
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: theme.colors.surface,
        }}
        handleIndicatorStyle={{
          width: 40,
          height: 5,
          backgroundColor: theme.colors.bottomSheetBorder,
          borderRadius: 20,
        }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: totalBottomPadding,
            paddingTop: 16,
          }}
        >
          <HeaderSection>
            <SheetTitle isDark={isDark}>Share Document</SheetTitle>
            <SheetSubtitle>Choose how you'd like to share this document</SheetSubtitle>
          </HeaderSection>

          <PreviewCard isDark={isDark} style={{ borderColor: theme.colors.border }}>
            <DocIconBox ext={getFileExtension(document.fileName)}>
              <MaterialCommunityIcons
                name={getFileExtension(document.fileName) === "pdf" ? "file-pdf-box" : "file-image-outline"}
                size={32}
                color={getFileExtension(document.fileName) === "pdf" ? "#ef4444" : "#3b82f6"}
              />
            </DocIconBox>
            <DocMetaTextWrapper>
              <DocName isDark={isDark} numberOfLines={1}>
                {document.fileName}
              </DocName>
              <DocDetailsText>
                {String(getFileExtension(document.fileName)).toUpperCase()} • {formattedSize}
              </DocDetailsText>
            </DocMetaTextWrapper>
          </PreviewCard>

          {isPreparing && (
            <LoadingOverlay>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <LoadingText>{preparingText}</LoadingText>
            </LoadingOverlay>
          )}

          {apiError && (
            <ErrorBox>
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              <ErrorText>{apiError}</ErrorText>
              <TouchableOpacity onPress={handleShareFile} style={{ marginLeft: "auto" }}>
                <RetryText>Retry</RetryText>
              </TouchableOpacity>
            </ErrorBox>
          )}

          {!isPreparing && !showLinkConfig && !generatedLink && (
            <OptionsList>
              <LabelText>Share Methods</LabelText>

              <OptionItemButton onPress={handleShareFile} isDark={isDark} style={{ borderColor: theme.colors.border }}>
                <IconWrapper style={{ backgroundColor: "#e0f2fe" }}>
                  <Feather name="share-2" size={20} color="#0284c7" />
                </IconWrapper>
                <OptionTextWrapper>
                  <OptionTitle isDark={isDark}>Share File</OptionTitle>
                  <OptionSubtitle>Share the actual document file securely</OptionSubtitle>
                </OptionTextWrapper>
                <Feather name="chevron-right" size={18} color="#94a3b8" />
              </OptionItemButton>

              <OptionItemButton
                onPress={() => setShowLinkConfig(true)}
                isDark={isDark}
                style={{ borderColor: theme.colors.border, marginTop: 12 }}
              >
                <IconWrapper style={{ backgroundColor: "#ecfdf5" }}>
                  <Feather name="link" size={20} color="#059669" />
                </IconWrapper>
                <OptionTextWrapper>
                  <OptionTitle isDark={isDark}>Share Secure Link</OptionTitle>
                  <OptionSubtitle>Create a secure temporary sharing link</OptionSubtitle>
                </OptionTextWrapper>
                <Feather name="chevron-right" size={18} color="#94a3b8" />
              </OptionItemButton>
            </OptionsList>
          )}

          {showLinkConfig && !generatedLink && (
            <ConfigSection>
              <LabelText>Link Access Configuration</LabelText>
              <ConfigLabel>Access permission is read-only.</ConfigLabel>

              <ExpirationSelectorLabel>Expiration Time</ExpirationSelectorLabel>
              <ExpiryGrid>
                {[
                  { label: "1 Hour", value: 1 },
                  { label: "24 Hours (Default)", value: 24 },
                  { label: "7 Days", value: 168 },
                ].map((item) => {
                  const isSelected = selectedExpiry === item.value;
                  return (
                    <ExpiryPill
                      key={item.value}
                      selected={isSelected}
                      themeColor={theme.colors.primary}
                      isDark={isDark}
                      onPress={() => setSelectedExpiry(item.value)}
                    >
                      <ExpiryPillText selected={isSelected} themeColor={theme.colors.primary}>
                        {item.label}
                      </ExpiryPillText>
                    </ExpiryPill>
                  );
                })}
              </ExpiryGrid>

              <ButtonContainer>
                <CreateLinkButton
                  onPress={handleCreateLink}
                  disabled={isCreatingLink}
                  themeColor={theme.colors.primary}
                  activeOpacity={0.8}
                >
                  {isCreatingLink ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <CreateLinkButtonText>Create Secure Link</CreateLinkButtonText>
                  )}
                </CreateLinkButton>

                <CancelTextButton onPress={() => setShowLinkConfig(false)}>
                  <CancelText>Back to Share Options</CancelText>
                </CancelTextButton>
              </ButtonContainer>
            </ConfigSection>
          )}

          {generatedLink && (
            <SuccessSection>
              <SuccessBadgeWrapper>
                <Ionicons name="checkmark-circle" size={48} color="#059669" />
                <SuccessBadgeTitle isDark={isDark}>Secure link created</SuccessBadgeTitle>
                <SuccessBadgeSubtitle>Expires in {selectedExpiry} hours</SuccessBadgeSubtitle>
              </SuccessBadgeWrapper>

              <LinkPreviewBox isDark={isDark} style={{ borderColor: theme.colors.border }}>
                <LinkPreviewText isDark={isDark} numberOfLines={1}>
                  {generatedLink.shareUrl}
                </LinkPreviewText>
              </LinkPreviewBox>

              <ButtonContainer>
                <CreateLinkButton
                  onPress={handleCopyLink}
                  themeColor={theme.colors.primary}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={18} color="white" style={{ marginRight: 6 }} />
                  <CreateLinkButtonText>Copy Link</CreateLinkButtonText>
                </CreateLinkButton>

                <ShareLinkActionBtn
                  onPress={handleShareLinkDirectly}
                  isDark={isDark}
                  style={{ borderColor: theme.colors.border }}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color={isDark ? "#cbd5e1" : "#475569"}
                    style={{ marginRight: 6 }}
                  />
                  <ShareLinkActionText isDark={isDark}>Share Link</ShareLinkActionText>
                </ShareLinkActionBtn>

                <CancelTextButton
                  onPress={() => {
                    setGeneratedLink(null);
                    setShowLinkConfig(false);
                  }}
                >
                  <CancelText>Create Another Link</CancelText>
                </CancelTextButton>
              </ButtonContainer>
            </SuccessSection>
          )}

          <CancelMainButton onPress={onClose} activeOpacity={0.8}>
            <CancelMainButtonText>Cancel</CancelMainButtonText>
          </CancelMainButton>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

/* Styled components */

const HeaderSection = styled.View`
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

const PreviewCard = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-width: 1px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#f8fafc")};
  margin-bottom: 20px;
`;

const DocIconBox = styled.View<{ ext: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: ${({ ext }: { ext: string }) => (ext === "pdf" ? "#fef2f2" : "#eff6ff")};
  justify-content: center;
  align-items: center;
`;

const DocMetaTextWrapper = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const DocName = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const DocDetailsText = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const LoadingOverlay = styled.View`
  align-items: center;
  justify-content: center;
  padding-vertical: 24px;
`;

const LoadingText = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 10px;
  font-weight: 500;
`;

const ErrorBox = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #fef2f2;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 16px;
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  margin-left: 8px;
  font-weight: 500;
  flex: 1;
`;

const RetryText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  font-weight: 700;
  text-decoration-line: underline;
`;

const OptionsList = styled.View`
  width: 100%;
`;

const LabelText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const OptionItemButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 14px;
  border-width: 1px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#111827" : "#ffffff")};
`;

const IconWrapper = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
`;

const OptionTextWrapper = styled.View`
  flex: 1;
  margin-left: 14px;
`;

const OptionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const OptionSubtitle = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const ConfigSection = styled.View`
  width: 100%;
`;

const ConfigLabel = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
`;

const ExpirationSelectorLabel = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
`;

const ExpiryGrid = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 24px;
`;

const ExpiryPill = styled.TouchableOpacity<{ selected: boolean; themeColor: string; isDark: boolean }>`
  flex: 1;
  padding-vertical: 10px;
  border-radius: 8px;
  border-width: 1px;
  align-items: center;
  border-color: ${({ selected, themeColor }: { selected: boolean; themeColor: string }) =>
    selected ? themeColor : "#cbd5e1"};
  background-color: ${({ selected, themeColor, isDark }: { selected: boolean; themeColor: string; isDark: boolean }) =>
    selected ? themeColor : isDark ? "#111827" : "#ffffff"};
`;

const ExpiryPillText = styled.Text<{ selected: boolean; themeColor: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ selected, themeColor }: { selected: boolean; themeColor: string }) =>
    selected ? "white" : "#64748b"};
`;

const ButtonContainer = styled.View`
  gap: 12px;
  width: 100%;
`;

const CreateLinkButton = styled.TouchableOpacity<{ themeColor: string }>`
  height: 50px;
  border-radius: 12px;
  background-color: ${({ themeColor }: { themeColor: string }) => themeColor};
  justify-content: center;
  align-items: center;
  flex-direction: row;
  width: 100%;
`;

const CreateLinkButtonText = styled.Text`
  color: white;
  font-size: 15px;
  font-weight: 700;
`;

const ShareLinkActionBtn = styled.TouchableOpacity<{ isDark: boolean }>`
  height: 50px;
  border-radius: 12px;
  border-width: 1px;
  background-color: transparent;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  width: 100%;
`;

const ShareLinkActionText = styled.Text<{ isDark: boolean }>`
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#475569")};
  font-size: 15px;
  font-weight: 600;
`;

const CancelTextButton = styled.TouchableOpacity`
  align-items: center;
  padding-vertical: 8px;
`;

const CancelText = styled.Text`
  color: #0d9488;
  font-size: 13px;
  font-weight: 600;
`;

const SuccessSection = styled.View`
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
`;

const SuccessBadgeWrapper = styled.View`
  align-items: center;
  margin-bottom: 20px;
`;

const SuccessBadgeTitle = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
  margin-top: 8px;
`;

const SuccessBadgeSubtitle = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const LinkPreviewBox = styled.View<{ isDark: boolean }>`
  width: 100%;
  padding: 12px;
  border-width: 1px;
  border-radius: 8px;
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#111827" : "#f1f5f9")};
  margin-bottom: 24px;
`;

const LinkPreviewText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-family: monospace;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#94a3b8" : "#475569")};
  text-align: center;
`;

const CancelMainButton = styled.TouchableOpacity`
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  border-width: 1px;
  border-color: #cbd5e1;
  width: 100%;
`;

const CancelMainButtonText = styled.Text`
  color: #64748b;
  font-size: 15px;
  font-weight: 600;
`;
