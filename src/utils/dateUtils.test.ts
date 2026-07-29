import { formatLocalDateToYMD, parseYMDToLocalDate } from "./dateUtils";

describe("dateUtils Timezone-Safe Formatting", () => {
  it("formatLocalDateToYMD: formats local date to YYYY-MM-DD without UTC shift", () => {
    const localDate = new Date(1990, 6, 15); // July 15, 1990 local midnight
    expect(formatLocalDateToYMD(localDate)).toBe("1990-07-15");
  });

  it("parseYMDToLocalDate: parses YYYY-MM-DD to local midnight Date", () => {
    const parsedDate = parseYMDToLocalDate("1990-07-15");
    expect(parsedDate.getFullYear()).toBe(1990);
    expect(parsedDate.getMonth()).toBe(6); // 0-indexed month for July
    expect(parsedDate.getDate()).toBe(15);
  });

  it("Round-trip: pick -> format -> parse yields identical local day", () => {
    const originalDate = new Date(1995, 4, 20); // May 20, 1995
    const formatted = formatLocalDateToYMD(originalDate);
    expect(formatted).toBe("1995-05-20");

    const reParsed = parseYMDToLocalDate(formatted);
    expect(reParsed.getFullYear()).toBe(1995);
    expect(reParsed.getMonth()).toBe(4);
    expect(reParsed.getDate()).toBe(20);
  });
});
