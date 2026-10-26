import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";

interface AdherenceSkeletonProps {
  type?: "weekly" | "monthly" | "refill" | "card";
  height?: number;
}

export const AdherenceSkeletonLoader: React.FC<AdherenceSkeletonProps> = ({
  type = "card",
  height,
}) => {
  const { isDark } = useAppTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacityAnim]);

  const baseColor = isDark ? "#1E293B" : "#F1F5F9";
  const shimmerColor = isDark ? "#334155" : "#E2E8F0";

  if (type === "weekly") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: baseColor, height: height || 270 },
        ]}
      >
        <Animated.View
          style={[
            styles.shimmerBox,
            { width: "40%", height: 20, backgroundColor: shimmerColor, opacity: opacityAnim },
          ]}
        />
        <View style={styles.kpiRow}>
          {[1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.kpiBox,
                { backgroundColor: shimmerColor, opacity: opacityAnim },
              ]}
            />
          ))}
        </View>
        <Animated.View
          style={[
            styles.chartPlaceholder,
            { backgroundColor: shimmerColor, opacity: opacityAnim },
          ]}
        />
      </View>
    );
  }

  if (type === "monthly") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: baseColor, height: height || 190 },
        ]}
      >
        <Animated.View
          style={[
            styles.shimmerBox,
            { width: "50%", height: 20, backgroundColor: shimmerColor, opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.barPlaceholder,
            { backgroundColor: shimmerColor, opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.shimmerBox,
            { width: "80%", height: 16, backgroundColor: shimmerColor, opacity: opacityAnim },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: baseColor, height: height || 150 },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerBox,
          { width: "60%", height: 18, backgroundColor: shimmerColor, opacity: opacityAnim },
        ]}
      />
      <Animated.View
        style={[
          styles.shimmerBox,
          { width: "40%", height: 14, backgroundColor: shimmerColor, opacity: opacityAnim, marginTop: 8 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
  },
  shimmerBox: {
    borderRadius: 6,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
  },
  kpiBox: {
    width: "30%",
    height: 52,
    borderRadius: 12,
  },
  chartPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginTop: 8,
  },
  barPlaceholder: {
    width: "100%",
    height: 16,
    borderRadius: 8,
    marginVertical: 18,
  },
});
