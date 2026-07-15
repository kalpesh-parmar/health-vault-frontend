import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75;

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  sessions: any[]; // replace with actual session type
  onSelectSession: (session: any) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  isDark,
  sessions,
  onSelectSession,
  onDeleteSession,
}) => {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      translateX.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(0.4, { duration: 300 });
    } else {
      translateX.value = withTiming(-SIDEBAR_WIDTH, { duration: 300 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isOpen]);

  const sidebarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
      pointerEvents: isOpen ? "auto" : "none",
    };
  });

  const bgColor = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#1e293b";
  const itemBgColor = isDark ? "#334155" : "#f1f5f9";

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.sidebar, { backgroundColor: bgColor, paddingTop: insets.top }, sidebarStyle]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Health AI</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Chats</Text>

        <View style={styles.sessionList}>
          {sessions.map((session) => (
            <View key={session.id} style={[styles.sessionItem, { backgroundColor: itemBgColor }]}>
              <TouchableOpacity
                style={styles.sessionTextContainer}
                onPress={() => {
                  onSelectSession(session);
                  onClose();
                }}
              >
                <Ionicons name="chatbox-outline" size={18} color={isDark ? "#94a3b8" : "#64748b"} style={{ marginRight: 8 }} />
                <Text style={[styles.sessionText, { color: textColor }]} numberOfLines={1}>
                  {session.title || "New Session"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteSession(session.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 101,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sessionList: {
    paddingHorizontal: 16,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sessionTextContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sessionText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
});
