import React from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle, G, Defs, LinearGradient, Stop } from "react-native-svg";
import { useAppTheme } from "../../context/ThemeContext";
import {
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../../utils/adherenceChartHelpers";

interface CircularAdherenceProgressProps {
  percentage: number | null;
  hasData: boolean;
  size?: number;
  strokeWidth?: number;
  onTimePercentage?: number | null;
  latePercentage?: number | null;
}

export const CircularAdherenceProgress: React.FC<
  CircularAdherenceProgressProps
> = ({
  percentage,
  hasData,
  size = 110,
  strokeWidth = 10,
}) => {
  const { isDark } = useAppTheme();
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const validPercentage =
    hasData && percentage !== null && !isNaN(percentage)
      ? Math.max(0, Math.min(100, percentage))
      : null;

  const strokeDashoffset =
    validPercentage !== null
      ? circumference - (validPercentage / 100) * circumference
      : circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="adherenceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F46E5" />
            <Stop offset="50%" stopColor="#6366F1" />
            <Stop offset="100%" stopColor="#818CF8" />
          </LinearGradient>
        </Defs>

        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background track circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={palette.trackBackground}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Foreground progress arc */}
          {validPercentage !== null && validPercentage > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#adherenceGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </G>
      </Svg>

      {/* Center Percentage Display */}
      <View style={styles.centerTextContainer}>
        {validPercentage !== null ? (
          <>
            <Text
              style={[
                styles.percentageText,
                { color: isDark ? "#F8FAFC" : "#0F172A" },
              ]}
              numberOfLines={1}
            >
              {Math.round(validPercentage)}%
            </Text>
            <Text
              style={[
                styles.labelText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Adherence
            </Text>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.percentageText,
                { color: isDark ? "#64748B" : "#94A3B8", fontSize: 20 },
              ]}
            >
              --%
            </Text>
            <Text
              style={[
                styles.labelText,
                { color: isDark ? "#64748B" : "#94A3B8" },
              ]}
            >
              No Data
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  labelText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
