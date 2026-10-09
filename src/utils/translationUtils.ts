import { APP_TRANSLATIONS } from "../constants/appTranslations";
import {
  AppConstants,
  PreferredLanguageInput,
  SupportedLanguage,
} from "../types/language";
export type { AppConstants, PreferredLanguageInput, SupportedLanguage };
import type { User, ApiResponse } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const SUPPORTED_LANGUAGES: {
  label: string;
  value: SupportedLanguage;
  nativeLabel: string;
  code: string;
}[] = [
  { label: "English", value: "english", nativeLabel: "English", code: "en" },
  { label: "Hindi", value: "hindi", nativeLabel: "हिन्दी", code: "hi" },
  { label: "Gujarati", value: "gujarati", nativeLabel: "ગુજરાતી", code: "gu" },
  { label: "Tamil", value: "tamil", nativeLabel: "தமிழ்", code: "ta" },
  { label: "Marathi", value: "marathi", nativeLabel: "मराठी", code: "mr" },
];

/**
 * Normalizes any language input (e.g. "en", "Hindi", "GUJARATI", "marathi")
 * into one of the 5 supported languages: english, hindi, gujarati, tamil, marathi.
 */
export const normalizeLanguage = (
  lang?: PreferredLanguageInput
): SupportedLanguage => {
  if (!lang) return "english";
  const cleaned = String(lang).trim().toLowerCase();

  if (cleaned === "en" || cleaned === "english") return "english";
  if (cleaned === "hi" || cleaned === "hindi") return "hindi";
  if (cleaned === "gu" || cleaned === "gujarati") return "gujarati";
  if (cleaned === "ta" || cleaned === "tamil") return "tamil";
  if (cleaned === "mr" || cleaned === "marathi") return "marathi";

  return "english";
};

// Cached active language and constants object (evaluated once and stored)
let activeLanguage: SupportedLanguage = "english";
let activeConstants: AppConstants = APP_TRANSLATIONS.english;

// Listener system for reactive state updates across all screens and components
type LanguageChangeListener = (
  lang: SupportedLanguage,
  constants: AppConstants
) => void;
const listeners = new Set<LanguageChangeListener>();

export const subscribeToLanguageChange = (
  listener: LanguageChangeListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (lang: SupportedLanguage, constants: AppConstants) => {
  listeners.forEach((listener) => {
    try {
      listener(lang, constants);
    } catch (e) {
      console.warn("Error in language change listener:", e);
    }
  });
};

/**
 * Initializes language from AsyncStorage on app load.
 */
export const initAppLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const stored = await AsyncStorage.getItem("preferredLanguage");
    if (stored) {
      const normalized = normalizeLanguage(stored);
      if (normalized !== activeLanguage) {
        setAppLanguage(normalized, false);
      }
      return normalized;
    }
  } catch (err) {
    console.warn("Failed to initialize preferredLanguage from AsyncStorage", err);
  }
  return activeLanguage;
};

/**
 * Sets the active preferred language and updates the cached constants object.
 * Persists to AsyncStorage and notifies all active listeners / screens.
 * Returns the constant object for the newly set language.
 */
export const setAppLanguage = (
  lang?: PreferredLanguageInput,
  persistToStorage: boolean = true
): AppConstants => {
  const normalized = normalizeLanguage(lang);
  const changed = activeLanguage !== normalized;
  activeLanguage = normalized;
  activeConstants = APP_TRANSLATIONS[normalized] || APP_TRANSLATIONS.english;

  if (persistToStorage) {
    AsyncStorage.setItem("preferredLanguage", normalized).catch((err) => {
      console.warn("Failed to persist preferredLanguage to AsyncStorage:", err);
    });
  }

  if (changed) {
    notifyListeners(normalized, activeConstants);
  }

  return activeConstants;
};

/**
 * Gets the current active language string.
 */
export const getActiveLanguage = (): SupportedLanguage => activeLanguage;

/**
 * Resolves and returns the constant object for a preferred language or user profile.
 * Can be called with:
 * - No arguments: returns current active cached constants object
 * - Language string / code: e.g. "hindi", "gu", "English"
 * - User object or Patient/Profile API response containing preferredLanguage
 *
 * Example:
 * const constants = getAppConstants(user?.preferredLanguage);
 * // Use directly: constants?.save, constants?.[fieldName]
 */
export const getAppConstants = (
  userOrLanguageOrProfile?:
    | PreferredLanguageInput
    | User
    | ApiResponse<User>
    | { preferredLanguage?: string; preferred_language?: string }
    | null
): AppConstants => {
  if (!userOrLanguageOrProfile) {
    return activeConstants;
  }

  // Handle ApiResponse<User> or nested profile response
  if (typeof userOrLanguageOrProfile === "object" && userOrLanguageOrProfile !== null) {
    const rawData = (userOrLanguageOrProfile as any)?.data || userOrLanguageOrProfile;
    const preferredLang =
      rawData?.preferredLanguage ||
      rawData?.preferred_language ||
      (userOrLanguageOrProfile as any)?.preferredLanguage ||
      (userOrLanguageOrProfile as any)?.preferred_language;

    if (preferredLang) {
      return setAppLanguage(preferredLang);
    }
    return activeConstants;
  }

  // Handle direct language string
  return setAppLanguage(userOrLanguageOrProfile as PreferredLanguageInput);
};

/**
 * Dedicated helper to extract preferred language from the patient/profile API response
 * and return the corresponding language constant object directly.
 *
 * Example:
 * const profileResponse = await getUser();
 * const constants = getConstantsByProfile(profileResponse);
 * // Now use constants?.save, constants?.[key]
 */
export const getConstantsByProfile = (
  profileResponse:
    | ApiResponse<User>
    | User
    | { preferredLanguage?: string; preferred_language?: string; data?: any }
    | null
    | undefined
): AppConstants => {
  if (!profileResponse) return activeConstants;

  const data = (profileResponse as any)?.data || profileResponse;
  const lang = data?.preferredLanguage || data?.preferred_language;

  if (lang) {
    return setAppLanguage(lang);
  }
  return activeConstants;
};

/**
 * React hook to access application constants according to the user's preferred language.
 * Subscribes to global language changes so all screens re-render automatically when
 * the language is updated from the DB or AsyncStorage.
 *
 * Example:
 * const constants = useAppConstants();
 * return <Text>{constants?.save}</Text>;
 */
export const useAppConstants = (
  preferredLangOverride?: PreferredLanguageInput
): AppConstants => {
  const [constants, setConstants] = useState<AppConstants>(() => {
    if (preferredLangOverride) {
      return APP_TRANSLATIONS[normalizeLanguage(preferredLangOverride)];
    }
    return activeConstants;
  });

  useEffect(() => {
    if (preferredLangOverride) {
      const normalized = normalizeLanguage(preferredLangOverride);
      setConstants(APP_TRANSLATIONS[normalized] || APP_TRANSLATIONS.english);
      return;
    }

    // Always synchronize with active constants
    setConstants(activeConstants);

    // Subscribe to reactive language changes across all screens
    const unsubscribe = subscribeToLanguageChange((_lang, newConstants) => {
      setConstants(newConstants);
    });

    return unsubscribe;
  }, [preferredLangOverride]);

  return constants;
};
