import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ChartDataPoint {
  date: string;
  displayDate?: string;
  value: number;
  unit: string;
  status?: string;
  documentId?: string;
  documentName?: string;
  pageNo?: number;
}

interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
}

interface TrendSummary {
  min: number;
  max: number;
  mean: number;
  count: number;
  latest: number;
  latestDate?: string;
}

export interface MedicalTrendChartProps {
  chart: {
    metric: string;
    metricLabel: string;
    unit: string;
    granularity: "date" | "month" | "year";
    dataPoints: ChartDataPoint[];
    referenceRange?: ReferenceRange | null;
    summary?: TrendSummary | null;
  };
  explanation?: string;
  isDark?: boolean;
  onViewSourceReport?: (documentId: string, pageNo?: number) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const CHART_HEIGHT = 180;
const PADDING = { top: 20, right: 24, bottom: 32, left: 40 };

export const MedicalTrendChartCard: React.FC<MedicalTrendChartProps> = ({
  chart,
  explanation,
  isDark = false,
  onViewSourceReport,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);

  const rawPoints = Array.isArray(chart?.dataPoints)
    ? chart.dataPoints
    : Array.isArray((chart as any)?.points)
      ? (chart as any).points
      : [];

  const dataPoints: ChartDataPoint[] = rawPoints.map((p: any) => ({
    date: p.date,
    displayDate: p.displayDate || p.label || p.date,
    value: Number(p.value),
    unit: p.unit || chart?.unit || (chart as any)?.canonicalUnit || "",
    status: p.status || (p.isAbnormal ? "ABNORMAL" : "NORMAL"),
    documentId: p.documentId || undefined,
    documentName: p.documentName || undefined,
    pageNo: p.pageNo || p.pageNumber || undefined,
  }));

  const metricLabel = chart?.metricLabel || (chart as any)?.title || "Medical Trend";
  const unit = chart?.unit || (chart as any)?.canonicalUnit || "";

  let referenceRange = chart?.referenceRange;
  if (referenceRange && (referenceRange.min == null || referenceRange.max == null)) {
    if ((referenceRange as any).low != null && (referenceRange as any).high != null) {
      referenceRange = {
        min: (referenceRange as any).low,
        max: (referenceRange as any).high,
        unit: referenceRange.unit || unit,
      };
    }
  }

  let summary = chart?.summary;
  if (summary && summary.latest == null && (summary as any).latestValue != null) {
    const vals = dataPoints.map((p) => p.value).filter((v) => !isNaN(v));
    summary = {
      latest: (summary as any).latestValue,
      min: (summary as any).min ?? (vals.length > 0 ? Math.min(...vals) : 0),
      max: (summary as any).max ?? (vals.length > 0 ? Math.max(...vals) : 0),
      mean: (summary as any).mean ?? (vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0),
      count: (summary as any).totalPoints ?? dataPoints.length,
      latestDate: dataPoints[dataPoints.length - 1]?.date,
    };
  }

  if (!chart || dataPoints.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.title, isDark && styles.textDark]}>
          {metricLabel}
        </Text>
        <Text style={[styles.noDataText, isDark && styles.textMutedDark]}>
          No historical observation points available for visualization.
        </Text>
      </View>
    );
  }

  // Compute graph bounds
  const values = dataPoints.map((d) => d.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  if (referenceRange) {
    minVal = Math.min(minVal, referenceRange.min);
    maxVal = Math.max(maxVal, referenceRange.max);
  }

  // Margin buffer
  const valRange = Math.max(maxVal - minVal, 1);
  const yMin = Math.max(0, minVal - valRange * 0.15);
  const yMax = maxVal + valRange * 0.15;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const getX = (idx: number) => {
    if (dataPoints.length === 1) return PADDING.left + innerWidth / 2;
    return PADDING.left + (idx / (dataPoints.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return PADDING.top + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  // Generate SVG path for line
  let linePath = "";
  dataPoints.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.value);
    if (idx === 0) {
      linePath += `M ${x} ${y}`;
    } else {
      linePath += ` L ${x} ${y}`;
    }
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={20}
            color={isDark ? "#38bdf8" : "#0284c7"}
          />
          <Text style={[styles.title, isDark && styles.textDark]}>
            {metricLabel}
          </Text>
        </View>
        <Text style={[styles.unitBadge, isDark && styles.unitBadgeDark]}>
          {unit}
        </Text>
      </View>

      {/* Summary KPI Strip */}
      {summary && (
        <View style={[styles.kpiContainer, isDark && styles.kpiContainerDark]}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiLabel, isDark && styles.textMutedDark]}>Latest</Text>
            <Text style={[styles.kpiValue, isDark && styles.textDark]}>
              {summary.latest} <Text style={styles.kpiUnit}>{unit}</Text>
            </Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiLabel, isDark && styles.textMutedDark]}>Average</Text>
            <Text style={[styles.kpiValue, isDark && styles.textDark]}>
              {summary.mean} <Text style={styles.kpiUnit}>{unit}</Text>
            </Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiLabel, isDark && styles.textMutedDark]}>Range</Text>
            <Text style={[styles.kpiValue, isDark && styles.textDark]}>
              {summary.min} - {summary.max}
            </Text>
          </View>
        </View>
      )}

      {/* Interactive Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="refRangeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </LinearGradient>
          </Defs>

          {/* Reference range band if available */}
          {referenceRange && (
            <Rect
              x={PADDING.left}
              y={getY(referenceRange.max)}
              width={innerWidth}
              height={Math.max(2, getY(referenceRange.min) - getY(referenceRange.max))}
              fill="url(#refRangeGrad)"
              stroke="#10b981"
              strokeDasharray="4, 4"
              strokeWidth="0.8"
            />
          )}

          {/* Grid lines */}
          <Line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top}
            stroke={isDark ? "#334155" : "#e2e8f0"}
            strokeDasharray="3, 3"
          />
          <Line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight / 2}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight / 2}
            stroke={isDark ? "#334155" : "#e2e8f0"}
            strokeDasharray="3, 3"
          />
          <Line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight}
            stroke={isDark ? "#475569" : "#cbd5e1"}
          />

          {/* Y Axis Labels */}
          <SvgText
            x={PADDING.left - 6}
            y={PADDING.top + 4}
            fontSize="10"
            fill={isDark ? "#94a3b8" : "#64748b"}
            textAnchor="end"
          >
            {yMax.toFixed(0)}
          </SvgText>
          <SvgText
            x={PADDING.left - 6}
            y={PADDING.top + innerHeight}
            fontSize="10"
            fill={isDark ? "#94a3b8" : "#64748b"}
            textAnchor="end"
          >
            {yMin.toFixed(0)}
          </SvgText>

          {/* Trend Line */}
          {dataPoints.length > 1 && (
            <Path
              d={linePath}
              fill="none"
              stroke={isDark ? "#38bdf8" : "#0284c7"}
              strokeWidth="2.5"
            />
          )}

          {/* Data Points */}
          {dataPoints.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.value);
            const isAbnormal = pt.status === "ABNORMAL" || pt.status === "HIGH" || pt.status === "LOW";
            const isSelected = selectedPoint?.date === pt.date && selectedPoint?.value === pt.value;

            return (
              <G key={`pt-${idx}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6.5 : 4.5}
                  fill={isAbnormal ? "#ef4444" : "#10b981"}
                  stroke={isDark ? "#0f172a" : "#ffffff"}
                  strokeWidth="2"
                />
                {/* X Axis Date labels for first, middle, last */}
                {(idx === 0 || idx === dataPoints.length - 1 || (dataPoints.length > 2 && idx === Math.floor(dataPoints.length / 2))) && (
                  <SvgText
                    x={cx}
                    y={PADDING.top + innerHeight + 16}
                    fontSize="9"
                    fill={isDark ? "#94a3b8" : "#64748b"}
                    textAnchor="middle"
                  >
                    {pt.displayDate || pt.date.slice(5)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>

        {/* Touch layer for selecting points */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
          {dataPoints.map((pt, idx) => (
            <TouchableOpacity
              key={`touch-${idx}`}
              style={{
                flex: 1,
                height: CHART_HEIGHT,
              }}
              onPress={() => setSelectedPoint(pt)}
              activeOpacity={0.6}
            />
          ))}
        </View>
      </View>

      {/* Selected Point Inspection Tooltip */}
      {selectedPoint && (
        <View style={[styles.tooltipCard, isDark && styles.tooltipCardDark]}>
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipDate, isDark && styles.textDark]}>
              📅 {selectedPoint.displayDate || selectedPoint.date}
            </Text>
            <View
              style={[
                styles.statusTag,
                selectedPoint.status === "ABNORMAL" || selectedPoint.status === "HIGH"
                  ? styles.statusAbnormal
                  : styles.statusNormal,
              ]}
            >
              <Text style={styles.statusTagText}>
                {selectedPoint.status || "VERIFIED"}
              </Text>
            </View>
          </View>

          <Text style={[styles.tooltipValue, isDark && styles.textDark]}>
            {metricLabel}: <Text style={{ fontWeight: "700" }}>{selectedPoint.value} {selectedPoint.unit}</Text>
          </Text>

          {(selectedPoint.documentName || selectedPoint.documentId) && (
            <TouchableOpacity
              style={styles.sourceDocRow}
              onPress={() => {
                if (selectedPoint.documentId && onViewSourceReport) {
                  onViewSourceReport(selectedPoint.documentId, selectedPoint.pageNo);
                }
              }}
            >
              <MaterialCommunityIcons name="file-document-outline" size={14} color="#0284c7" />
              <Text style={styles.sourceDocText} numberOfLines={1}>
                {selectedPoint.documentName || "Medical Report"} {selectedPoint.pageNo ? `(p. ${selectedPoint.pageNo})` : ""}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MedGemma Grounded Explanation */}
      {explanation ? (
        <View style={[styles.explanationContainer, isDark && styles.explanationContainerDark]}>
          <Text style={[styles.explanationText, isDark && styles.textDark]}>
            {explanation}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  containerDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  unitBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitBadgeDark: {
    backgroundColor: "#0369a1",
    color: "#e0f2fe",
  },
  kpiContainer: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  kpiContainerDark: {
    backgroundColor: "#0f172a",
  },
  kpiBox: {
    flex: 1,
    alignItems: "center",
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#cbd5e1",
  },
  kpiLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  kpiUnit: {
    fontSize: 10,
    fontWeight: "400",
    color: "#64748b",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  tooltipCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tooltipCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusNormal: {
    backgroundColor: "#dcfce7",
  },
  statusAbnormal: {
    backgroundColor: "#fee2e2",
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#166534",
  },
  tooltipValue: {
    fontSize: 13,
    color: "#1e293b",
    marginTop: 2,
  },
  sourceDocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  sourceDocText: {
    fontSize: 11,
    color: "#0284c7",
    textDecorationLine: "underline",
  },
  explanationContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  explanationContainerDark: {
    borderTopColor: "#334155",
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  noDataText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginVertical: 12,
  },
  textDark: {
    color: "#f8fafc",
  },
  textMutedDark: {
    color: "#94a3b8",
  },
});
