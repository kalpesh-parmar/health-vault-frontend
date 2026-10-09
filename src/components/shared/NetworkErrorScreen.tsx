import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppConstants } from "../../utils/translationUtils";

export interface NetworkErrorScreenProps {
  onRetry?: () => void | Promise<any>;
  isChecking?: boolean;
  isOffline?: boolean;
}

export const NetworkErrorScreen: React.FC<NetworkErrorScreenProps> = ({
  onRetry,
  isChecking = false,
  isOffline = false,
}) => {
  const constants = useAppConstants();
  const insets = useSafeAreaInsets();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  // Animations
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track offline transitions (Offline -> Online restored state)
  useEffect(() => {
    let timeoutId: any;

    if (isOffline) {
      wasOffline.current = true;
      setShowRestored(false);

      // Animate overlay backdrop in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Slide down and pop pill into view
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 75,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline.current) {
      // Transition from offline to online
      setShowRestored(true);
      wasOffline.current = false;

      // Animate overlay backdrop out immediately
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Keep "You're online" pill visible for 2.5s, then smoothly slide out
      timeoutId = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 350,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 0.9,
            tension: 80,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowRestored(false);
        });
      }, 2500);
    } else {
      // Settled online state
      translateY.setValue(-120);
      opacity.setValue(0);
      overlayOpacity.setValue(0);
      setShowRestored(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOffline, translateY, opacity, scale, overlayOpacity]);

  // Subtle pulsing ring when offline
  useEffect(() => {
    if (isOffline && !showRestored) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOffline, showRestored, pulseAnim]);

  if (!isOffline && !showRestored) {
    return null;
  }

  const topPosition =
    Platform.OS === "ios"
      ? Math.max(insets.top, 12) + 2
      : Math.max(insets.top, 24) + 6;

  const isRestored = showRestored && !isOffline;

  return (
    <>
      {/* Full-screen Interaction Blocker & Dimmer when Offline */}
      {isOffline && (
        <Animated.View
          style={[styles.backdropOverlay, { opacity: overlayOpacity }]}
          pointerEvents="auto"
        />
      )}

      {/* Top Floating Dynamic Island / Capsule Pill */}
      <View
        style={[styles.outerContainer, { top: topPosition }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.pillWrapper,
            {
              transform: [{ translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (onRetry && !isChecking && isOffline) {
                onRetry();
              }
            }}
            disabled={!isOffline || isChecking}
            style={[
              styles.capsulePill,
              isRestored ? styles.onlinePill : styles.offlinePill,
            ]}
          >
            {/* Left Icon with Badge */}
            <View style={styles.iconContainer}>
              {!isRestored && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.25],
                        outputRange: [0.5, 0],
                      }),
                    },
                  ]}
                />
              )}
              <View
                style={[
                  styles.iconBadge,
                  isRestored
                    ? styles.onlineIconBadge
                    : styles.offlineIconBadge,
                ]}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#e11d48" />
                ) : isRestored ? (
                  <Ionicons name="wifi" size={15} color="#059669" />
                ) : (
                  <MaterialCommunityIcons
                    name="wifi-off"
                    size={15}
                    color="#e11d48"
                  />
                )}
              </View>
            </View>

            {/* Status Text */}
            <Text
              style={[
                styles.pillText,
                isRestored ? styles.onlineText : styles.offlineText,
              ]}
              numberOfLines={1}
            >
              {isChecking
                ? (constants?.connecting || "Connecting...")
                : isRestored
                ? (constants?.youreOnline || "You're online")
                : (constants?.youreOffline || "You're offline")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

export default NetworkErrorScreen;

const styles = StyleSheet.create({
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    zIndex: 999998,
  },
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999999,
  },
  pillWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  capsulePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 38,
  },
  offlinePill: {
    backgroundColor: "#fee2e2",
    borderColor: "rgba(244, 63, 94, 0.3)",
    shadowColor: "#f43f5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  onlinePill: {
    backgroundColor: "#ecfdf5",
    borderColor: "rgba(16, 185, 129, 0.3)",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244, 63, 94, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  offlineIconBadge: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
  },
  onlineIconBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  offlineText: {
    color: "#e11d48",
  },
  onlineText: {
    color: "#059669",
  },
});
