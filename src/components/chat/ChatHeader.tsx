import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatHeaderProps {
  onBack: () => void;
  isDark: boolean;
  theme: any;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBack,
  isDark,
  theme,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(12, insets.top),
          borderBottomColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(100, 116, 139, 0.1)",
        },
      ]}
    >
      <View style={styles.headerTitleRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.avatarBadge,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
          >
            Health Assistant
          </Text>
          <Text
            style={[styles.headerSub, { color: theme.colors.textSecondary }]}
          >
            Multilingual Profile
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(100, 116, 139, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
});
