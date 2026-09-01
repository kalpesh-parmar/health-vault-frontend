import React from "react";
import { View, Text } from "react-native";

interface ChatDateHeaderProps {
  dateLabel: string;
  isDark?: boolean;
}

export const ChatDateHeader: React.FC<ChatDateHeaderProps> = ({
  dateLabel,
  isDark = false,
}) => {
  if (!dateLabel) return null;

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
        paddingVertical: 6,
        backgroundColor: "transparent",
      }}
      accessibilityRole="header"
      accessibilityLabel={dateLabel}
    >
      <View
        style={{
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: isDark ? "#94a3b8" : "#64748b",
            fontWeight: "700",
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </View>
  );
};
