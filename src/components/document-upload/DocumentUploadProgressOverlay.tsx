import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDocumentUpload } from "../../context/DocumentUploadContext";
import { useAppTheme } from "../../context/ThemeContext";
import OCRProgressPanel from "../chat/widgets/OCRProgressPanel";

const { width } = Dimensions.get("window");

export const DocumentUploadProgressOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const {
    uploadingDocs,
    isUploading,
    isProgressExpanded,
    setIsProgressExpanded,
    cancelUpload,
    cancelAllProcessing,
  } = useDocumentUpload();

  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (uploadingDocs.length > 0) {
      // Slide down overlay when upload begins
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Automatically collapse the card after 3 seconds of starting
      const timer = setTimeout(() => {
        setIsProgressExpanded(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // Slide up and hide when no docs are uploading
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [uploadingDocs.length, slideAnim, setIsProgressExpanded]);

  if (uploadingDocs.length === 0) return null;

  // Render floating overlay at the top of the screen under the safe area
  return (
    <Animated.View
      style={[
        styles.overlayContainer,
        {
          top: insets.top + (Platform.OS === "ios" ? 0 : 10),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <OCRProgressPanel
        uploadingDocs={uploadingDocs}
        isExpanded={isProgressExpanded}
        setIsExpanded={setIsProgressExpanded}
        onDismiss={cancelUpload}
        onCancelAll={cancelAllProcessing}
        isDark={isDark}
        isModal={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 99999, // Float over everything (headers, tabs, dialogs)
    alignItems: "center",
    justifyContent: "center",
  },
});
