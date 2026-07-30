/**
 * Formats a date string or Date object in UTC timezone representation.
 * Resolves local timezone shift discrepancies when displaying backend timestamps.
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

  const yyyy = targetDate.getUTCFullYear();
  const mm = targetDate.getUTCMonth(); // 0-indexed
  const dd = targetDate.getUTCDate();
  const hh = targetDate.getUTCHours();
  const min = targetDate.getUTCMinutes();

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

  return targetDate.toUTCString();
};
