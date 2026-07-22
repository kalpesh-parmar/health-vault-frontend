import React, { useEffect, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard, KeyboardEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from "react-native-reanimated";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  isDark: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  preferredLanguage?: string;
  mode?: "default" | "onboarding";
  onAttachPress?: () => void;
}

export let activeFormDictationCallback: ((transcript: string) => void) | null = null;
export const setActiveFormDictationCallback = (cb: ((transcript: string) => void) | null) => {
  activeFormDictationCallback = cb;
};

const AnimatedTouch = Animated.createAnimatedComponent(TouchableOpacity);

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  isSending,
  isDark,
  keyboardType = "default",
  preferredLanguage = "english",
  mode = "default",
  onAttachPress,
}) => {
  const insets = useSafeAreaInsets();
  const sendScale = useSharedValue(0.0);
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const pulseScale = useSharedValue(1);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", (e) => {
    console.log("Voice Error:", e.error, e.message);
    setIsListening(false);
  });
  useSpeechRecognitionEvent("result", (e) => {
    if (e.results && e.results.length > 0) {
      if (mode === "onboarding" && activeFormDictationCallback) {
        activeFormDictationCallback(e.results[0].transcript);
      } else {
        console.log("Transcript :- ", e.results[0].transcript);
        onChangeText(e.results[0].transcript);
      }
    }
  });

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 600 }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isListening]);

  const toggleListening = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      try {
        let locale = "en-US";
        const pl = preferredLanguage.toLowerCase();
        if (pl === "hindi" || pl === "hi") locale = "hi-IN";
        else if (pl === "gujarati" || pl === "gu") locale = "gu-IN";
        else if (pl === "marathi" || pl === "mr") locale = "mr-IN";
        else if (pl === "tamil" || pl === "ta") locale = "ta-IN";
        
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        ExpoSpeechRecognitionModule.start({ lang: locale });
      } catch (e) {
        console.error("Voice start error:", e);
      }
    }
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => setKeyboardPadding(e.endCoordinates.height + insets.bottom + 5)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    sendScale.value = withSpring(value.trim() ? 1.0 : 0.0, {
      damping: 12,
      stiffness: 150,
    });
  }, [value]);

  const sendStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendScale.value }],
      opacity: sendScale.value,
      width: sendScale.value === 0 ? 0 : 44, // collapse width when scale is 0 to let input take up space
      marginLeft: sendScale.value === 0 ? 0 : 8,
    };
  });

  const cardBgColor = isDark ? "#1e293b" : "#ffffff";
  const inputTextColor = isDark ? "#ffffff" : "#1e293b";
  const placeholderColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(30,41,59,0.4)";
  const themePrimaryColor = "#5B4BFF";

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: cardBgColor,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
          borderWidth: isDark ? 1 : 0,
          marginBottom: keyboardPadding > 0 ? keyboardPadding : (Platform.OS === 'android' && insets.bottom < 30 ? 28 : Math.max(insets.bottom + 5, 10)),
        },
      ]}
    >
      {/* Attachment Button */}
      {onAttachPress && (
        <TouchableOpacity
          onPress={onAttachPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="attach"
            size={24}
            color={isDark ? "#94a3b8" : "#64748b"}
          />
        </TouchableOpacity>
      )}

      {/* TextInput */}
      <TextInput
        style={[styles.textInput, { color: inputTextColor }]}
        placeholder={isListening ? "Listening..." : "Message Dr. Health..."}
        placeholderTextColor={isListening ? themePrimaryColor : placeholderColor}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (mode === "onboarding") {
            setActiveFormDictationCallback(null);
          }
        }}
        multiline
        numberOfLines={2}
        maxLength={1000}
        blurOnSubmit={false}
        disableFullscreenUI={true}
        keyboardType={keyboardType}
      />

      {/* Mic Button */}
      {sendScale.value === 0 && !value.trim() && (
        <AnimatedTouch
          onPress={toggleListening}
          style={[styles.iconButton, pulseStyle, { backgroundColor: isListening ? themePrimaryColor : "transparent" }]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="mic"
            size={22}
            color={isListening ? "#fff" : (isDark ? "#94a3b8" : "#64748b")}
          />
        </AnimatedTouch>
      )}

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
    height: "auto",
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
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
    maxHeight: 130,
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
