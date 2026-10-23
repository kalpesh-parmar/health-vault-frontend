import { DailyBreakdownItem } from "../types/adherence";

export interface AdherenceColorPalette {
  completedEarly: string;
  completedOnTime: string;
  completedLate: string;
  completedUnknown: string;
  overdue: string;
  missed: string;
  overdueAndMissed: string;
  pending: string;
  skipped: string;
  trackBackground: string;
  gridLine: string;
  axisText: string;
  todayHighlight: string;
}

export const ADHERENCE_COLORS: AdherenceColorPalette = {
  completedEarly: "#06B6D4", // Cyan / Teal for Early
  completedOnTime: "#6366F1", // Indigo / Lavender
  completedLate: "#3B82F6", // Sapphire Blue (distinct from On-Time and Overdue)
  completedUnknown: "#A5B4FC", // Soft Muted Purple
  overdue: "#EF4444", // Coral Red
  missed: "#DC2626", // Deep Red
  overdueAndMissed: "#EF4444", // Combined red for overdue/missed
  pending: "#F59E0B", // Amber Orange
  skipped: "#94A3B8", // Slate Gray
  trackBackground: "#E2E8F0",
  gridLine: "#CBD5E1",
  axisText: "#64748B",
  todayHighlight: "#4F46E5",
};

export const ADHERENCE_DARK_COLORS: AdherenceColorPalette = {
  completedEarly: "#22D3EE", // Bright Cyan
  completedOnTime: "#818CF8",
  completedLate: "#60A5FA",
  completedUnknown: "#C7D2FE",
  overdue: "#F87171",
  missed: "#EF4444",
  overdueAndMissed: "#F87171",
  pending: "#FBBF24",
  skipped: "#64748B",
  trackBackground: "#334155",
  gridLine: "#334155",
  axisText: "#94A3B8",
  todayHighlight: "#6366F1",
};

export interface StackedSegment {
  key: string;
  count: number;
  color: string;
  y: number;
  height: number;
}

export interface DayColumnLayout {
  date: string;
  dayLabel: string;
  isToday: boolean;
  total: number;
  x: number;
  segments: StackedSegment[];
  totalHeight: number;
  topY: number;
}

/**
 * Calculates the y-positions and heights of each mutually exclusive segment for a day column.
 * Stacking Order (from bottom to top):
 * 1. Completed Early (Cyan)
 * 2. Completed On Time (Indigo)
 * 3. Completed Late (Blue)
 * 4. Completed Unknown (Muted Purple)
 * 5. Overdue & Missed (Red)
 * 6. Pending (Amber)
 * 7. Skipped (Slate)
 */
