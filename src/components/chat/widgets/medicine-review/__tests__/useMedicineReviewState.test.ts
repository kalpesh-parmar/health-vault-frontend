import {
  formatFoodContext,
  formatStartDate,
  isPastDate,
  getDosageString,
  getTimeString,
  hasConflict,
} from "../useMedicineReviewState";

describe("useMedicineReviewState & Medicine Review Formatters", () => {
  describe("formatFoodContext", () => {
    it("returns 'None' when given falsy values", () => {
      expect(formatFoodContext(null)).toBe("None");
      expect(formatFoodContext(undefined)).toBe("None");
      expect(formatFoodContext("")).toBe("None");
    });

    it("formats underscores to spaces and capitalizes first letter", () => {
      expect(formatFoodContext("AFTER_MEAL")).toBe("After meal");
      expect(formatFoodContext("before_food")).toBe("Before food");
      expect(formatFoodContext("WITH_FOOD")).toBe("With food");
      expect(formatFoodContext("EMPTY_STOMACH")).toBe("Empty stomach");
    });
  });

  describe("formatStartDate", () => {
    it("returns 'None' for falsy values", () => {
      expect(formatStartDate(null)).toBe("None");
      expect(formatStartDate(undefined)).toBe("None");
      expect(formatStartDate("")).toBe("None");
    });

    it("formats valid date string into DD-MMM-YYYY", () => {
      const formatted = formatStartDate("2026-05-15T00:00:00.000Z");
      expect(formatted).toMatch(/15-May-2026/);
    });

    it("returns string as-is when given unparseable value", () => {
      expect(formatStartDate("invalid-date-string")).toBe("invalid-date-string");
    });
  });

  describe("isPastDate", () => {
    it("returns false for falsy or 'None' values", () => {
      expect(isPastDate(null)).toBe(false);
      expect(isPastDate("None")).toBe(false);
    });

    it("identifies past dates correctly", () => {
      expect(isPastDate("2020-01-01")).toBe(true);
    });

    it("identifies future dates correctly", () => {
      const nextYear = new Date().getFullYear() + 2;
      expect(isPastDate(`${nextYear}-12-31`)).toBe(false);
    });
  });

  describe("getDosageString", () => {
    it("handles dosage object with count and type", () => {
      const med = {
        dosage: { count: 2 },
        type: "capsule",
      };
      expect(getDosageString(med)).toBe("2 capsule(s)");
    });

    it("handles dose object with value and unit", () => {
      const med = {
        dose: { value: 500, unit: "mg" },
      };
      expect(getDosageString(med)).toBe("500 mg");
    });

    it("handles direct string dosage", () => {
      const med = { dosage: "10 ml" };
      expect(getDosageString(med)).toBe("10 ml");
    });

    it("defaults to 1 tablet(s) when no dosage is present", () => {
      expect(getDosageString({})).toBe("1 tablet(s)");
    });
  });

  describe("getTimeString", () => {
    it("returns 'None' when no schedule is provided", () => {
      expect(getTimeString({})).toBe("None");
    });

    it("handles schedule string directly", () => {
      expect(getTimeString({ schedule: "Morning, Night" })).toBe("Morning, Night");
    });

    it("handles schedule array", () => {
      expect(getTimeString({ schedule: ["08:00 AM", "08:00 PM"] })).toBe("08:00 AM, 08:00 PM");
    });

    it("handles schedule object with reminderTimes", () => {
      const med = {
        schedule: { reminderTimes: ["09:00 AM", "02:00 PM", "09:00 PM"] },
      };
      expect(getTimeString(med)).toBe("09:00 AM, 02:00 PM, 09:00 PM");
    });
  });

  describe("hasConflict", () => {
    it("returns false for regular medicine without conflict metadata", () => {
      expect(hasConflict({ name: "Aspirin" })).toBe(false);
      expect(hasConflict({ name: "Aspirin", duplicateInfo: {} })).toBe(false);
    });

    it("returns true when hasDuplicate or conflictType is set", () => {
      expect(hasConflict({ duplicateInfo: { hasDuplicate: true } })).toBe(true);
      expect(hasConflict({ duplicateInfo: { conflictType: "DOSAGE_MISMATCH" } })).toBe(true);
    });

    it("returns true when matchedMedications array is populated", () => {
      expect(
        hasConflict({
          duplicateInfo: { matchedMedications: [{ name: "Existing Metformin" }] },
        })
      ).toBe(true);
    });
  });
});
