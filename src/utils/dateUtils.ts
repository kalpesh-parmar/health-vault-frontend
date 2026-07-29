import { format } from "date-fns";

/**
 * Formats a JavaScript Date object into a local 'YYYY-MM-DD' string without UTC timezone shifting.
 */
export function formatLocalDateToYMD(date: Date): string {
  if (!date || isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Parses a 'YYYY-MM-DD' string into a JavaScript Date object at local midnight.
 */
export function parseYMDToLocalDate(ymd: string): Date {
  if (!ymd || typeof ymd !== "string") return new Date();
  const clean = ymd.trim().split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(year, month - 1, day);
    }
  }
  const fallbackDate = new Date(ymd);
  return isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
}
