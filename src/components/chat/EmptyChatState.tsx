import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
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
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
  const dividerColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      style={styles.scrollView}
    >
      <View style={[styles.welcomeCard, { backgroundColor: cardBgColor, borderColor }]}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <LinearGradient
              colors={["#5B4BFF", "#7C6CFF"]}
              style={styles.botIconGradient}
            >
              <Ionicons name="sparkles" size={18} color="#ffffff" />
            </LinearGradient>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.welcomeTitle, { color: titleColor }]}>Dr. Health AI</Text>
            <Text style={[styles.welcomeSub, { color: "#22c55e" }]}>🟢 Local Medical Assistant</Text>
          </View>
        </View>

        {/* Main Intro Text */}
        <Text style={[styles.introText, { color: textColor }]}>
          A secure local AI pipeline to analyze medical reports, explain clinical terminology, and provide general health guidance.
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Compact Capability List */}
        <View style={styles.capabilitiesContainer}>
          {/* Item 1 */}
          <View style={styles.capRow}>
            <View style={[styles.capIconBadge, { backgroundColor: "rgba(91, 75, 255, 0.12)" }]}>
              <Ionicons name="document-text-outline" size={15} color="#5B4BFF" />
            </View>
            <View style={styles.capContent}>
              <Text style={[styles.capTitle, { color: titleColor }]}>Analyze Documents</Text>
              <Text style={[styles.capText, { color: subColor }]}>
                Ask follow-up questions, summarize insights, and check report ranges.
              </Text>
            </View>
          </View>

          {/* Item 2 */}
          <View style={styles.capRow}>
            <View style={[styles.capIconBadge, { backgroundColor: "rgba(14, 165, 233, 0.12)" }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#0ea5e9" />
            </View>
            <View style={styles.capContent}>
              <Text style={[styles.capTitle, { color: titleColor }]}>100% Secure & Local</Text>
              <Text style={[styles.capText, { color: subColor }]}>
                Processed locally on device server to completely protect patient privacy.
              </Text>
            </View>
          </View>

          {/* Item 3 */}
          <View style={styles.capRow}>
            <View style={[styles.capIconBadge, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
              <Ionicons name="leaf-outline" size={15} color="#22c55e" />
            </View>
            <View style={styles.capContent}>
              <Text style={[styles.capTitle, { color: titleColor }]}>General Guidance</Text>
              <Text style={[styles.capText, { color: subColor }]}>
                Explore diets, lifestyle tips, and symptoms. Always consult clinical doctors.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 12,
  },
  botIconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  welcomeSub: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  introText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  capabilitiesContainer: {
    width: "100%",
    gap: 12,
  },
  capRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  capIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  capContent: {
    flex: 1,
  },
  capTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  capText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
});
