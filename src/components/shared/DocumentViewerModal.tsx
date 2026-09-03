import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Toast from "react-native-toast-message";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { useAppTheme } from "../../context/ThemeContext";
import { getFileSource } from "../../services/fileService";
import { getDocument } from "../../services/documentService";
import { getFileExtension } from "../../utils/fileUtils";
import { formatDateOnly } from "../../utils/dateFormatter";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface DocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  document: any;
  title?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  visible,
  onClose,
  document,
  title,
}) => {
  const { isDark, theme } = useAppTheme();

  const [fileSource, setFileSource] = useState<{
    uri: string;
    headers?: Record<string, string>;
  } | null>(null);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isPdf, setIsPdf] = useState<boolean>(false);

  // Gesture values for Image Zoom / Pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.8, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Reset zoom on close / doc change
  const resetZoom = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Display original document title / fileName directly
  const computedTitle = React.useMemo(() => {
    return title || document?.fileName || "Document";
  }, [title, document]);

  // Load document source and detect PDF vs Image
  const loadDocumentSource = useCallback(async () => {
    if (!document) return;
    setIsLoading(true);
    setHasError(false);
    resetZoom();

    const fileName = document.fileName || "";
    const ext = getFileExtension(fileName).toLowerCase();
    const isPdfDoc =
      ext === "pdf" ||
      document.fileType === "PDF" ||
      document.mimeType === "application/pdf" ||
      document.contentType === "application/pdf";
    setIsPdf(isPdfDoc);

    try {
      let source: { uri: string; headers?: Record<string, string> } | null = null;
      if (document.s3Key) {
        source = await getFileSource(document.s3Key);
      } else if (document.imageUri) {
        source = { uri: document.imageUri };
      } else if (document.fileUrl) {
        source = { uri: document.fileUrl };
      } else if (document.id) {
        try {
          const docRes = await getDocument(document.id);
          const fullData = docRes?.data || docRes;
          if (fullData?.s3Key) {
            source = await getFileSource(fullData.s3Key);
          } else if ((fullData as any)?.fileUrl) {
            source = { uri: (fullData as any).fileUrl };
          } else if ((fullData as any)?.imageUri) {
            source = { uri: (fullData as any).imageUri };
          }
        } catch (fetchErr) {
          console.warn("[DocumentViewerModal] Fallback getDocument failed:", fetchErr);
        }
      }

      if (source?.uri) {
        setFileSource(source);

        // Pre-download PDF to local cache for reliable rendering on Android & offline viewing
        if (isPdfDoc) {
          const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "doc.pdf";
          const cacheUri = `${FileSystem.cacheDirectory}preview_${Date.now()}_${safeName}`;
          const dlRes = await FileSystem.downloadAsync(source.uri, cacheUri, {
            headers: source.headers || {},
          });
          if (dlRes.status === 200) {
            setLocalFileUri(dlRes.uri);
          }
        }
      } else {
        setHasError(true);
      }
    } catch (e) {
      console.warn("[DocumentViewerModal] Error loading file source:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [document, resetZoom]);

  useEffect(() => {
    if (visible && document) {
      loadDocumentSource();
    } else {
      setFileSource(null);
      setLocalFileUri(null);
      setHasError(false);
      resetZoom();
    }
  }, [visible, document, loadDocumentSource, resetZoom]);

  // Handle Share file locally via expo-sharing
  const handleShare = async () => {
    if (!fileSource?.uri) {
      Toast.show({
        type: "error",
        text1: "Not Available",
        text2: "Document is still loading.",
      });
      return;
    }

    try {
      setIsSharing(true);
      const fileName = document?.fileName || (isPdf ? "document.pdf" : "document.jpg");
      let shareUri = localFileUri;

      if (!shareUri) {
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const cachePath = `${FileSystem.cacheDirectory}share_${Date.now()}_${safeName}`;
        const downloadResult = await FileSystem.downloadAsync(
          fileSource.uri,
          cachePath,
          { headers: fileSource.headers || {} }
        );
        if (downloadResult.status === 200) {
          shareUri = downloadResult.uri;
        } else {
          throw new Error("Failed to download file for sharing");
        }
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare && shareUri) {
        await Sharing.shareAsync(shareUri, {
          mimeType: isPdf ? "application/pdf" : "image/jpeg",
          dialogTitle: `Share ${fileName}`,
        });
      }
    } catch (err) {
      console.warn("[DocumentViewerModal] Share failed:", err);
      Toast.show({
        type: "error",
        text1: "Share Failed",
        text2: "Unable to share file at this time.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? "#090d16" : "#0f172a" },
        ]}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close Document Viewer"
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#f8fafc" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {computedTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isPdf ? "PDF Document" : "Image Document"}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Share Document"
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={isSharing || isLoading}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#5B4BFF" />
            ) : (
              <Ionicons name="share-outline" size={22} color="#f8fafc" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content Viewer Body */}
        <View style={styles.body}>
          {isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#5B4BFF" />
              <Text style={styles.stateText}>Loading document preview...</Text>
            </View>
          )}

          {!isLoading && hasError && (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={54} color="#94a3b8" />
              <Text style={styles.stateTitle}>Preview Unavailable</Text>
              <Text style={styles.stateSubtext}>
                We could not load this document's preview right now.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry loading document"
                style={styles.retryButton}
                onPress={loadDocumentSource}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryButtonText}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !hasError && fileSource && (
            <>
              {isPdf ? (
                // PDF Viewer using react-native-webview
                <View style={styles.pdfWrapper}>
                  <WebView
                    source={{
                      uri:
                        Platform.OS === "android" && localFileUri
                          ? localFileUri
                          : fileSource.uri,
                      headers: fileSource.headers,
                    }}
                    style={styles.webview}
                    originWhitelist={["*"]}
                    allowFileAccess={true}
                    allowUniversalAccessFromFileURLs={true}
                    scalesPageToFit={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color="#5B4BFF" />
                        <Text style={styles.stateText}>Loading PDF pages...</Text>
                      </View>
                    )}
                    onError={(err) => {
                      console.warn("[DocumentViewerModal] WebView PDF error:", err.nativeEvent);
                      setHasError(true);
                    }}
                  />
                </View>
              ) : (
                // Image Viewer with Zoom / Pan Gestures
                <View style={styles.imageWrapper}>
                  <GestureDetector gesture={composedGesture}>
                    <Animated.Image
                      source={{
                        uri: fileSource.uri,
                        headers: fileSource.headers,
                      }}
                      style={[styles.fullImage, animatedImageStyle]}
                      resizeMode="contain"
                    />
                  </GestureDetector>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  body: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  stateTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
  },
  stateText: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 12,
  },
  stateSubtext: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5B4BFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  pdfWrapper: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webview: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
});

export default DocumentViewerModal;
