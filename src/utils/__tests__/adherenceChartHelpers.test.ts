import {
  calculateStackedBarLayout,
  clampSegmentedRatios,
  formatFullDateHeader,
  addDaysToDateStr,
  formatDateRange,
  ADHERENCE_COLORS,
  ADHERENCE_DARK_COLORS,
} from "../adherenceChartHelpers";
import { DailyBreakdownItem } from "../../types/adherence";

describe("Adherence Chart Helpers Unit Tests", () => {
  const mockDailyBreakdown: DailyBreakdownItem[] = [
    {
      date: "2026-10-15",
      dayLabel: "Thu",
      isToday: false,
      completedEarly: 1,
      completedOnTime: 2,
      completedLate: 1,
      completedUnknown: 0,
      overdue: 1,
      missed: 0,
      pending: 0,
      skipped: 0,
      total: 5,
    },
    {
      date: "2026-10-16",
      dayLabel: "Fri",
      isToday: false,
      completedEarly: 0,
      completedOnTime: 3,
      completedLate: 0,
      completedUnknown: 1,
      overdue: 0,
      missed: 0,
      pending: 0,
      skipped: 1,
      total: 5,
    },
    {
      date: "2026-10-17",
      dayLabel: "Sat",
      isToday: false,
      completedEarly: 0,
      completedOnTime: 0,
      completedLate: 0,
      completedUnknown: 0,
      overdue: 0,
      missed: 0,
      pending: 0,
      skipped: 0,
      total: 0,
    },
    {
      date: "2026-10-18",
      dayLabel: "Sun",
      isToday: false,
      completedEarly: 0,
      completedOnTime: 1,
      completedLate: 2,
      completedUnknown: 0,
      overdue: 2,
      missed: 0,
      pending: 0,
      skipped: 0,
      total: 5,
    },
    {
      date: "2026-10-19",
      dayLabel: "Mon",
      isToday: false,
      completedEarly: 0,
      completedOnTime: 4,
      completedLate: 0,
      completedUnknown: 0,
      overdue: 0,
      missed: 0,
      pending: 0,
      skipped: 0,
      total: 4,
    },
    {
      date: "2026-10-20",
      dayLabel: "Tue",
      isToday: false,
      completedEarly: 0,
      completedOnTime: 2,
      completedLate: 1,
      completedUnknown: 0,
      overdue: 0,
      missed: 0,
      pending: 1,
      skipped: 0,
      total: 4,
    },
    {
      date: "2026-10-21",
      dayLabel: "Wed",
      isToday: true,
      completedEarly: 0,
      completedOnTime: 1,
      completedLate: 0,
      completedUnknown: 0,
      overdue: 1,
      missed: 0,
      pending: 2,
      skipped: 0,
      total: 4,
    },
  ];

  describe("calculateStackedBarLayout", () => {
    test("calculates layout for 7 days with valid scale and columns", () => {
      const result = calculateStackedBarLayout({
        dailyBreakdown: mockDailyBreakdown,
        chartWidth: 350,
        chartHeight: 140,
        isDark: false,
      });

      expect(result.columns.length).toBe(7);
      expect(result.maxScale).toBeGreaterThanOrEqual(5);
      expect(result.gridLines.length).toBe(3);

      // Check first day column
      const thu = result.columns[0];
      expect(thu.dayLabel).toBe("Thu");
      expect(thu.isToday).toBe(false);
      expect(thu.segments.length).toBe(4); // early (1), on-time (2), late (1), overdueAndMissed (1)

      // Stacking order: bottom is early, then on-time, then late, then overdue
      const segEarly = thu.segments.find((s) => s.key === "completedEarly");
      const segOnTime = thu.segments.find((s) => s.key === "completedOnTime");
      const segLate = thu.segments.find((s) => s.key === "completedLate");
      const segOverdue = thu.segments.find((s) => s.key === "overdueAndMissed");

      expect(segEarly).toBeDefined();
      expect(segOnTime).toBeDefined();
      expect(segLate).toBeDefined();
      expect(segOverdue).toBeDefined();

      // Early is at bottom (higher y coordinate in SVG)
      expect(segEarly!.y).toBeGreaterThan(segOnTime!.y);
      // On-time is below late
      expect(segOnTime!.y).toBeGreaterThan(segLate!.y);
      // Late is below overdue
      expect(segLate!.y).toBeGreaterThan(segOverdue!.y);

      // Verify colors: Completed Early must be Cyan (#06B6D4), Late must be Sapphire Blue (#3B82F6), distinct from overdue (#EF4444)
      expect(segEarly!.color).toBe(ADHERENCE_COLORS.completedEarly);
      expect(segLate!.color).toBe(ADHERENCE_COLORS.completedLate);
      expect(segOverdue!.color).toBe(ADHERENCE_COLORS.overdueAndMissed);
      expect(segOnTime!.color).toBe(ADHERENCE_COLORS.completedOnTime);
      expect(segEarly!.color).not.toBe(segOnTime!.color);
      expect(segLate!.color).not.toBe(segOverdue!.color);
      expect(segLate!.color).not.toBe(segOnTime!.color);
    });

    test("handles empty zero-data day without errors or NaN", () => {
      const result = calculateStackedBarLayout({
        dailyBreakdown: mockDailyBreakdown,
        chartWidth: 350,
        chartHeight: 140,
        isDark: false,
      });

      const sat = result.columns[2]; // Sat is 0 doses
      expect(sat.dayLabel).toBe("Sat");
      expect(sat.segments.length).toBe(0);
      expect(sat.totalHeight).toBe(0);
      expect(sat.topY).toBe(140);
      expect(Number.isNaN(sat.x)).toBe(false);
    });

    test("resolves dark theme color palette correctly", () => {
      const result = calculateStackedBarLayout({
        dailyBreakdown: mockDailyBreakdown,
        chartWidth: 350,
        chartHeight: 140,
        isDark: true,
      });

      const thu = result.columns[0];
      const segLate = thu.segments.find((s) => s.key === "completedLate");
      expect(segLate!.color).toBe(ADHERENCE_DARK_COLORS.completedLate);
    });
  });

  describe("clampSegmentedRatios", () => {
    test("preserves valid ratios summing to <= 1.0", () => {
      const input = {
        overdueRatio: 0.14,
        completedRatio: 0.70,
        pendingRatio: 0.16,
        skippedRatio: 0.0,
      };

      const result = clampSegmentedRatios(input);
      expect(result.overdueRatio).toBe(0.14);
      expect(result.completedRatio).toBe(0.70);
      expect(result.pendingRatio).toBe(0.16);
      expect(result.skippedRatio).toBe(0.0);
    });

    test("scales down overflowing ratios so sum <= 1.0", () => {
      const input = {
        overdueRatio: 0.5,
        completedRatio: 0.8,
        pendingRatio: 0.2,
        skippedRatio: 0.1,
      };

      const result = clampSegmentedRatios(input);
      const sum =
        result.overdueRatio +
        result.completedRatio +
        result.pendingRatio +
        result.skippedRatio;
      expect(sum).toBeLessThanOrEqual(1.0001);
    });

    test("handles all zero or undefined ratios safely", () => {
      const result = clampSegmentedRatios({});
      expect(result.overdueRatio).toBe(0);
      expect(result.completedRatio).toBe(0);
      expect(result.pendingRatio).toBe(0);
      expect(result.skippedRatio).toBe(0);
    });
  });

  describe("formatFullDateHeader", () => {
    test("formats valid YYYY-MM-DD string into full readable text", () => {
      const formatted = formatFullDateHeader("2026-10-21");
      expect(formatted).toBe("Wednesday, Oct 21, 2026");
    });

    test("returns empty string on empty or malformed date", () => {
      expect(formatFullDateHeader("")).toBe("");
      expect(formatFullDateHeader(undefined)).toBe("");
      expect(formatFullDateHeader("invalid-date")).toBe("");
    });
  });

  describe("addDaysToDateStr", () => {
    test("adds days forward correctly across months", () => {
      expect(addDaysToDateStr("2026-10-31", 1)).toBe("2026-11-01");
      expect(addDaysToDateStr("2026-10-15", 7)).toBe("2026-10-22");
    });

    test("subtracts days backward correctly across years", () => {
      expect(addDaysToDateStr("2026-01-01", -1)).toBe("2025-12-31");
      expect(addDaysToDateStr("2026-10-22", -6)).toBe("2026-10-16");
    });

    test("handles malformed string gracefully", () => {
      expect(addDaysToDateStr("invalid", 5)).toBe("invalid");
    });
  });

  describe("formatDateRange", () => {
    test("formats same-year date range correctly", () => {
      expect(formatDateRange("2026-10-16", "2026-10-22")).toBe("16 Oct – 22 Oct");
    });

    test("formats cross-year date range with years included", () => {
      expect(formatDateRange("2025-12-28", "2026-01-03")).toBe("28 Dec 2025 – 3 Jan 2026");
    });

    test("returns empty string if dates are missing", () => {
      expect(formatDateRange(undefined, undefined)).toBe("");
    });
  });
});

