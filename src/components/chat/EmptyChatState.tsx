import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface EmptyChatStateProps {
  isDark: boolean;
  suggestedQuestions: string[];
  onPressQuestion: (question: string) => void;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  isDark,
  suggestedQuestions,
  onPressQuestion,
}) => {
  const cardBgColor = isDark ? "#1e293b" : "#ffffff";
  const titleColor = isDark ? "#ffffff" : "#1e293b";
  const textColor = isDark ? "#cbd5e1" : "#475569";
  const subColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Bot Icon Indicator */}
      <View style={styles.botIconWrapper}>
        <LinearGradient
          colors={["#5B4BFF", "#7C6CFF"]}
          style={styles.botIconGradient}
        >
          <Ionicons name="sparkles" size={28} color="#ffffff" />
        </LinearGradient>
      </View>

      <Text style={[styles.welcomeTitle, { color: titleColor }]}>
        How can I help you today?
      </Text>
      <Text style={[styles.welcomeSub, { color: subColor }]}>
        Dr. Health AI can analyze your uploaded medical reports, explain symptoms, or answer general health questions securely.
      </Text>

      {/* Capability Cards */}
      <View style={styles.capabilitiesContainer}>
        <View style={[styles.capCard, { backgroundColor: cardBgColor }]}>
          <View style={[styles.iconBadge, { backgroundColor: "rgba(91, 75, 255, 0.15)" }]}>
            <Ionicons name="document-text-outline" size={20} color="#5B4BFF" />
          </View>
          <View style={styles.capContent}>
            <Text style={[styles.capTitle, { color: titleColor }]}>Analyze Documents</Text>
            <Text style={[styles.capText, { color: textColor }]}>
              Select an uploaded medical report to ask follow-up questions, summarize insights, or check details.
            </Text>
          </View>
        </View>

        <View style={[styles.capCard, { backgroundColor: cardBgColor }]}>
          <View style={[styles.iconBadge, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0ea5e9" />
          </View>
          <View style={styles.capContent}>
            <Text style={[styles.capTitle, { color: titleColor }]}>100% Secure & Local</Text>
            <Text style={[styles.capText, { color: textColor }]}>
              All analysis and conversations are processed securely to safeguard patient privacy.
            </Text>
          </View>
        </View>

        <View style={[styles.capCard, { backgroundColor: cardBgColor }]}>
          <View style={[styles.iconBadge, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
            <Ionicons name="leaf-outline" size={20} color="#22c55e" />
          </View>
          <View style={styles.capContent}>
            <Text style={[styles.capTitle, { color: titleColor }]}>General Guidance</Text>
            <Text style={[styles.capText, { color: textColor }]}>
              Ask about diets, lifestyle updates, symptoms, and more. *Always consult clinical doctors for diagnostics.*
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: "center",
  },
  botIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 16,
  },
  botIconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 10,
    marginBottom: 28,
    fontWeight: "500",
  },
  capabilitiesContainer: {
    width: "100%",
    gap: 12,
  },
  capCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  capContent: {
    flex: 1,
  },
  capTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  capText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
