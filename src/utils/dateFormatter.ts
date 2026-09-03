const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Dedicated date formatter for calendar-only fields like `reportDate`.
 * Extracts strictly the YYYY-MM-DD segment and formats directly without
 * Date object instantiation or timezone offset math.
 */
export const formatDateOnly = (
  dateStr: string | Date,
  formatPattern: string = "dd MMM yyyy"
): string => {
  if (!dateStr) return "";

  let raw = "";
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return "";
    const y = dateStr.getUTCFullYear();
    const m = String(dateStr.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dateStr.getUTCDate()).padStart(2, "0");
    raw = `${y}-${m}-${d}`;
  } else {
    raw = String(dateStr).trim();
  }

  // Extract strictly the first YYYY-MM-DD segment (split on T or space)
  const firstSegment = raw.split(/[T ]/)[0].trim();
  const m = firstSegment.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    // Check for DD/MM/YYYY or DD-MM-YYYY format
    const mDmy = firstSegment.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (mDmy) {
      const dd = String(mDmy[1]).padStart(2, "0");
      const mm = String(mDmy[2]).padStart(2, "0");
      const yyyy = mDmy[3];
      const monthIdx = parseInt(mm, 10) - 1;
      const MMM = MONTHS[monthIdx] || mm;
      return formatPattern
        .replace(/yyyy/g, yyyy)
        .replace(/MMM/g, MMM)
        .replace(/MM/g, mm)
        .replace(/dd/g, dd);
    }
    console.warn(`[dateFormatter] formatDateOnly received unparseable date: "${dateStr}"`);
    return firstSegment || "";
  }

  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];
  const monthIdx = parseInt(mm, 10) - 1;
  const MMM = MONTHS[monthIdx] || mm;

  return formatPattern
    .replace(/yyyy/g, yyyy)
    .replace(/MMM/g, MMM)
    .replace(/MM/g, mm)
    .replace(/dd/g, dd);
};

/**
 * Formats a date string or Date object in UTC timezone representation, with optional IST offset.
 * Used for genuine timestamp moments-in-time (createdAt, expiresAt, message times).
 */
export const formatUTCDateTime = (
  dateStr: string | Date,
  formatPattern: string,
  convertToIST: boolean = false
): string => {
  let date: Date;
  if (typeof dateStr === "string") {
    let cleanStr = dateStr.trim();
    if (!cleanStr.endsWith("Z") && !cleanStr.includes("+") && !/-\d{2}:\d{2}$/.test(cleanStr)) {
      if (cleanStr.includes(" ")) {
        cleanStr = cleanStr.replace(" ", "T");
      }
      if (!cleanStr.includes("T")) {
        cleanStr = `${cleanStr}T00:00:00`;
      }
      cleanStr = `${cleanStr}Z`;
    }
    date = new Date(cleanStr);
  } else {
    date = dateStr;
  }
  if (!date || isNaN(date.getTime())) return "";

  // Apply IST offset if requested (UTC + 5:30)
  const targetDate = convertToIST
    ? new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
    : date;

  const yyyy = String(targetDate.getUTCFullYear());
  const monthIdx = targetDate.getUTCMonth(); // 0-indexed
  const MMM = MONTHS[monthIdx] || "";
  const MM = String(monthIdx + 1).padStart(2, "0");
  const dd = String(targetDate.getUTCDate()).padStart(2, "0");
  const hh24 = targetDate.getUTCHours();
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  const hh = String(hh12).padStart(2, "0");
  const HH = String(hh24).padStart(2, "0");
  const min = String(targetDate.getUTCMinutes()).padStart(2, "0");
  const a = hh24 >= 12 ? "PM" : "AM";

  const formatted = formatPattern
    .replace(/yyyy/g, yyyy)
    .replace(/MMM/g, MMM)
    .replace(/MM/g, MM)
    .replace(/dd/g, dd)
    .replace(/hh/g, hh)
    .replace(/HH/g, HH)
    .replace(/mm/g, min)
    .replace(/\ba\b/g, a);

  if (formatted === formatPattern) {
    console.warn(`[dateFormatter] formatUTCDateTime unrecognized pattern: "${formatPattern}"`);
    return "";
  }

  return formatted;
};

/**
 * Returns a relative date label (Today, Yesterday) or the formatted date (dd-MMM-yyyy).
 */
export const getRelativeDateLabel = (
  dateStr: string | Date,
  convertToIST: boolean = false
): string => {
  if (!dateStr) return "";

  const targetFormatted = formatUTCDateTime(dateStr, "dd-MMM-yyyy", convertToIST);
  const today = new Date();
  const todayFormatted = formatUTCDateTime(today, "dd-MMM-yyyy", convertToIST);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = formatUTCDateTime(yesterday, "dd-MMM-yyyy", convertToIST);

  if (targetFormatted === todayFormatted) {
    return "Today";
  } else if (targetFormatted === yesterdayFormatted) {
    return "Yesterday";
  }

  return targetFormatted;
};

