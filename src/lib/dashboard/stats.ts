import { listByType } from "@/lib/index/queries";
import { parseActivity } from "@/lib/markdown/sections";
import { parseActivityTimestamp, localDateKey, lastNDays } from "@/lib/utils/date";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";

/** Dashboard aggregations (spec §6.1): orbit, trend, distribution, heatmap. */

export interface OrbitPoint {
  slug: string;
  title: string;
  status: string;
  progress: number;
  priority: string;
}

export interface DashboardStats {
  today: string;
  completionRate: number; // 0-100 today's completed / active-touched
  orbit: OrbitPoint[];
  trend14: { date: string; completed: number }[];
  distribution: { collection: string; count: number }[];
  heatmap: { date: string; count: number }[]; // last 365 days of activity
  counts: { active: number; doing: number; done: number; blocked: number };
}

function countActivityByDate(): Map<string, number> {
  const tasks = listByType("task");
  const map = new Map<string, number>();
  for (const t of tasks) {
    for (const a of parseActivity(t.content)) {
      const d = parseActivityTimestamp(a.timestamp);
      if (!d) continue;
      const key = localDateKey(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

function countCompletedByDate(): Map<string, number> {
  const tasks = listByType("task");
  const map = new Map<string, number>();
  for (const t of tasks) {
    for (const a of parseActivity(t.content)) {
      if (!/→\s*完成/.test(a.text)) continue;
      const d = parseActivityTimestamp(a.timestamp);
      if (!d) continue;
      const key = localDateKey(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

export function dashboardStats(): DashboardStats {
  const tasks = listByType("task");
  const today = localDateKey();

  const active = tasks.filter(
    (t) => t.data.status !== "done" && t.data.status !== "archived",
  );
  const doing = tasks.filter((t) => t.data.status === "doing");
  const done = tasks.filter((t) => t.data.status === "done");
  const blocked = tasks.filter((t) => t.data.status === "blocked");

  // orbit points: non-archived tasks (light points on the ring)
  const orbitTasks = tasks
    .filter((t) => t.data.status !== "archived")
    .slice(0, 24);
  const orbit: OrbitPoint[] = orbitTasks.map((t) => ({
    slug: t.slug,
    title: String(t.data.title),
    status: String(t.data.status),
    progress: Number(t.data.progress ?? 0),
    priority: String(t.data.priority),
  }));

  // completion rate: done vs (done + active) among non-archived
  const nonArchived = tasks.filter((t) => t.data.status !== "archived");
  const completionRate =
    nonArchived.length === 0
      ? 0
      : Math.round((done.length / nonArchived.length) * 100);

  // 14-day completion trend
  const completedByDate = countCompletedByDate();
  const trend14 = lastNDays(14).map((date) => ({
    date,
    completed: completedByDate.get(date) ?? 0,
  }));

  // collection distribution (active tasks)
  const distMap = new Map<string, number>();
  for (const t of active) {
    const c =
      unwrapWikiLink((t.data.collection as string | null | undefined) ?? null) ??
      "未归类";
    distMap.set(c, (distMap.get(c) ?? 0) + 1);
  }
  const distribution = [...distMap.entries()]
    .map(([collection, count]) => ({ collection, count }))
    .sort((a, b) => b.count - a.count);

  // activity heatmap: last 365 days
  const activityByDate = countActivityByDate();
  const heatmap = lastNDays(365).map((date) => ({
    date,
    count: activityByDate.get(date) ?? 0,
  }));

  return {
    today,
    completionRate,
    orbit,
    trend14,
    distribution,
    heatmap,
    counts: {
      active: active.length,
      doing: doing.length,
      done: done.length,
      blocked: blocked.length,
    },
  };
}
