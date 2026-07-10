import path from "node:path";
import { vaultTypeDir } from "@/lib/config";
import { writeEntry, readEntry } from "@/lib/vault/repo";
import { indexFile } from "@/lib/index/indexer";
import { getBySlug, getByFilePath, listByType } from "@/lib/index/queries";
import { localISO, isoWeekKey, isoWeekRange, localDateKey } from "@/lib/utils/date";
import { getSection, setSection, splitSections } from "@/lib/markdown/sections";
import {
  aggregateDaily,
  renderDailyBody,
  aggregateWeekly,
  renderWeeklyBody,
} from "@/lib/reports/aggregate";
import type { EntryView } from "@/lib/index/queries";

/** Daily / weekly report generation, incremental merge, finalize (spec §6.3/6.4). */

// ---- Daily ----

export function getDaily(date: string): EntryView | null {
  return getBySlug("daily", date);
}

export function listDailies(): EntryView[] {
  return listByType("daily");
}

/** Generate today's (or a given date's) daily report as a draft. */
export async function generateDaily(date: string): Promise<EntryView> {
  const agg = aggregateDaily(date);
  const body = renderDailyBody(agg);
  const filePath = path.join(vaultTypeDir("daily"), `${date}.md`);
  await writeEntry({
    type: "daily",
    filePath,
    data: {
      date,
      type: "daily",
      status: "draft",
      generated_at: localISO(),
    },
    content: body,
  });
  await indexFile(filePath, "daily");
  return getByFilePath(filePath)!;
}

/**
 * Re-aggregate an existing daily report WITHOUT overwriting handwritten content
 * (spec §6.3: 增量合并到对应小节末尾). New aggregated lines that aren't already
 * present are appended to the end of their section.
 */
export async function reaggregateDaily(date: string): Promise<EntryView> {
  const existing = getDaily(date);
  if (!existing) return generateDaily(date);
  const { entry } = await readEntry(existing.filePath, "daily");
  if (!entry) throw new Error(`日报读取失败：${date}`);

  const agg = aggregateDaily(date);
  const fresh = splitSections(renderDailyBody(agg)).sections;
  let content = entry.content;

  // merge each aggregated section's lines into the existing section (dedup)
  for (const title of ["今日完成", "进行中", "遇到的问题"]) {
    const freshLines = (fresh[title] ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && l !== "- （无）");
    if (freshLines.length === 0) continue;
    const current = getSection(content, title);
    const existingSet = new Set(
      current.split("\n").map((l) => l.trim()),
    );
    const toAdd = freshLines.filter((l) => !existingSet.has(l));
    if (toAdd.length === 0) continue;
    const cleaned = current
      .split("\n")
      .filter((l) => l.trim() && l.trim() !== "- （无）");
    content = setSection(content, title, [...cleaned, ...toAdd].join("\n"));
  }

  await writeEntry({
    type: "daily",
    filePath: entry.filePath,
    data: { ...entry.data, generated_at: localISO() },
    content,
  });
  await indexFile(entry.filePath, "daily");
  return getByFilePath(entry.filePath)!;
}

export async function saveDailyBody(
  date: string,
  content: string,
): Promise<EntryView> {
  const existing = getDaily(date);
  if (!existing) throw new Error(`日报不存在：${date}`);
  const { entry } = await readEntry(existing.filePath, "daily");
  if (!entry) throw new Error(`日报读取失败：${date}`);
  await writeEntry({
    type: "daily",
    filePath: entry.filePath,
    data: entry.data,
    content,
  });
  await indexFile(entry.filePath, "daily");
  return getByFilePath(entry.filePath)!;
}

export async function finalizeDaily(date: string): Promise<EntryView> {
  const existing = getDaily(date);
  if (!existing) throw new Error(`日报不存在：${date}`);
  const { entry } = await readEntry(existing.filePath, "daily");
  if (!entry) throw new Error(`日报读取失败：${date}`);
  await writeEntry({
    type: "daily",
    filePath: entry.filePath,
    data: { ...entry.data, status: "final" },
    content: entry.content,
  });
  await indexFile(entry.filePath, "daily");
  return getByFilePath(entry.filePath)!;
}

// ---- Weekly ----

export function getWeekly(week: string): EntryView | null {
  return getBySlug("weekly", week);
}

export function listWeeklies(): EntryView[] {
  return listByType("weekly");
}

export function currentWeekKey(): string {
  return isoWeekKey();
}

export async function generateWeekly(week: string): Promise<EntryView> {
  // resolve the ISO week's Monday..Sunday keys
  const { days, start, end } = weekRangeFromKey(week);
  const stats = aggregateWeekly(days);
  const body = renderWeeklyBody(stats);
  const filePath = path.join(vaultTypeDir("weekly"), `${week}.md`);
  await writeEntry({
    type: "weekly",
    filePath,
    data: {
      week,
      type: "weekly",
      status: "draft",
      range: `${start} ~ ${end}`,
      generated_at: localISO(),
    },
    content: body,
  });
  await indexFile(filePath, "weekly");
  return getByFilePath(filePath)!;
}

export async function saveWeeklyBody(
  week: string,
  content: string,
): Promise<EntryView> {
  const existing = getWeekly(week);
  if (!existing) throw new Error(`周报不存在：${week}`);
  const { entry } = await readEntry(existing.filePath, "weekly");
  if (!entry) throw new Error(`周报读取失败：${week}`);
  await writeEntry({
    type: "weekly",
    filePath: entry.filePath,
    data: entry.data,
    content,
  });
  await indexFile(entry.filePath, "weekly");
  return getByFilePath(entry.filePath)!;
}

export async function finalizeWeekly(week: string): Promise<EntryView> {
  const existing = getWeekly(week);
  if (!existing) throw new Error(`周报不存在：${week}`);
  const { entry } = await readEntry(existing.filePath, "weekly");
  if (!entry) throw new Error(`周报读取失败：${week}`);
  await writeEntry({
    type: "weekly",
    filePath: entry.filePath,
    data: { ...entry.data, status: "final" },
    content: entry.content,
  });
  await indexFile(entry.filePath, "weekly");
  return getByFilePath(entry.filePath)!;
}

/** Weekly stats for charts (recomputed live, not stored). */
export function weeklyStatsForKey(week: string) {
  const { days } = weekRangeFromKey(week);
  return { ...aggregateWeekly(days), days };
}

/** Resolve a YYYY-Www key to concrete Monday..Sunday date keys. */
function weekRangeFromKey(week: string): {
  days: string[];
  start: string;
  end: string;
} {
  const m = week.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return isoWeekRange();
  const year = Number(m[1]);
  const wk = Number(m[2]);
  // Jan 4th is always in ISO week 1; find that week's Monday, then add wk-1 weeks.
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (day - 1));
  const target = new Date(week1Monday);
  target.setDate(week1Monday.getDate() + (wk - 1) * 7);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(target);
    d.setDate(target.getDate() + i);
    days.push(localDateKey(d));
  }
  return { days, start: days[0], end: days[6] };
}
