import { listByType, getBySlug } from "@/lib/index/queries";
import { parseActivity } from "@/lib/markdown/sections";
import { parseActivityTimestamp, localDateKey } from "@/lib/utils/date";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";
import type { EntryView } from "@/lib/index/queries";

/**
 * Report aggregation (spec §6.3/§6.4). The 动态 log across all tasks is the data
 * source. For a given date we walk every task's 动态 entries, keep those whose
 * timestamp falls on that date, and classify each into a bucket.
 */

export type Bucket = "完成" | "推进" | "新建" | "受阻";

export interface DailyItem {
  taskTitle: string;
  taskSlug: string;
  timestamp: string;
  text: string;
  bucket: Bucket;
}

export interface DailyAggregate {
  date: string;
  items: DailyItem[];
  byBucket: Record<Bucket, DailyItem[]>;
  /** high-priority unfinished tasks → prefill 明日计划 */
  tomorrowPlan: { title: string; slug: string; priority: string }[];
}

function classify(text: string): Bucket {
  if (/→\s*完成/.test(text)) return "完成";
  if (/创建任务/.test(text)) return "新建";
  if (/→\s*受阻/.test(text) || /受阻/.test(text)) return "受阻";
  // progress bumps, status → doing, etc.
  return "推进";
}

export function aggregateDaily(date: string): DailyAggregate {
  const tasks = listByType("task");
  const items: DailyItem[] = [];

  for (const t of tasks) {
    const acts = parseActivity(t.content);
    for (const a of acts) {
      const d = parseActivityTimestamp(a.timestamp);
      if (!d) continue;
      if (localDateKey(d) !== date) continue;
      items.push({
        taskTitle: String(t.data.title),
        taskSlug: t.slug,
        timestamp: a.timestamp,
        text: a.text,
        bucket: classify(a.text),
      });
    }
  }

  items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const byBucket: Record<Bucket, DailyItem[]> = {
    完成: [],
    推进: [],
    新建: [],
    受阻: [],
  };
  for (const it of items) byBucket[it.bucket].push(it);

  // tomorrow plan: unfinished high-priority tasks (P0/P1 first), not done/archived
  const tomorrowPlan = tasks
    .filter(
      (t) =>
        t.data.status !== "done" &&
        t.data.status !== "archived",
    )
    .sort((a, b) =>
      String(a.data.priority).localeCompare(String(b.data.priority)),
    )
    .slice(0, 5)
    .map((t) => ({
      title: String(t.data.title),
      slug: t.slug,
      priority: String(t.data.priority),
    }));

  return { date, items, byBucket, tomorrowPlan };
}

/** Build the fixed 5-section daily report body from an aggregate (spec §6.3). */
export function renderDailyBody(agg: DailyAggregate): string {
  const line = (it: DailyItem) => `- ${it.taskTitle} · ${it.text}`;
  const section = (bucket: Bucket) =>
    agg.byBucket[bucket].length > 0
      ? agg.byBucket[bucket].map(line).join("\n")
      : "- （无）";

  const completed = section("完成");
  const inProgress = [...agg.byBucket["推进"], ...agg.byBucket["新建"]]
    .map(line)
    .join("\n") || "- （无）";
  const problems = section("受阻");
  const plan =
    agg.tomorrowPlan.length > 0
      ? agg.tomorrowPlan.map((p) => `- [${p.priority}] ${p.title}`).join("\n")
      : "- （无）";

  return [
    "## 今日完成",
    completed,
    "",
    "## 进行中",
    inProgress,
    "",
    "## 遇到的问题",
    problems,
    "",
    "## 明日计划",
    plan,
    "",
    "## 随想",
    "- ",
  ].join("\n");
}

// ---- Weekly aggregation (spec §6.4) ----

export interface WeeklyStats {
  completedCount: number;
  createdCount: number;
  /** per-collection task investment share (by task count) */
  collectionShare: { collection: string; count: number; pct: number }[];
  /** per-day completed count for the bar chart (Mon..Sun) */
  dailyCompleted: { date: string; count: number }[];
}

export function aggregateWeekly(days: string[]): WeeklyStats {
  let completedCount = 0;
  let createdCount = 0;
  const dailyCompleted = days.map((date) => {
    const agg = aggregateDaily(date);
    const c = agg.byBucket["完成"].length;
    completedCount += c;
    createdCount += agg.byBucket["新建"].length;
    return { date, count: c };
  });

  // collection share across all active tasks touched this week
  const tasks = listByType("task");
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.data.status === "archived") continue;
    const col =
      unwrapWikiLink((t.data.collection as string | null | undefined) ?? null) ??
      "（未归类）";
    counts.set(col, (counts.get(col) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  const collectionShare = [...counts.entries()]
    .map(([collection, count]) => ({
      collection,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return { completedCount, createdCount, collectionShare, dailyCompleted };
}

export function renderWeeklyBody(stats: WeeklyStats): string {
  const shareLine = stats.collectionShare
    .map((s) => `${s.collection} ${s.pct}%`)
    .join(" · ");
  return [
    "## 本周速览",
    `- 完成任务：${stats.completedCount} · 新建任务：${stats.createdCount}`,
    `- 各合集投入占比：${shareLine || "（无）"}`,
    "",
    "## 重点产出",
    "- ",
    "",
    "## 问题与风险",
    "- ",
    "",
    "## 下周计划",
    "- ",
  ].join("\n");
}

/** Look up a task view by slug (for linking report items). */
export function taskBySlug(slug: string): EntryView | null {
  return getBySlug("task", slug);
}
