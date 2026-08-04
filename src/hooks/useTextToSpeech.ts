import { useState, useEffect, useCallback } from "react";
import * as Speech from "expo-speech";

export const mapLanguageToTtsLocale = (lang: string | null | undefined): string => {
  if (!lang) return "en-US";
  const normalized = lang.toLowerCase().trim();
  switch (normalized) {
    case "hindi":
      return "hi-IN";
    case "gujarati":
      return "gu-IN";
    case "marathi":
      return "mr-IN";
    case "tamil":
      return "ta-IN";
    case "english":
    default:
      return "en-US";
  }
};

export const cleanMarkdownText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1") // Remove bold formatting
    .replace(/```([\s\S]*?)```/g, "") // Remove code blocks
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .replace(/^\s*[-*•]\s+/gm, "") // Remove list bullets
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .trim();
};

export const useTextToSpeech = () => {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Stop speaking on unmount
  useEffect(() => {
    return () => {
      Speech.stop().catch((e) => console.log("Speech stop unmount error", e));
    };
  }, []);

  const speakMessage = useCallback(async (messageId: string, rawText: string, language?: string) => {
    try {
      const isCurrentlySpeakingThis = speakingMessageId === messageId;

      // Always stop previous speech
      await Speech.stop();

      if (isCurrentlySpeakingThis) {
        setSpeakingMessageId(null);
        return;
      }

      const cleaned = cleanMarkdownText(rawText);
      if (!cleaned) return;

      const locale = mapLanguageToTtsLocale(language);

      setSpeakingMessageId(messageId);

      Speech.speak(cleaned, {
        language: locale,
        rate: 0.9,
        pitch: 1.0,
        onStart: () => {
          setSpeakingMessageId(messageId);
        },
        onDone: () => {
          setSpeakingMessageId(null);
        },
        onStopped: () => {
          setSpeakingMessageId(null);
        },
        onError: (err) => {
          console.warn("[TTS speak error]", err);
          setSpeakingMessageId(null);
        },
      });
    } catch (error) {
      console.warn("[TTS speakMessage exception]", error);
      setSpeakingMessageId(null);
    }
  }, [speakingMessageId]);

  return {
    speakingMessageId,
    speakMessage,
  };
};
