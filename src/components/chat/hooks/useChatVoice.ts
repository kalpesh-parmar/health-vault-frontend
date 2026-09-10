import { useState, useEffect } from "react";
import { useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

type SpeechRecognitionResult = {
  results?: Array<{ transcript: string }>;
};

type SpeechRecognitionError = {
  error?: string;
  message?: string;
};

type SpeechRecognitionSubscription = {
  remove: () => void;
};

type SpeechRecognitionModuleShape = {
  addListener: (
    eventName: string,
    listener: (event: any) => void,
  ) => SpeechRecognitionSubscription;
  stop: () => void;
  start: (options: { lang: string }) => void;
  requestPermissionsAsync: () => Promise<unknown>;
};

let ExpoSpeechRecognitionModule: SpeechRecognitionModuleShape | null = null;

try {
  const speechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule =
    speechRecognition.ExpoSpeechRecognitionModule ?? null;
} catch {
  ExpoSpeechRecognitionModule = null;
}

export let activeFormDictationCallback: ((transcript: string) => void) | null =
  null;
export const setActiveFormDictationCallback = (
  cb: ((transcript: string) => void) | null,
) => {
  activeFormDictationCallback = cb;
};

export interface UseChatVoiceOptions {
  preferredLanguage?: string;
  mode?: "default" | "onboarding";
  onTranscript?: (transcript: string) => void;
}

export const useChatVoice = ({
  preferredLanguage = "english",
  mode = "default",
  onTranscript,
}: UseChatVoiceOptions) => {
  const [isListening, setIsListening] = useState(false);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!ExpoSpeechRecognitionModule) {
      return;
    }

    const startSubscription = ExpoSpeechRecognitionModule.addListener(
      "start",
      () => {
        setIsListening(true);
      },
    );
    const endSubscription = ExpoSpeechRecognitionModule.addListener(
      "end",
      () => {
        setIsListening(false);
      },
    );
    const errorSubscription = ExpoSpeechRecognitionModule.addListener(
      "error",
      (e: SpeechRecognitionError) => {
        console.log("Voice Error:", e.error, e.message);
        setIsListening(false);
      },
    );
    const resultSubscription = ExpoSpeechRecognitionModule.addListener(
      "result",
      (e: SpeechRecognitionResult) => {
        if (e.results && e.results.length > 0) {
          const transcript = e.results[0].transcript;
          if (mode === "onboarding" && activeFormDictationCallback) {
            activeFormDictationCallback(transcript);
          } else if (onTranscript) {
            onTranscript(transcript);
          }
        }
      },
    );

    return () => {
      startSubscription.remove();
      endSubscription.remove();
      errorSubscription.remove();
      resultSubscription.remove();
    };
  }, [mode, onTranscript]);

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
  }, [isListening, pulseScale]);

  const toggleListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      console.warn(
        "Voice input is unavailable in this build because expo-speech-recognition is not installed in the native app.",
      );
      return;
    }

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

  return {
    isListening,
    toggleListening,
    hasVoiceModule: Boolean(ExpoSpeechRecognitionModule),
    pulseScale,
  };
};
