/**
 * ID & slug helpers. IDs are human-readable and stable in filenames
 * (spec §5: task-20260710-a1b2).
 */

/** Local-time yyyymmdd (system timezone — HANDBOOK ADR-010). */
export function yyyymmdd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Short pseudo-random suffix. Not cryptographic — just for filename uniqueness. */
export function shortSuffix(len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export function makeId(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${yyyymmdd(date)}-${shortSuffix()}`;
}

/**
 * Slugify a title for use in a filename. Keeps CJK characters (Obsidian-friendly),
 * strips filesystem-hostile chars, collapses whitespace to hyphens.
 */
export function slugify(title: string, max = 40): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|#^[\]]/g, "") // FS + obsidian-hostile chars
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, max) || "untitled";
}

/** Filename for a task: {yyyymmdd}-{slug}.md (spec §4). */
export function taskFilename(title: string, date: Date = new Date()): string {
  return `${yyyymmdd(date)}-${slugify(title)}.md`;
}
