import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { I18N_ONBOARDING_UI as ONBOARDING_I18N } from "./OnboardingI18n";

interface DocumentProcessingModalProps {
  isVisible: boolean;
  uploadState: string;
  pollElapsedTime: number;
  progressPercent?: number;
  onCancel: () => void;
  onRetry?: () => void;
  isDark: boolean;
  theme: any;
  preferredLanguage?: string;
}

export const DocumentProcessingModal: React.FC<DocumentProcessingModalProps> = ({
  isVisible,
  uploadState,
  pollElapsedTime,
  progressPercent = 0,
  onCancel,
  onRetry,
  isDark,
  theme,
  preferredLanguage = "english",
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isVisible, rotation]);

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const getPillText = () => {
    switch (uploadState) {
      case "uploading":
        return "Uploading document...";
      case "validating":
        return "Validating document...";
      case "processing":
        return "Extracting text from document...";
      case "queued":
        return "Queued for processing...";
      case "failed":
      case "rejected":
      case "timed_out":
        return "Processing failed";
      case "success":
        return "Processing complete!";
      default:
        return "Processing...";
    }
  };

  const getSubText = () => {
    switch (uploadState) {
      case "failed":
      case "rejected":
      case "timed_out":
        return "We couldn't process your document. Please try again.";
      case "success":
        return "Document successfully analyzed.";
      default:
        return "Analyzing your document. This may take a few seconds.";
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isError = ["failed", "rejected", "timed_out"].includes(uploadState);
  const normalizedProgress = Math.max(
    0,
    Math.min(100, Math.round(progressPercent || 0)),
  );
  const progressBarColor = isError
    ? "#ef4444"
    : uploadState === "success"
      ? "#22c55e"
      : theme.colors.primary;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? "#1e293b" : "#ffffff" },
          ]}
        >
          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityLabel="Cancel processing"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>

          {/* Circular Progress & Icon */}
          <View style={styles.iconContainer}>
            {!isError && uploadState !== "success" && (
              <Animated.View style={[StyleSheet.absoluteFill, animatedRingStyle, { alignItems: 'center', justifyContent: 'center' }]}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  {/* Background Circle */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke={isDark ? "#334155" : "#f1f5f9"}
                    strokeWidth="4"
                    fill="none"
                  />
                  {/* Animated Foreground Arc */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke={theme.colors.primary}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="339" // 2 * PI * 54 = ~339
                    strokeDashoffset="220"
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>
            )}
            
            <View style={styles.documentIconWrapper}>
              <Ionicons
                name="document-text"
                size={48}
                color={isError ? "#ef4444" : uploadState === "success" ? "#22c55e" : "#8b5cf6"}
              />
              <View style={styles.sparkleBadge}>
                <Ionicons name="sparkles" size={12} color="#fff" />
              </View>
            </View>
          </View>

          {/* Texts */}
          <Text style={[styles.title, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
            {isError ? "Processing Failed" : uploadState === "success" ? "Done" : "Processing Document"}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#475569" }]}>
            {getSubText()}
          </Text>

          {/* Dynamic State Pill */}
          <View style={[styles.pill, { backgroundColor: isError ? "#fee2e2" : isDark ? "#312e81" : "#f3e8ff" }]}>
            <Ionicons
              name={isError ? "warning" : uploadState === "success" ? "checkmark-circle" : "sparkles"}
              size={16}
              color={isError ? "#dc2626" : theme.colors.primary}
            />
            <Text style={[styles.pillText, { color: isError ? "#dc2626" : theme.colors.primary }]}> 
              {getPillText()}
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={[styles.progressLabel, { color: isDark ? "#cbd5e1" : "#475569" }]}>
                Extraction Progress
              </Text>
              <Text style={[styles.progressValue, { color: progressBarColor }]}>
                {uploadState === "success" ? "100%" : `${normalizedProgress}%`}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${uploadState === "success" ? 100 : normalizedProgress}%`,
                    backgroundColor: progressBarColor,
                  },
                ]}
              />
            </View>
          </View>

          {isError && uploadState !== "rejected" && onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={onRetry}
            >
              <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Retry Extraction</Text>
            </TouchableOpacity>
          )}

          {/* Timer Footer */}
          {/* <View style={styles.footerRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.timerText, { color: theme.colors.primary }]}>
              {formatTime(pollElapsedTime)}
            </Text>
            <View style={[styles.divider, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]} />
            <Text style={[styles.waitText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              Please wait
            </Text>
          </View> */}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cancelButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  documentIconWrapper: {
    width: 72,
    height: 72,
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  progressSection: {
    width: "100%",
    marginTop: 4,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 12,
  },
  waitText: {
    fontSize: 14,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    marginTop: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
