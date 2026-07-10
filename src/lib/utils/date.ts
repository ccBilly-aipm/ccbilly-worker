/**
 * Date helpers. All boundaries use the SYSTEM LOCAL timezone (HANDBOOK ADR-010).
 * ISO week is used for weekly report filenames (YYYY-Www).
 */

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD HH:mm" in local time — used in the 动态 log lines. */
export function localTimestamp(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${localDateKey(d)} ${hh}:${mm}`;
}

/** Full ISO 8601 with local offset (for created/updated fields). */
export function localISO(d: Date = new Date()): string {
  const tzOffsetMin = -d.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${oh}:${om}`
  );
}

/**
 * ISO-8601 week number. Week starts Monday; week 1 contains the first Thursday.
 * Returns { year, week } where year may differ from calendar year at boundaries.
 */
export function isoWeek(date: Date = new Date()): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** "YYYY-Www" key, e.g. 2026-W28. */
export function isoWeekKey(date: Date = new Date()): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday..Sunday date keys for the ISO week containing `date`. */
export function isoWeekRange(date: Date = new Date()): {
  start: string;
  end: string;
  days: string[];
} {
  // Find Monday of this week in local time.
  const d = new Date(date);
  const day = d.getDay() || 7; // Sun=0 -> 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    days.push(localDateKey(x));
  }
  return { start: days[0], end: days[6], days };
}

/** Last N calendar days (inclusive of today), as YYYY-MM-DD keys, oldest first. */
export function lastNDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    out.push(localDateKey(d));
  }
  return out;
}

/** Parse a "YYYY-MM-DD HH:mm" activity timestamp back to a local Date (or null). */
export function parseActivityTimestamp(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
