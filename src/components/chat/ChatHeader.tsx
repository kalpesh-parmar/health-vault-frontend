import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatHeaderProps {
  onBack: () => void;
  onNewChat: () => void;
  isDark: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onBack, onNewChat, isDark }) => {
  const insets = useSafeAreaInsets();

  const gradientColors = isDark
    ? (["#1e1b4b", "#312e81"] as const)
    : (["#4f46e5", "#6366f1"] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(12, insets.top),
          height: 84 + Math.max(12, insets.top),
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Side: Back Button + Avatar */}
        <View style={styles.leftContainer}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#a78bfa", "#c084fc"]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>🤖</Text>
            </LinearGradient>
            <View style={styles.onlineBadge} />
          </View>
        </View>

        {/* Center: Title & Subtitle */}
        <View style={styles.centerContainer}>
          <Text style={styles.titleText}>Dr. Health AI</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>🟢 Local AI Doctor</Text>
          </View>
        </View>

        {/* Right Side: New Chat Button */}
        <TouchableOpacity onPress={onNewChat} style={styles.newChatButton} activeOpacity={0.7}>
          <LinearGradient
            colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]}
            style={styles.newChatGradient}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#ffffff" />
            <Text style={styles.newChatText}>New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    justifyContent: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarContainer: {
    position: "relative",
    width: 42,
    height: 42,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  avatarText: {
    fontSize: 20,
  },
  onlineBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#312e81",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  titleText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "700",
  },
  newChatButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  newChatGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  newChatText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
});
