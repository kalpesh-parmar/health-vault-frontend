import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { usePreferredLanguage } from "../../hooks/usePreferredLanguage";
import { useAppConstants } from "../../utils/translationUtils";

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

export let activeFormDictationCallback: ((transcript: string) => void) | null =
  null;
export const setActiveFormDictationCallback = (
  cb: ((transcript: string) => void) | null,
) => {
  activeFormDictationCallback = cb;
};

export const getSpeechLocale = (lang: string | undefined): string => {
  if (!lang) return "en-IN";
  const clean = lang.toLowerCase().trim();
  switch (clean) {
    case "hindi":
    case "hi":
    case "hi-in":
      return "hi-IN";
    case "gujarati":
    case "gu":
    case "gu-in":
      return "gu-IN";
    case "marathi":
    case "mr":
    case "mr-in":
      return "mr-IN";
    case "tamil":
    case "ta":
    case "ta-in":
      return "ta-IN";
    case "telugu":
    case "te":
    case "te-in":
      return "te-IN";
    case "kannada":
    case "kn":
    case "kn-in":
      return "kn-IN";
    case "bengali":
    case "bn":
    case "bn-in":
      return "bn-IN";
    case "malayalam":
    case "ml":
    case "ml-in":
      return "ml-IN";
    case "punjabi":
    case "pa":
    case "pa-in":
      return "pa-IN";
    case "english":
    case "en":
    case "en-in":
    case "en-us":
    case "en-gb":
    default:
      return "en-IN";
  }
};

const AnimatedTouch = Animated.createAnimatedComponent(TouchableOpacity);

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  isSending,
  isDark,
  keyboardType = "default",
  preferredLanguage,
  mode = "default",
  onAttachPress,
}) => {
  const constants = useAppConstants();
  const [isListening, setIsListening] = useState(false);
  const pulseScale = useSharedValue(1);
  const storedPreferredLanguage = usePreferredLanguage();

  const effectiveLanguage =
    preferredLanguage || storedPreferredLanguage || "english";

  // Native speech recognition event hooks
  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", (e) => {
    console.log("[ChatInput] Voice recognition error:", e.error, e.message);
    setIsListening(false);
  });

  useSpeechRecognitionEvent("nomatch", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0].transcript;
      if (typeof transcript === "string" && transcript.length > 0) {
        if (mode === "onboarding" && activeFormDictationCallback) {
          activeFormDictationCallback(transcript);
        }
        onChangeText(transcript);
      }
    }
  });

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 600 }),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isListening]);

  const toggleListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      console.warn(
        "Voice input is unavailable in this build because expo-speech-recognition is not installed in the native app.",
      );
      return;
    }

    if (isListening) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        console.warn("[ChatInput] Stop speech recognition error:", e);
      }
      setIsListening(false);
    } else {
      try {
        const locale = getSpeechLocale(effectiveLanguage);

        const permResponse =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permResponse.granted) {
          console.warn(
            "[ChatInput] Speech recognition / microphone permission denied",
          );
          return;
        }

        ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
          addsPunctuation: true,
        });
      } catch (e) {
        console.error("[ChatInput] Voice start error:", e);
        setIsListening(false);
      }
    }
  };

  const hasText = Boolean(value && value.trim().length > 0);
  const isSendDisabled = !hasText || isSending;

  const cardBgColor = isDark ? "#1e293b" : "#ffffff";
  const inputTextColor = isDark ? "#ffffff" : "#1e293b";
  const placeholderColor = isDark
    ? "rgba(255,255,255,0.4)"
    : "rgba(30,41,59,0.4)";
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
        },
      ]}>
      {/* Attachment Button */}
      {onAttachPress && (
        <TouchableOpacity
          onPress={onAttachPress}
          style={styles.iconButton}
          activeOpacity={0.7}>
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
        placeholder={
          isListening
            ? (constants?.listening || "Listening...")
            : (constants?.messageDrHealth || "Message Dr. Health...")
        }
        placeholderTextColor={
          isListening ? themePrimaryColor : placeholderColor
        }
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

      {/* Mic / Voice Button - Always Visible */}
      <AnimatedTouch
        onPress={toggleListening}
        disabled={!ExpoSpeechRecognitionModule}
        style={[
          styles.iconButton,
          pulseStyle,
          {
            backgroundColor: isListening ? themePrimaryColor : "transparent",
            marginRight: 6,
          },
        ]}
        activeOpacity={0.7}>
        <Ionicons
          name="mic"
          size={22}
          color={
            !ExpoSpeechRecognitionModule
              ? "#cbd5e1"
              : isListening
                ? "#fff"
                : isDark
                  ? "#94a3b8"
                  : "#64748b"
          }
        />
      </AnimatedTouch>

      {/* Send Button - Static without animation, disabled with low opacity when no text */}
      <TouchableOpacity
        disabled={isSendDisabled}
        onPress={onSend}
        style={[
          styles.sendButtonContainer,
          {
            opacity: isSendDisabled ? 0.35 : 1.0,
          },
        ]}
        activeOpacity={0.8}>
        <LinearGradient
          colors={["#5B4BFF", "#7C6CFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendGradient}>
          <Ionicons name="arrow-up" size={20} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
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
    marginBottom: 5,
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sendGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
