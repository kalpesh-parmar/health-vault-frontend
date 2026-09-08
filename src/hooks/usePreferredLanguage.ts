import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/ContextAPI';

export const usePreferredLanguage = () => {
  const [lang, setLang] = useState<string>('english');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchLang = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('preferredLanguage');
        if (storedLang) {
          setLang(storedLang.toLowerCase());
        }
      } catch (error) {
        console.warn("Failed to fetch preferredLanguage from AsyncStorage", error);
      }
    };
    fetchLang();
  }, [isAuthenticated]);

  return lang;
};
