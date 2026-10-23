import {
  getWeeklyAdherence,
  getMonthlyAdherence,
  getDailyDetails,
  getRefillAlerts,
} from "../medicationAdherenceService";
import apiClient from "../apiClient";
import { MEDICATION_REMINDER_ENDPOINTS } from "../../constants/endpoints";

jest.mock("../apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe("Medication Adherence Service API Client Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getWeeklyAdherence calls correct endpoint with cleaned params", async () => {
    const mockResponse = {
      data: {
        data: {
          dateRange: { startDate: "2026-10-15", endDate: "2026-10-21", timezone: "Asia/Kolkata" },
          kpiSummary: { totalCompleted: 18, overdue: 3, pending: 5, hasData: true },
          dailyBreakdown: [],
        },
      },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await getWeeklyAdherence({
      timezone: "Asia/Kolkata",
      startDate: "2026-10-15",
      endDate: "2026-10-21",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_WEEKLY,
      {
        params: {
          timezone: "Asia/Kolkata",
          startDate: "2026-10-15",
          endDate: "2026-10-21",
        },
      },
    );
    expect(result.kpiSummary.totalCompleted).toBe(18);
  });

  test("getWeeklyAdherence strips undefined or empty params for Zod strict compliance", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { kpiSummary: { hasData: false } } },
    });

    await getWeeklyAdherence({
      timezone: "Asia/Kolkata",
      startDate: undefined,
      endDate: "",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_WEEKLY,
      {
        params: {
          timezone: "Asia/Kolkata",
        },
      },
    );
  });

  test("getMonthlyAdherence sends month, year, and timezone", async () => {
    const mockMonthly = {
      month: 10,
      year: 2026,
      monthLabel: "October 2026",
      percentages: { hasData: true, overallAdherence: 78.5 },
      metrics: { totalCompleted: 22 },
      segmentedRatios: { completedRatio: 0.785 },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: mockMonthly },
    });

    const result = await getMonthlyAdherence({
      month: 10,
      year: 2026,
      timezone: "Asia/Kolkata",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_MONTHLY,
      {
        params: {
          month: 10,
          year: 2026,
          timezone: "Asia/Kolkata",
        },
      },
    );
    expect(result.monthLabel).toBe("October 2026");
  });

  test("getDailyDetails requires date and passes to API", async () => {
    const mockDaily = {
      date: "2026-10-21",
      timezone: "Asia/Kolkata",
      totalOccurrences: 2,
      doses: [
        {
          occurrenceId: "occ-1",
          medicationName: "Amoxicillin",
          status: "COMPLETED",
          completionClassification: "LATE",
          delayFormatted: "2h 30m late",
        },
      ],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: mockDaily },
    });

    const result = await getDailyDetails({
      date: "2026-10-21",
      timezone: "Asia/Kolkata",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_DAILY_DETAILS,
      {
        params: {
          date: "2026-10-21",
          timezone: "Asia/Kolkata",
        },
      },
    );
    expect(result.doses[0].medicationName).toBe("Amoxicillin");
  });

  test("getRefillAlerts calls refills endpoint and returns response data", async () => {
    const mockRefills = {
      hasRefillAlerts: true,
      totalAlertsCount: 1,
      medications: [
        {
          medicationId: "med-1",
          medicationName: "Metformin",
          remainingQuantity: 4,
          urgency: "LOW_STOCK",
        },
      ],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: mockRefills },
    });

    const result = await getRefillAlerts({
      timezone: "Asia/Kolkata",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      MEDICATION_REMINDER_ENDPOINTS.DASHBOARD_REFILLS,
      {
        params: {
          timezone: "Asia/Kolkata",
        },
      },
    );
    expect(result.hasRefillAlerts).toBe(true);
    expect(result.medications[0].medicationName).toBe("Metformin");
  });
});
