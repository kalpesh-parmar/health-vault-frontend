import React from "react";
import { View, StyleSheet, Text } from "react-native";
import {
  clampSegmentedRatios,
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../../utils/adherenceChartHelpers";
import { useAppTheme } from "../../context/ThemeContext";

interface SegmentedProgressBarProps {
  ratios: {
    overdueRatio?: number;
    completedRatio?: number;
    pendingRatio?: number;
    skippedRatio?: number;
  };
  hasData: boolean;
  height?: number;
}

export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  ratios,
  hasData,
  height = 14,
}) => {
  const { isDark } = useAppTheme();
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyTrack,
            { height, backgroundColor: palette.trackBackground },
          ]}
        />
        <Text style={[styles.emptyLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
          No adherence data for this month
        </Text>
      </View>
    );
  }

  const { overdueRatio, completedRatio, pendingRatio, skippedRatio } =
    clampSegmentedRatios(ratios);

  const totalProportion = overdueRatio + completedRatio + pendingRatio + skippedRatio;
  if (totalProportion <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyTrack,
            { height, backgroundColor: palette.trackBackground },
          ]}
        />
        <Text style={[styles.emptyLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
          No activity recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          { height, backgroundColor: palette.trackBackground },
        ]}
      >
        {overdueRatio > 0 && (
          <View
            style={{
              flex: overdueRatio,
              backgroundColor: palette.overdueAndMissed,
              height: "100%",
            }}
          />
        )}
        {completedRatio > 0 && (
          <View
            style={{
              flex: completedRatio,
              backgroundColor: palette.completedOnTime,
              height: "100%",
            }}
          />
        )}
        {pendingRatio > 0 && (
          <View
            style={{
              flex: pendingRatio,
              backgroundColor: palette.pending,
              height: "100%",
            }}
          />
        )}
        {skippedRatio > 0 && (
          <View
            style={{
              flex: skippedRatio,
              backgroundColor: palette.skipped,
              height: "100%",
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 10,
  },
  track: {
    width: "100%",
    borderRadius: 7,
    overflow: "hidden",
    flexDirection: "row",
  },
  emptyContainer: {
    width: "100%",
    marginVertical: 10,
    alignItems: "center",
  },
  emptyTrack: {
    width: "100%",
    borderRadius: 7,
    opacity: 0.6,
  },
  emptyLabel: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
});
