import { useState, useEffect } from "react";
import {
  getActiveLanguage,
  subscribeToLanguageChange,
  SupportedLanguage,
} from "../utils/translationUtils";

export const usePreferredLanguage = (): SupportedLanguage => {
  const [lang, setLang] = useState<SupportedLanguage>(getActiveLanguage);

  useEffect(() => {
    setLang(getActiveLanguage());

    const unsubscribe = subscribeToLanguageChange((newLang) => {
      setLang(newLang);
    });

    return unsubscribe;
  }, []);

  return lang;
};
