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
        paddingVertical: 8,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1.5
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: isDark ? "#94a3b8" : "#64748b",
            fontWeight: "bold",
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </View>
  );
};
