import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, LayoutChangeEvent } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { DailyBreakdownItem } from "../../types/adherence";
import {
  calculateStackedBarLayout,
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../../utils/adherenceChartHelpers";
import { useAppTheme } from "../../context/ThemeContext";

interface WeeklyStackedBarChartProps {
  dailyBreakdown: DailyBreakdownItem[];
  onSelectDay: (date: string) => void;
  selectedDate?: string;
  height?: number;
}

export const WeeklyStackedBarChart: React.FC<WeeklyStackedBarChartProps> = ({
  dailyBreakdown,
  onSelectDay,
  selectedDate,
  height = 140,
}) => {
  const { isDark } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;
  const yAxisWidth = 26;
  const chartPlotWidth = Math.max(containerWidth - yAxisWidth, 100);
  const chartPlotHeight = height;
  const barWidth = Math.min(22, Math.max(14, (chartPlotWidth / 7) * 0.45));

  const { columns, gridLines } = calculateStackedBarLayout({
    dailyBreakdown,
    chartWidth: chartPlotWidth,
    chartHeight: chartPlotHeight,
    isDark,
    barWidth,
  });

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <View style={[styles.svgContainer, { height: chartPlotHeight }]}>
        <Svg width={containerWidth} height={chartPlotHeight}>
          {/* Grid lines and y-axis numeric markers */}
          {gridLines.map((gl, idx) => (
            <G key={`grid-${idx}`}>
              <Line
                x1={0}
                y1={gl.y}
                x2={chartPlotWidth}
                y2={gl.y}
                stroke={palette.gridLine}
                strokeWidth={1}
                strokeDasharray={idx === 2 ? undefined : "4, 4"}
              />
              <SvgText
                x={chartPlotWidth + 6}
                y={gl.y + 4}
                fontSize={10}
                fill={palette.axisText}
                textAnchor="start"
              >
                {gl.value}
              </SvgText>
            </G>
          ))}

          {/* Stacked Bars for each day */}
          {columns.map((col) => {
            const hasData = col.segments.length > 0;
            const isSelected = selectedDate === col.date;

            return (
              <G key={`col-${col.date}`}>
                {/* Background placeholder pill when 0 doses */}
                {!hasData && (
                  <Rect
                    x={col.x}
                    y={chartPlotHeight - 4}
                    width={barWidth}
                    height={4}
                    rx={2}
                    ry={2}
                    fill={palette.trackBackground}
                  />
                )}

                {/* Stacked Segments */}
                {col.segments.map((seg, sIdx) => {
                  const isTopSegment = sIdx === col.segments.length - 1;
                  return (
                    <Rect
                      key={`seg-${col.date}-${seg.key}`}
                      x={col.x}
                      y={seg.y}
                      width={barWidth}
                      height={Math.max(seg.height, 2)}
                      rx={isTopSegment ? 4 : 0}
                      ry={isTopSegment ? 4 : 0}
                      fill={seg.color}
                    />
                  );
                })}

                {/* Selection Highlight indicator */}
                {isSelected && (
                  <Rect
                    x={col.x - 2}
                    y={col.topY - 3}
                    width={barWidth + 4}
                    height={Math.max(col.totalHeight + 4, 8)}
                    rx={6}
                    ry={6}
                    fill="none"
                    stroke={palette.todayHighlight}
                    strokeWidth={2}
                  />
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Accessible Day Column Buttons & Labels */}
      <View style={[styles.labelsRow, { width: chartPlotWidth }]}>
        {columns.map((col) => {
          const isSelected = selectedDate === col.date;
          return (
            <TouchableOpacity
              key={`btn-${col.date}`}
              accessibilityRole="button"
              accessibilityLabel={`${col.dayLabel}, ${col.isToday ? "Today, " : ""}${col.total} doses total`}
              accessibilityHint="Tap to view daily breakdown"
              style={[
                styles.dayButton,
                col.isToday && styles.todayButton,
                isSelected && styles.selectedButton,
                {
                  borderColor: isSelected
                    ? palette.todayHighlight
                    : col.isToday
                    ? palette.todayHighlight
                    : "transparent",
                },
              ]}
              onPress={() => onSelectDay(col.date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabelText,
                  { color: isDark ? "#CBD5E1" : "#475569" },
                  col.isToday && { color: palette.todayHighlight, fontWeight: "700" },
                  isSelected && { fontWeight: "800" },
                ]}
              >
                {col.dayLabel}
              </Text>
              {col.isToday && (
                <View
                  style={[
                    styles.todayDot,
                    { backgroundColor: palette.todayHighlight },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingVertical: 8,
  },
  svgContainer: {
    width: "100%",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dayButton: {
    minWidth: 36,
    minHeight: 36,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  todayButton: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  selectedButton: {
    backgroundColor: "rgba(99, 102, 241, 0.16)",
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: "500",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
