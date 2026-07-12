import { listByType, tasksInCollection } from "@/lib/index/queries";
import type { EntryView } from "@/lib/index/queries";

/**
 * Cycle burndown (blueprint B3.2). A collection with a `cycle:{start,end}` gets a
 * burndown: for each day in [start,end], the number of tasks in that collection
 * NOT yet done. "Ideal" is a straight line from total→0 across the span. We
 * approximate remaining-per-day from each task's completion date (its `updated`
 * timestamp when status became done); tasks without a done date count as still
 * open on every day up to today.
 */

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  remaining: number;
  ideal: number;
}

export interface CycleInfo {
  slug: string;
  title: string;
  start: string;
  end: string;
  total: number;
  remaining: number;
  points: BurndownPoint[];
}

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

/** True if a task is "done" as of the given day. Uses updated date as done date. */
function doneByDay(task: EntryView, day: string): boolean {
  const status = task.data.status;
  if (status !== "done" && status !== "archived") return false;
  const updated = String(task.data.updated ?? "").slice(0, 10);
  return updated !== "" && updated <= day;
}

/** Collections that have a cycle, with computed burndown. */
export function cyclesWithBurndown(): CycleInfo[] {
  const collections = listByType("collection").filter(
    (c) => c.data.cycle && typeof c.data.cycle === "object",
  );
  return collections.map((c) => {
    const cycle = c.data.cycle as { start: string; end: string };
    const title = String(c.data.title);
    const tasks = tasksInCollection(title);
    const total = tasks.length;
    const days = dateRange(cycle.start, cycle.end);
    const points: BurndownPoint[] = days.map((day, i) => {
      const remaining = tasks.filter((t) => !doneByDay(t, day)).length;
      const ideal =
        days.length <= 1
          ? total
          : Math.round((total * (days.length - 1 - i)) / (days.length - 1));
      return { date: day, remaining, ideal };
    });
    const remaining = tasks.filter(
      (t) => t.data.status !== "done" && t.data.status !== "archived",
    ).length;
    return {
      slug: c.slug,
      title,
      start: cycle.start,
      end: cycle.end,
      total,
      remaining,
      points,
    };
  });
}
