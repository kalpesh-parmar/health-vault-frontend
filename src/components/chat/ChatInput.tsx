import React, { useEffect } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  isSending: boolean;
  isDark: boolean;
}

const AnimatedTouch = Animated.createAnimatedComponent(TouchableOpacity);

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  onVoice,
  isSending,
  isDark,
}) => {
  const insets = useSafeAreaInsets();
  const sendScale = useSharedValue(0.0);

  useEffect(() => {
    const hasText = value.trim().length > 0;
    sendScale.value = withSpring(hasText ? 1.0 : 0.0, { damping: 15 });
  }, [value]);

  const sendStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendScale.value }],
      opacity: sendScale.value,
      width: sendScale.value === 0 ? 0 : 44, // collapse width when scale is 0 to let input take up space
      marginLeft: sendScale.value === 0 ? 0 : 8,
    };
  });

  const micStyle = useAnimatedStyle(() => {
    const hasText = value.trim().length > 0;
    return {
      transform: [{ scale: withSpring(hasText ? 0.0 : 1.0, { damping: 15 }) }],
      opacity: withSpring(hasText ? 0.0 : 1.0),
      width: hasText ? 0 : 36,
      marginLeft: hasText ? 0 : 4,
    };
  });

  const cardBgColor = isDark ? "#1e293b" : "#ffffff";
  const inputTextColor = isDark ? "#ffffff" : "#1e293b";
  const placeholderColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(30,41,59,0.4)";
  const iconColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(30,41,59,0.5)";

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: cardBgColor,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
          borderWidth: isDark ? 1 : 0,
          marginBottom: insets.bottom + 8,
        },
      ]}
    >
      {/* Attachment Button */}
      <TouchableOpacity onPress={onAttach} style={styles.iconButton} activeOpacity={0.65}>
        <Ionicons name="attach-outline" size={22} color={iconColor} />
      </TouchableOpacity>

      {/* TextInput */}
      <TextInput
        style={[styles.textInput, { color: inputTextColor }]}
        placeholder="Message Dr. Health..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        multiline
        numberOfLines={1}
        maxLength={1000}
        editable={!isSending}
      />

      {/* Voice Mic Button */}
      <AnimatedTouch
        onPress={onVoice}
        style={[styles.iconButton, micStyle]}
        activeOpacity={0.65}
      >
        <Ionicons name="mic-outline" size={22} color={iconColor} />
      </AnimatedTouch>

      {/* Send Button */}
      <AnimatedTouch
        disabled={!value.trim() || isSending}
        onPress={onSend}
        style={[styles.sendButtonContainer, sendStyle]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#5B4BFF", "#7C6CFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendGradient}
        >
          <Ionicons name="arrow-up" size={22} color="#ffffff" />
        </LinearGradient>
      </AnimatedTouch>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    minHeight: 52,
    maxHeight: 120,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    fontWeight: "500",
  },
  sendButtonContainer: {
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
