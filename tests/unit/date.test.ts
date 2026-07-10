import { describe, it, expect } from "vitest";
import {
  isoWeek,
  isoWeekKey,
  isoWeekRange,
  lastNDays,
  localDateKey,
  parseActivityTimestamp,
} from "../../src/lib/utils/date";

describe("iso week", () => {
  it("computes a known ISO week", () => {
    // 2026-01-01 is a Thursday → ISO week 1 of 2026
    const { year, week } = isoWeek(new Date(2026, 0, 1));
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  it("formats YYYY-Www", () => {
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe("2026-W01");
  });

  it("week range is Monday..Sunday, 7 days", () => {
    const { days } = isoWeekRange(new Date(2026, 6, 8)); // a Wednesday
    expect(days).toHaveLength(7);
    // Monday of that week is 2026-07-06
    expect(days[0]).toBe("2026-07-06");
    expect(days[6]).toBe("2026-07-12");
  });
});

describe("date helpers", () => {
  it("lastNDays returns N keys oldest-first ending today", () => {
    const from = new Date(2026, 6, 10);
    const days = lastNDays(3, from);
    expect(days).toEqual(["2026-07-08", "2026-07-09", "2026-07-10"]);
  });

  it("localDateKey pads correctly", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("parses an activity timestamp round-trip", () => {
    const d = parseActivityTimestamp("2026-07-10 09:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getHours()).toBe(9);
    expect(parseActivityTimestamp("garbage")).toBeNull();
  });
});
