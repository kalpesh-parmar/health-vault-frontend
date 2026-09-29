import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { I18N_ONBOARDING_UI } from "../OnboardingI18n";

export interface SuccessCardProps {
  count: number;
  isDark: boolean;
  onViewMedicines: () => void;
  preferredLang?: string;
}

export const SuccessCard = React.memo(function SuccessCard({
  count,
  isDark,
  onViewMedicines,
  preferredLang = "english",
}: SuccessCardProps) {
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const getDescription = () => {
    const lang = preferredLang || "english";
    const descMap: Record<string, string> = {
      english: `${count} medicine(s) have been added to your profile.`,
      gujarati: `${count} દવા(ઓ) તમારી પ્રોફાઇલમાં ઉમેરવામાં આવી છે.`,
      hindi: `${count} दवाएं आपकी प्रोफाइल में जोड़ दी गई हैं।`,
      marathi: `${count} औषधे तुमच्या प्रोफाइलमध्ये जोडली गेली आहेत.`,
      tamil: `${count} மருந்து(கள்) உங்கள் சுயவிவரத்தில் சேர்க்கப்பட்டுள்ளன.`,
    };
    return descMap[lang] || descMap.english;
  };

  const getViewMedicinesText = () => {
    const lang = preferredLang || "english";
    const viewMap: Record<string, string> = {
      english: "View My Medicines",
      gujarati: "મારી દવાઓ જુઓ",
      hindi: "मेरी दवाएं देखें",
      marathi: "माझी औषधे पहा",
      tamil: "எனது மருந்துகளைப் பார்க்கவும்",
    };
    return viewMap[lang] || viewMap.english;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          alignItems: "center",
          paddingVertical: 24,
        },
      ]}
    >
      {/* Checkmark circle graphic illustration */}
      <View style={styles.successIconWrapper}>
        <View style={styles.successPulseBg} />
        <Ionicons name="checkmark-circle" size={72} color="#10b981" />
      </View>

      <Text
        style={[
          styles.successTitle,
          { color: isDark ? "#f8fafc" : "#1e293b" },
        ]}
      >
        {t("medicinesAddedSuccess") || "Medicines Added Successfully!"}
      </Text>

      <Text
        style={[
          styles.successDescription,
          { color: isDark ? "#cbd5e1" : "#64748b" },
        ]}
      >
        {getDescription()}
      </Text>

      <TouchableOpacity
        onPress={onViewMedicines}
        style={[
          styles.primaryButton,
          { backgroundColor: "#3b82f6", width: "85%", marginTop: 12 },
        ]}
      >
        <Text style={styles.primaryButtonText}>{getViewMedicinesText()}</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    width: "100%",
  },
  successIconWrapper: {
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  successPulseBg: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  successTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  successDescription: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
