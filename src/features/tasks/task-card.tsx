"use client";

import { PriorityBadge } from "@/features/tasks/task-badges";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";
import { parseSubtasks } from "@/lib/markdown/sections";
import type { TaskView } from "@/features/tasks/use-tasks";
import { CheckSquare, Calendar } from "lucide-react";

/** Compact task card used in kanban columns and list rows. */
export function TaskCard({
  task,
  onOpen,
  dragging,
}: {
  task: TaskView;
  onOpen?: () => void;
  dragging?: boolean;
}) {
  const d = task.data;
  const collection = unwrapWikiLink(d.collection ?? null);
  const subs = parseSubtasks(task.content);
  const doneSubs = subs.filter((s) => s.done).length;
  const progress = Number(d.progress ?? 0);

  return (
    <div
      onClick={onOpen}
      className={`glass glass-hover cursor-pointer space-y-2 p-3 ${
        dragging ? "opacity-90 shadow-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-fg">
          {String(d.title)}
        </span>
        <PriorityBadge priority={String(d.priority)} />
      </div>

      {collection && (
        <span className="inline-block rounded bg-[rgb(var(--glass-bg)/0.1)] px-1.5 py-0.5 text-[10px] text-muted">
          {collection}
        </span>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted">
        {subs.length > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare size={12} />
            {doneSubs}/{subs.length}
          </span>
        )}
        {d.due && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {String(d.due)}
          </span>
        )}
        <span className="ml-auto tabular">{progress}%</span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-[rgb(var(--fg)/0.08)]">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
