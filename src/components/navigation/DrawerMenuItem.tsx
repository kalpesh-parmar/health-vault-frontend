import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";

interface DrawerMenuItemProps {
  label: string;
  focused: boolean;
  onPress: () => void;
  icon?: (props: { color: string; size: number }) => React.ReactNode;
  isDark: boolean;
  theme: any;
}

const DrawerMenuItem = React.memo(({ label, focused, onPress, icon, isDark, theme }: DrawerMenuItemProps) => {
  const activeColor = theme.colors.primary || "#5B4BFF";
  const inactiveColor = isDark ? theme.colors.textSecondary : "#4B5563";
  const activeBg = isDark ? "rgba(124, 108, 255, 0.15)" : "#F0EEFF";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label} screen navigation button`}
      style={({ pressed }) => [
        styles.menuItemPressable,
        {
          backgroundColor: focused ? activeBg : "transparent",
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        }
      ]}
    >
      {focused && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}

      {icon && (
        <View style={styles.menuIconContainer}>
          {icon({ color: focused ? activeColor : inactiveColor, size: 24 })}
        </View>
      )}
      <Text
        style={[
          styles.menuItemText,
          {
            color: focused ? activeColor : inactiveColor,
            fontWeight: focused ? "700" : "500",
            fontSize: theme.typography.body.fontSize || 16,
          }
        ]}
        allowFontScaling={true}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export default DrawerMenuItem;

const styles = StyleSheet.create({
  menuItemPressable: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  menuIconContainer: {
    marginRight: 14,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    flex: 1,
  },
});
