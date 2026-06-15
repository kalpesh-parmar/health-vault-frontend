import React from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface SuggestedQuestionChipProps {
  questions: string[];
  onPressQuestion: (question: string) => void;
  isDark: boolean;
}

const AnimatedTouch = Animated.createAnimatedComponent(TouchableOpacity);

const ChipItem: React.FC<{
  text: string;
  onPress: () => void;
  isDark: boolean;
}> = ({ text, onPress, isDark }) => {
  const scale = useSharedValue(1.0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 12 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, { damping: 12 });
  };

  const pillBg = isDark ? "#0f172a" : "#ffffff";
  const textColor = isDark ? "#cbd5e1" : "#4f46e5";

  return (
    <AnimatedTouch
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[styles.chipWrapper, animatedStyle]}
    >
      <LinearGradient
        colors={["#5B4BFF", "#7C6CFF", "#9B8FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={[styles.innerPill, { backgroundColor: pillBg }]}>
          <Text style={[styles.pillText, { color: textColor }]}>{text}</Text>
        </View>
      </LinearGradient>
    </AnimatedTouch>
  );
};

export const SuggestedQuestionChip: React.FC<SuggestedQuestionChipProps> = ({
  questions,
  onPressQuestion,
  isDark,
}) => {
  return (
    <View style={styles.scrollContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {questions.map((q, idx) => (
          <ChipItem
            key={`chip-${idx}`}
            text={q}
            onPress={() => onPressQuestion(q)}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    width: "100%",
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  gradientBorder: {
    padding: 1.5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  innerPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
