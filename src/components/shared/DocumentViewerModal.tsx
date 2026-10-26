import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  const [fileSource, setFileSource] = useState<{
    uri: string;
    headers?: Record<string, string>;
  } | null>(null);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorType, setErrorType] = useState<
    "NOT_FOUND" | "ACCESS_DENIED" | "NETWORK" | "UNSUPPORTED" | "PREVIEW_FAILED"
  >("PREVIEW_FAILED");
  const hasAttemptedFallbackRef = useRef<boolean>(false);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [isPdfRendering, setIsPdfRendering] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);

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

  const loadDocumentSource = useCallback(async () => {
    if (!document) return;
    setIsLoading(true);
    setHasError(false);
    setErrorType("PREVIEW_FAILED");
    setIsImageLoading(false);
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

      // 1. If document.imageSource or document.source is an existing source object { uri, headers }
      if (
        document.imageSource &&
        typeof document.imageSource === "object" &&
        typeof document.imageSource.uri === "string"
      ) {
        source = {
          uri: document.imageSource.uri,
          headers: document.imageSource.headers,
        };
      } else if (
        document.source &&
        typeof document.source === "object" &&
        typeof document.source.uri === "string"
      ) {
        source = {
          uri: document.source.uri,
          headers: document.source.headers,
        };
      } else {
        // 2. Identify candidate keys and URIs
        const rawKey =
          (typeof document.s3Key === "string" && document.s3Key.trim()) ||
          (typeof document.fileKey === "string" && document.fileKey.trim()) ||
          (typeof document.file_key === "string" && document.file_key.trim()) ||
          (typeof document.imageSource === "string" &&
            document.imageSource.trim() !== "[object Object]" &&
            document.imageSource.trim()) ||
          null;

        const directUri =
          (typeof document.imageUri === "string" && document.imageUri.trim()) ||
          (typeof document.fileUrl === "string" && document.fileUrl.trim()) ||
          (typeof document.uri === "string" && document.uri.trim()) ||
          (typeof document.url === "string" && document.url.trim()) ||
          null;

        if (rawKey && !rawKey.startsWith("http://") && !rawKey.startsWith("https://") && !rawKey.startsWith("file://")) {
          source = await getFileSource(rawKey);
        } else if (directUri) {
          source = await getFileSource(directUri);
        } else if (rawKey) {
          source = await getFileSource(rawKey);
        }
      }

      // 3. Fallback to getDocument if no source could be derived directly and a document id exists
      const docId = document.id || document.documentId || document.report_id;
      if (!source?.uri && docId && !hasAttemptedFallbackRef.current) {
        hasAttemptedFallbackRef.current = true;
        try {
          const docRes = await getDocument(docId);
          const fullData = docRes?.data || docRes;
          const fetchedKey = (fullData as any)?.s3Key || (fullData as any)?.fileKey;
          if (fetchedKey) {
            source = await getFileSource(fetchedKey);
          } else if ((fullData as any)?.fileUrl) {
            source = await getFileSource((fullData as any).fileUrl);
          } else if ((fullData as any)?.imageUri) {
            source = await getFileSource((fullData as any).imageUri);
          } else if ((fullData as any)?.uri) {
            source = await getFileSource((fullData as any).uri);
          }
        } catch (fetchErr: any) {
          console.warn("[DocumentViewerModal] Fallback getDocument failed:", fetchErr);
          if (fetchErr?.response?.status === 404) setErrorType("NOT_FOUND");
          else if (fetchErr?.response?.status === 401 || fetchErr?.response?.status === 403) setErrorType("ACCESS_DENIED");
        }
      }

      if (source?.uri) {
        setFileSource(source);

        if (isPdfDoc) {
          const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "doc.pdf";
          const cacheUri = `${FileSystem.cacheDirectory}preview_${Date.now()}_${safeName}`;
          const dlRes = await FileSystem.downloadAsync(source.uri, cacheUri, {
            headers: source.headers || {},
          });
          const contentType = String(
            dlRes.headers?.["content-type"] || dlRes.headers?.["Content-Type"] || ""
          ).toLowerCase();

          if (
            dlRes.status === 200 &&
            !contentType.includes("text/html") &&
            !contentType.includes("application/json")
          ) {
            setLocalFileUri(dlRes.uri);
            if (Platform.OS === "android") {
              try {
                const b64 = await FileSystem.readAsStringAsync(dlRes.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                if (b64 && (b64.startsWith("JVBERi") || b64.includes("JVBERi"))) {
                  setPdfBase64(b64);
                } else {
                  console.warn("[DocumentViewerModal] PDF binary invalid or not standard PDF format");
                  setErrorType("UNSUPPORTED");
                  setHasError(true);
                }
              } catch (e) {
                console.warn("[DocumentViewerModal] Error reading base64 PDF:", e);
                setErrorType("PREVIEW_FAILED");
                setHasError(true);
              }
            }
          } else {
            console.warn(
              "[DocumentViewerModal] PDF download failed with status:",
              dlRes.status,
              "content-type:",
              contentType
            );
            if (dlRes.status === 404) setErrorType("NOT_FOUND");
            else if (dlRes.status === 401 || dlRes.status === 403) setErrorType("ACCESS_DENIED");
            else setErrorType("PREVIEW_FAILED");
            setHasError(true);
          }
        } else {
          setIsImageLoading(true);
        }
      } else {
        if (!errorType || errorType === "PREVIEW_FAILED") {
          setErrorType("NOT_FOUND");
        }
        setHasError(true);
      }
    } catch (e: any) {
      console.warn("[DocumentViewerModal] Error loading file source:", e);
      if (e?.response?.status === 404) setErrorType("NOT_FOUND");
      else if (e?.response?.status === 401 || e?.response?.status === 403) setErrorType("ACCESS_DENIED");
      else setErrorType("PREVIEW_FAILED");
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [document, resetZoom]);

  useEffect(() => {
    hasAttemptedFallbackRef.current = false;
    if (visible && document) {
      loadDocumentSource();
    } else {
      setFileSource(null);
      setLocalFileUri(null);
      setPdfBase64(null);
      setHasError(false);
      setIsImageLoading(false);
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

  const renderErrorState = () => {
    let iconName: any = "cloud-offline-outline";
    let title = "Preview Unavailable";
    let subtext = "We could not load this document's preview right now.";

    switch (errorType) {
      case "NOT_FOUND":
        iconName = "document-text-outline";
        title = "Document Not Found";
        subtext = "The requested medical file could not be found in storage.";
        break;
      case "ACCESS_DENIED":
        iconName = "lock-closed-outline";
        title = "Access Denied";
        subtext = "You do not have permission to view this document.";
        break;
      case "NETWORK":
        iconName = "cloud-offline-outline";
        title = "Network Unavailable";
        subtext = "Please check your internet connection and try again.";
        break;
      case "UNSUPPORTED":
        iconName = "alert-circle-outline";
        title = "Unsupported Format";
        subtext = "This document format cannot be previewed directly.";
        break;
      case "PREVIEW_FAILED":
      default:
        iconName = "image-outline";
        title = "Preview Unavailable";
        subtext = "We could not load this document's preview right now.";
        break;
    }

    return (
      <View style={styles.centerState}>
        <Ionicons name={iconName} size={54} color="#94a3b8" />
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateSubtext}>{subtext}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading document"
          style={styles.retryButton}
          onPress={() => {
            hasAttemptedFallbackRef.current = false;
            loadDocumentSource();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.retryButtonText}>Retry Loading</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#090d16" : "#0f172a",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
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

          {!isLoading && hasError && renderErrorState()}

          {!isLoading && !hasError && fileSource && (
            <>
              {isPdf ? (
                // PDF Viewer using WebView with PDF.js base64 rendering or native WebKit
                <View style={styles.pdfWrapper}>
                  <WebView
                    source={
                      Platform.OS === "android" && pdfBase64
                        ? {
                          html: `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
                                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js"></script>
                                <style>
                                  body { margin: 0; padding: 0; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; }
                                  canvas { max-width: 100%; margin-bottom: 8px; }
                                </style>
                              </head>
                              <body>
                                <div id="pdf-container"></div>
                                <script>
                                  var renderTimer = setTimeout(function() {
                                    window.ReactNativeWebView.postMessage('PDF_RENDERED');
                                  }, 10000);

                                  try {
                                    var pdfData = atob('${pdfBase64}');
                                    var pdfjsLib = window['pdfjs-dist/build/pdf'];
                                    if (!pdfjsLib) {
                                      clearTimeout(renderTimer);
                                      document.getElementById('pdf-container').innerHTML = '<p style="padding: 20px; color: #ef4444; font-family: sans-serif;">PDF engine could not be initialized.</p>';
                                      window.ReactNativeWebView.postMessage('PDF_ERROR');
                                    } else {
                                      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
                                      var loadingTask = pdfjsLib.getDocument({data: pdfData});
                                      loadingTask.promise.then(function(pdf) {
                                        var container = document.getElementById('pdf-container');
                                        var rendered = 0;
                                        for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                          pdf.getPage(pageNum).then(function(page) {
                                            var scale = 2.0;
                                            var viewport = page.getViewport({scale: scale});
                                            var canvas = document.createElement('canvas');
                                            var ctx = canvas.getContext('2d');
                                            canvas.height = viewport.height;
                                            canvas.width = viewport.width;
                                            canvas.style.width = "100%";
                                            container.appendChild(canvas);
                                            
                                            var renderContext = {
                                              canvasContext: ctx,
                                              viewport: viewport
                                            };
                                            page.render(renderContext).promise.then(function() {
                                              rendered++;
                                              if (rendered >= pdf.numPages) {
                                                clearTimeout(renderTimer);
                                                window.ReactNativeWebView.postMessage('PDF_RENDERED');
                                              }
                                            });
                                          });
                                        }
                                      }).catch(function(reason) {
                                        clearTimeout(renderTimer);
                                        console.error(reason);
                                        document.getElementById('pdf-container').innerHTML = '<p style="padding: 20px; color: #ef4444; font-family: sans-serif;">Error loading PDF: ' + (reason.message || 'Corrupted file') + '</p>';
                                        window.ReactNativeWebView.postMessage('PDF_ERROR');
                                      });
                                    }
                                  } catch (e) {
                                    clearTimeout(renderTimer);
                                    document.getElementById('pdf-container').innerHTML = '<p style="padding: 20px; color: #ef4444; font-family: sans-serif;">Failed to decode PDF data.</p>';
                                    window.ReactNativeWebView.postMessage('PDF_ERROR');
                                  }
                                </script>
                              </body>
                              </html>
                            `
                        }
                        : {
                          uri:
                            Platform.OS === "android" && localFileUri
                              ? localFileUri
                              : fileSource.uri,
                          headers: {
                            ...fileSource.headers,
                            "ngrok-skip-browser-warning": "true"
                          },
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
                    onLoadStart={() => {
                      if (isPdf) setIsPdfRendering(true);
                    }}
                    onMessage={(event) => {
                      if (event.nativeEvent.data === "PDF_RENDERED") {
                        setIsPdfRendering(false);
                      } else if (event.nativeEvent.data === "PDF_ERROR") {
                        setIsPdfRendering(false);
                        setErrorType("PREVIEW_FAILED");
                        setHasError(true);
                      }
                    }}
                    onLoadEnd={() => {
                      // For iOS or non-base64 PDFs, hide loader when WebView finishes loading
                      if (!(Platform.OS === "android" && pdfBase64)) {
                        setIsPdfRendering(false);
                      }
                    }}
                    renderLoading={() => (
                      <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color="#5B4BFF" />
                        <Text style={styles.stateText}>Rendering PDF document...</Text>
                      </View>
                    )}
                    onError={(err) => {
                      console.warn("[DocumentViewerModal] WebView PDF error:", err.nativeEvent);
                      setIsPdfRendering(false);
                      setErrorType("PREVIEW_FAILED");
                      setHasError(true);
                    }}
                  />
                  {isPdfRendering && (
                    <View style={styles.pdfRenderingOverlay}>
                      <ActivityIndicator size="large" color="#5B4BFF" />
                      <Text style={styles.stateText}>Rendering PDF...</Text>
                    </View>
                  )}
                </View>
              ) : (
                // Image Viewer with Zoom / Pan Gestures
                <View style={styles.imageWrapper}>
                  {isImageLoading && !hasError && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="large" color="#5B4BFF" />
                      <Text style={styles.stateText}>Loading image...</Text>
                    </View>
                  )}
                  <GestureDetector gesture={composedGesture}>
                    <Animated.Image
                      source={{
                        uri: fileSource.uri,
                        headers: fileSource.headers,
                      }}
                      style={[styles.fullImage, animatedImageStyle]}
                      resizeMode="contain"
                      onLoadStart={() => setIsImageLoading(true)}
                      onLoadEnd={() => setIsImageLoading(false)}
                      onError={async (err) => {
                        console.warn(
                          "[DocumentViewerModal] Image render failed:",
                          err?.nativeEvent || err
                        );
                        setIsImageLoading(false);
                        const docId = document?.id || document?.documentId || document?.report_id;
                        if (!hasAttemptedFallbackRef.current && docId) {
                          hasAttemptedFallbackRef.current = true;
                          try {
                            const docRes = await getDocument(docId);
                            const fullData = docRes?.data || docRes;
                            const fetchedKey = (fullData as any)?.s3Key || (fullData as any)?.fileKey;
                            if (fetchedKey) {
                              const fallbackSource = await getFileSource(fetchedKey);
                              if (fallbackSource?.uri && fallbackSource.uri !== fileSource?.uri) {
                                setFileSource(fallbackSource);
                                setIsImageLoading(true);
                                return;
                              }
                            }
                          } catch (fallbackErr) {
                            console.warn("[DocumentViewerModal] Fallback on image error failed:", fallbackErr);
                          }
                        }
                        setErrorType("PREVIEW_FAILED");
                        setHasError(true);
                      }}
                    />
                  </GestureDetector>
                </View>
              )}
            </>
          )}
        </View>
      </View>
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
  pdfRenderingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});

export default DocumentViewerModal;
