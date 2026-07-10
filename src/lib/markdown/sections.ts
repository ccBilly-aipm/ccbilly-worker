/**
 * Markdown body section utilities: read/append H2 sections, parse the 动态
 * (activity) log and 子任务 (subtask checklist). Human-readable + machine-readable
 * (spec §5). We keep formatting Obsidian-friendly (plain `## H2` + `- ` lists).
 */

export interface Subtask {
  text: string;
  done: boolean;
  /** line index within the section body (0-based over subtask lines) */
  index: number;
}

export interface ActivityEntry {
  timestamp: string; // "YYYY-MM-DD HH:mm"
  text: string; // everything after " · "
  raw: string;
}

const H2_RE = /^##\s+(.+?)\s*$/;

/** Split body into ordered sections keyed by H2 title. Text before first H2 is "". */
export function splitSections(body: string): {
  preamble: string;
  order: string[];
  sections: Record<string, string>;
} {
  const lines = body.split("\n");
  const sections: Record<string, string> = {};
  const order: string[] = [];
  const preambleLines: string[] = [];
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current !== null) {
      sections[current] = buf.join("\n").replace(/^\n+|\n+$/g, "");
    }
  };

  for (const line of lines) {
    const m = line.match(H2_RE);
    if (m) {
      flush();
      current = m[1];
      if (!order.includes(current)) order.push(current);
      buf = [];
    } else if (current === null) {
      preambleLines.push(line);
    } else {
      buf.push(line);
    }
  }
  flush();

  return {
    preamble: preambleLines.join("\n").replace(/\n+$/g, ""),
    order,
    sections,
  };
}

/** Reassemble a body from preamble + ordered sections. */
export function joinSections(
  preamble: string,
  order: string[],
  sections: Record<string, string>,
): string {
  const parts: string[] = [];
  const pre = preamble.trim();
  if (pre) parts.push(pre);
  for (const title of order) {
    const content = (sections[title] ?? "").trim();
    parts.push(`## ${title}\n${content}`.trimEnd());
  }
  return parts.join("\n\n").trimEnd() + "\n";
}

/** Get a single section's content by title (or "" if absent). */
export function getSection(body: string, title: string): string {
  return splitSections(body).sections[title] ?? "";
}

/** Set/replace a section, creating it (appended) if missing. */
export function setSection(body: string, title: string, content: string): string {
  const { preamble, order, sections } = splitSections(body);
  if (!order.includes(title)) order.push(title);
  sections[title] = content.trim();
  return joinSections(preamble, order, sections);
}

/** Append a line to a section, creating it if missing. */
export function appendToSection(
  body: string,
  title: string,
  line: string,
): string {
  const existing = getSection(body, title);
  const next = existing ? `${existing}\n${line}` : line;
  return setSection(body, title, next);
}

// ---- Activity log (## 动态) ----
const ACTIVITY_RE = /^-\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+·\s+(.*)$/;

export function parseActivity(body: string): ActivityEntry[] {
  const section = getSection(body, "动态");
  const out: ActivityEntry[] = [];
  for (const line of section.split("\n")) {
    const m = line.match(ACTIVITY_RE);
    if (m) out.push({ timestamp: m[1], text: m[2].trim(), raw: line });
  }
  return out;
}

/** Append an activity entry: "- YYYY-MM-DD HH:mm · <text>". */
export function appendActivity(
  body: string,
  timestamp: string,
  text: string,
): string {
  return appendToSection(body, "动态", `- ${timestamp} · ${text}`);
}

// ---- Subtasks (## 子任务) ----
const SUBTASK_RE = /^-\s+\[( |x|X)\]\s+(.*)$/;

export function parseSubtasks(body: string): Subtask[] {
  const section = getSection(body, "子任务");
  const out: Subtask[] = [];
  let idx = 0;
  for (const line of section.split("\n")) {
    const m = line.match(SUBTASK_RE);
    if (m) {
      out.push({
        text: m[2].trim(),
        done: m[1].toLowerCase() === "x",
        index: idx++,
      });
    }
  }
  return out;
}

/** Toggle the nth subtask (0-based over subtask lines) and return new body. */
export function toggleSubtask(
  body: string,
  index: number,
  done: boolean,
): string {
  const section = getSection(body, "子任务");
  let idx = 0;
  const nextLines = section.split("\n").map((line) => {
    const m = line.match(SUBTASK_RE);
    if (!m) return line;
    const thisIdx = idx++;
    if (thisIdx !== index) return line;
    return `- [${done ? "x" : " "}] ${m[2].trim()}`;
  });
  return setSection(body, "子任务", nextLines.join("\n"));
}
