import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface TypingIndicatorProps {
  isDark: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isDark }) => {
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    const bounce = (val: SharedValue<number>, delay: number) => {
      val.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 })
          ),
          -1,
          true
        )
      );
    };

    bounce(dot1Y, 0);
    bounce(dot2Y, 150);
    bounce(dot3Y, 300);
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }],
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }],
  }));
  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }],
  }));

  const bgColor = isDark ? "#1e293b" : "#ffffff";
  const dotColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, animatedStyle1]} />
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, animatedStyle2]} />
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, animatedStyle3]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingLeft: 12,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    minHeight: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});
export default TypingIndicator;