export function calculateStackedBarLayout({
  dailyBreakdown,
  chartWidth,
  chartHeight,
  isDark = false,
  barWidth = 24,
  minMaxScale = 4,
}: {
  dailyBreakdown: DailyBreakdownItem[];
  chartWidth: number;
  chartHeight: number;
  isDark?: boolean;
  barWidth?: number;
  minMaxScale?: number;
}): {
  columns: DayColumnLayout[];
  maxScale: number;
  gridLines: { value: number; y: number }[];
} {
  const palette = isDark ? ADHERENCE_DARK_COLORS : ADHERENCE_COLORS;

  const rawMax = Math.max(
    ...dailyBreakdown.map((d) => {
      const sum =
        (d.completedEarly || 0) +
        (d.completedOnTime || 0) +
        (d.completedLate || 0) +
        (d.completedUnknown || 0) +
        (d.overdue || 0) +
        (d.missed || 0) +
        (d.pending || 0) +
        (d.skipped || 0);
      return Math.max(d.total || 0, sum);
    }),
    0,
  );

  const maxScale = Math.max(rawMax, minMaxScale);

  const numDays = Math.max(dailyBreakdown.length, 1);
  const columnSpacing = chartWidth / numDays;

  const columns: DayColumnLayout[] = dailyBreakdown.map((day, idx) => {
    const x = idx * columnSpacing + (columnSpacing - barWidth) / 2;

    const segmentsRaw = [
      {
        key: "completedEarly",
        count: day.completedEarly || 0,
        color: palette.completedEarly,
      },
      {
        key: "completedOnTime",
        count: day.completedOnTime || 0,
        color: palette.completedOnTime,
      },
      {
        key: "completedLate",
        count: day.completedLate || 0,
        color: palette.completedLate,
      },
      {
        key: "completedUnknown",
        count: day.completedUnknown || 0,
        color: palette.completedUnknown,
      },
      {
        key: "overdueAndMissed",
        count: (day.overdue || 0) + (day.missed || 0),
        color: palette.overdueAndMissed,
      },
      {
        key: "pending",
        count: day.pending || 0,
        color: palette.pending,
      },
      {
        key: "skipped",
        count: day.skipped || 0,
        color: palette.skipped,
      },
    ];

    let currentBottomY = chartHeight;
    const computedSegments: StackedSegment[] = [];

    for (const seg of segmentsRaw) {
      if (seg.count <= 0) continue;
      const height = (seg.count / maxScale) * chartHeight;
      const y = currentBottomY - height;
      computedSegments.push({
        key: seg.key,
        count: seg.count,
        color: seg.color,
        y,
        height,
      });
      currentBottomY = y;
    }

    const totalHeight = chartHeight - currentBottomY;
    const topY = currentBottomY;

    return {
      date: day.date,
      dayLabel: day.dayLabel,
      isToday: day.isToday,
      total: day.total,
      x,
      segments: computedSegments,
      totalHeight,
      topY,
    };
  });

  const midScale = Math.ceil(maxScale / 2);
  const gridLines = [
    { value: maxScale, y: 0 },
    { value: midScale, y: chartHeight / 2 },
    { value: 0, y: chartHeight },
  ];

  return {
    columns,
    maxScale,
    gridLines,
  };
}

/**
 * Format date string (YYYY-MM-DD) into full readable header (e.g. "Wednesday, Oct 21, 2026")
 */
export function formatFullDateHeader(dateStr?: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

/**
 * Normalizes segmented ratios so their sum does not exceed 1.0 (preventing visual overflow)
 */
export function clampSegmentedRatios(ratios: {
  overdueRatio?: number;
  completedRatio?: number;
  pendingRatio?: number;
  skippedRatio?: number;
}): {
  overdueRatio: number;
  completedRatio: number;
  pendingRatio: number;
  skippedRatio: number;
} {
  const o = Math.max(0, ratios.overdueRatio || 0);
  const c = Math.max(0, ratios.completedRatio || 0);
  const p = Math.max(0, ratios.pendingRatio || 0);
  const s = Math.max(0, ratios.skippedRatio || 0);

  const sum = o + c + p + s;
  if (sum <= 1.0 || sum === 0) {
    return { overdueRatio: o, completedRatio: c, pendingRatio: p, skippedRatio: s };
  }

  // Scale down proportionately to fit 1.0 exactly
  return {
    overdueRatio: Number((o / sum).toFixed(4)),
    completedRatio: Number((c / sum).toFixed(4)),
    pendingRatio: Number((p / sum).toFixed(4)),
    skippedRatio: Number((s / sum).toFixed(4)),
  };
}

/**
 * Safely adds or subtracts days to a YYYY-MM-DD date string in UTC
 */
export function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd, 12, 0, 0));
  const rY = dt.getUTCFullYear();
  const rM = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const rD = String(dt.getUTCDate()).padStart(2, "0");
  return `${rY}-${rM}-${rD}`;
}

/**
 * Formats a 7-day range for display (e.g. "16 Oct – 22 Oct" or "25 Dec 2025 – 31 Dec 2025")
 */
export function formatDateRange(startDateStr?: string, endDateStr?: string): string {
  if (!startDateStr || !endDateStr) return "";
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);

  const startDt = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const endDt = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  const startMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(startDt);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(endDt);

  if (sy === ey) {
    return `${sd} ${startMonth} – ${ed} ${endMonth}`;
  }
  return `${sd} ${startMonth} ${sy} – ${ed} ${endMonth} ${ey}`;
}
