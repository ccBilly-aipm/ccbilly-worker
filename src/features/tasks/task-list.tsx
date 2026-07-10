"use client";

import type { TaskView } from "@/features/tasks/use-tasks";
import { StatusBadge, PriorityBadge } from "@/features/tasks/task-badges";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";

/** Dense list view (spec §6.2): sortable/filterable rows. Filtering/sorting is
 *  driven by the parent; this just renders the ordered rows. */
export function TaskList({
  tasks,
  onOpen,
}: {
  tasks: TaskView[];
  onOpen: (t: TaskView) => void;
}) {
  return (
    <div className="glass overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgb(var(--border)/0.1)] text-left text-xs text-muted">
            <th className="px-4 py-2.5 font-medium">标题</th>
            <th className="px-3 py-2.5 font-medium">状态</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">优先级</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">合集</th>
            <th className="px-3 py-2.5 font-medium">进度</th>
            <th className="hidden px-3 py-2.5 font-medium lg:table-cell">截止</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const d = t.data;
            const collection = unwrapWikiLink(d.collection ?? null);
            return (
              <tr
                key={t.slug}
                onClick={() => onOpen(t)}
                className="cursor-pointer border-b border-[rgb(var(--border)/0.06)] transition-colors last:border-0 hover:bg-[rgb(var(--glass-bg)/0.06)]"
              >
                <td className="px-4 py-3 text-fg">{String(d.title)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={String(d.status)} />
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <PriorityBadge priority={String(d.priority)} />
                </td>
                <td className="hidden px-3 py-3 text-muted md:table-cell">
                  {collection ?? "—"}
                </td>
                <td className="px-3 py-3 text-muted tabular">
                  {Number(d.progress ?? 0)}%
                </td>
                <td className="hidden px-3 py-3 text-muted tabular lg:table-cell">
                  {d.due ? String(d.due) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
