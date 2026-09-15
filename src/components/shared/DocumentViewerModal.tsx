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
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
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
    return title || document?.fileName || document?.displayName || document?.name || "Document";
  }, [title, document]);

  // Generate HTML for PDF viewer using PDF.js for crisp, responsive cross-platform rendering
  const generatePdfHtml = useCallback((base64Data: string, isDarkMode: boolean) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background-color: ${isDarkMode ? "#090d16" : "#0f172a"};
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 8px 60px 8px;
    }
    #loading {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 60px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(91, 75, 255, 0.2);
      border-top-color: #5B4BFF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #pdf-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .page-wrapper {
      position: relative;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      border-radius: 6px;
      overflow: hidden;
      max-width: 100%;
    }
    .page-number-tag {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #f8fafc;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
      pointer-events: none;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: auto !important;
    }
    #floating-badge {
      position: fixed;
      bottom: 20px;
      background: rgba(15, 23, 42, 0.9);
      color: #f8fafc;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 100;
      display: none;
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <span>Loading PDF document...</span>
  </div>
  <div id="pdf-container"></div>
  <div id="floating-badge"></div>

  <script>
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const rawData = atob("${base64Data}");
      const uint8Array = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        uint8Array[i] = rawData.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      loadingTask.promise.then(async function(pdf) {
        document.getElementById('loading').style.display = 'none';
        const badge = document.getElementById('floating-badge');
        badge.style.display = 'block';
        badge.textContent = pdf.numPages + (pdf.numPages === 1 ? ' Page' : ' Pages');

        const container = document.getElementById('pdf-container');
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const wrapper = document.createElement('div');
          wrapper.className = 'page-wrapper';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const tag = document.createElement('div');
          tag.className = 'page-number-tag';
          tag.textContent = pageNum + ' / ' + pdf.numPages;

          wrapper.appendChild(canvas);
          if (pdf.numPages > 1) {
            wrapper.appendChild(tag);
          }
          container.appendChild(wrapper);

          await page.render({ canvasContext: context, viewport: viewport }).promise;
        }
      }).catch(function(err) {
        console.error("PDF render error:", err);
        document.getElementById('loading').innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">Failed to render PDF: ' + err.message + '</div>';
      });
    } catch (e) {
      console.error("Initialization error:", e);
      document.getElementById('loading').innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">Initialization error: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
  }, []);

  // Load document source and detect PDF vs Image
  const loadDocumentSource = useCallback(async () => {
    if (!document) return;
    setIsLoading(true);
    setHasError(false);
    setPdfBase64(null);
    resetZoom();

    const fileName =
      document.fileName ||
      document.displayName ||
      document.name ||
      document.originalName ||
      "";
    const ext = getFileExtension(fileName).toLowerCase();
    const isPdfDoc =
      ext === "pdf" ||
      document.fileType === "PDF" ||
      document.mimeType === "application/pdf" ||
      document.contentType === "application/pdf" ||
      (typeof document.uri === "string" && document.uri.toLowerCase().endsWith(".pdf")) ||
      (typeof document.fileUrl === "string" && document.fileUrl.toLowerCase().includes(".pdf"));
    setIsPdf(isPdfDoc);

    try {
      let source: { uri: string; headers?: Record<string, string> } | null = null;
      const targetKey = document.s3Key || document.fileKey;

      if (targetKey) {
        source = await getFileSource(targetKey);
      } else if (document.imageUri) {
        source = { uri: document.imageUri };
      } else if (document.fileUrl) {
        source = { uri: document.fileUrl };
      } else if (document.uri) {
        source = { uri: document.uri };
      } else if (document.url) {
        source = { uri: document.url };
      } else if (document.id) {
        try {
          const docRes = await getDocument(document.id);
          const fullData = docRes?.data || docRes;
          const fetchedKey = (fullData as any)?.s3Key || (fullData as any)?.fileKey;
          if (fetchedKey) {
            source = await getFileSource(fetchedKey);
          } else if ((fullData as any)?.fileUrl) {
            source = { uri: (fullData as any).fileUrl };
          } else if ((fullData as any)?.imageUri) {
            source = { uri: (fullData as any).imageUri };
          } else if ((fullData as any)?.uri) {
            source = { uri: (fullData as any).uri };
          }
        } catch (fetchErr) {
          console.warn("[DocumentViewerModal] Fallback getDocument failed:", fetchErr);
        }
      }

      if (source?.uri) {
        setFileSource(source);

        if (isPdfDoc) {
          // If already local file URI
          if (source.uri.startsWith("file://")) {
            setLocalFileUri(source.uri);
            try {
              const b64 = await FileSystem.readAsStringAsync(source.uri, {
                encoding: "base64",
              });
              setPdfBase64(b64);
            } catch (readErr) {
              console.warn("[DocumentViewerModal] Failed reading local PDF base64:", readErr);
            }
          } else {
            // Download PDF to local cache for reliable base64 rendering
            const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "preview.pdf";
            const cacheUri = `${FileSystem.cacheDirectory}preview_${Date.now()}_${safeName}`;
            try {
              const dlRes = await FileSystem.downloadAsync(source.uri, cacheUri, {
                headers: source.headers || {},
              });
              if (dlRes.status === 200) {
                setLocalFileUri(dlRes.uri);
                const b64 = await FileSystem.readAsStringAsync(dlRes.uri, {
                  encoding: "base64",
                });
                setPdfBase64(b64);
              }
            } catch (dlErr) {
              console.warn("[DocumentViewerModal] PDF download/base64 cache failed:", dlErr);
            }
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
      setPdfBase64(null);
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
                // PDF Viewer using WebView with PDF.js base64 rendering or native WebKit
                <View style={styles.pdfWrapper}>
                  <WebView
                    source={
                      Platform.OS === "ios"
                        ? {
                            uri: localFileUri || fileSource.uri,
                            headers: fileSource.headers,
                          }
                        : pdfBase64
                          ? {
                              html: generatePdfHtml(pdfBase64, isDark),
                              baseUrl: "https://localhost",
                            }
                          : {
                              uri: localFileUri || fileSource.uri,
                              headers: fileSource.headers,
                            }
                    }
                    style={styles.webview}
                    originWhitelist={["*"]}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color="#5B4BFF" />
                        <Text style={styles.stateText}>Rendering PDF document...</Text>
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
