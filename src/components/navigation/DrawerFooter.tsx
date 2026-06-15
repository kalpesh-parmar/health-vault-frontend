import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DrawerFooterProps {
  onLogoutPress: () => void;
  insetsBottom: number;
  theme: any;
}

const DrawerFooter = React.memo(({ onLogoutPress, insetsBottom, theme }: DrawerFooterProps) => {
  return (
    <View
      style={[
        styles.footerContainer,
        {
          paddingBottom: Math.max(16, insetsBottom + 16),
          backgroundColor: theme.colors.background,
        }
      ]}
    >
      <View style={[
        styles.cardWrapper,
        {
          backgroundColor: theme.colors.card || "#FFFFFF",
          borderColor: theme.colors.border || "#E5E7EB",
        }
      ]}>
        <Pressable
          onPress={onLogoutPress}
          accessibilityRole="button"
          accessibilityLabel="Log out button"
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: pressed ? "rgba(239, 68, 68, 0.08)" : "transparent",
            }
          ]}
        >
          <Ionicons name="power-outline" size={24} color={theme.colors.danger || "#ef4444"} />
          <Text style={[
            styles.logoutText,
            {
              color: theme.colors.danger || "#ef4444",
              fontSize: theme.typography.body.fontSize || 16,
            }
          ]} allowFontScaling={true}>
            Logout
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

export default DrawerFooter;

const styles = StyleSheet.create({
  footerContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  cardWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  logoutText: {
    fontWeight: "700",
    marginLeft: 14,
  },
});
