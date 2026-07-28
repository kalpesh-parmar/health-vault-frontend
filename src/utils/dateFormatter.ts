/**
 * Formats a date string or Date object in UTC timezone representation.
 * Resolves local timezone shift discrepancies when displaying backend timestamps.
 */
export const formatUTCDateTime = (dateStr: string | Date, formatPattern: string): string => {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (!date || isNaN(date.getTime())) return "";

  const yyyy = date.getUTCFullYear();
  const mm = date.getUTCMonth(); // 0-indexed
  const dd = date.getUTCDate();
  const hh = date.getUTCHours();
  const min = date.getUTCMinutes();

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (formatPattern === "dd-MMM-yyyy") {
    const padDD = String(dd).padStart(2, "0");
    const mmm = months[mm];
    return `${padDD}-${mmm}-${yyyy}`;
  }

  if (formatPattern === "hh:mm a") {
    const ampm = hh >= 12 ? "PM" : "AM";
    const displayHour = hh % 12 === 0 ? 12 : hh % 12;
    const padHour = String(displayHour).padStart(2, "0");
    const padMin = String(min).padStart(2, "0");
    return `${padHour}:${padMin} ${ampm}`;
  }

  return date.toUTCString();
};
