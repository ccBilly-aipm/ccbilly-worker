"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useTasks, type TaskView } from "@/features/tasks/use-tasks";
import { KanbanBoard } from "@/features/tasks/kanban-board";
import { TaskList } from "@/features/tasks/task-list";
import { TaskDrawer } from "@/features/tasks/task-drawer";
import { NewTaskDialog } from "@/features/tasks/new-task-dialog";
import { SavedViewsBar } from "@/features/views/saved-views-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";

type ViewMode = "kanban" | "list";

/** Tasks page orchestrator: view toggle + filters + drawer + new-task. */
export function TasksClient() {
  const { tasks, loading, patch, create, remove } = useTasks();
  const [view, setView] = useState<ViewMode>("kanban");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const params = useSearchParams();

  // filters (initialized from URL so saved views can restore them, B5.3)
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [fStatus, setFStatus] = useState(() => params.get("status") ?? "");
  const [fPriority, setFPriority] = useState(() => params.get("priority") ?? "");
  const [fCollection, setFCollection] = useState(() => params.get("collection") ?? "");

  // deep-links from command palette / dashboard
  useEffect(() => {
    if (params.get("new") === "1") setShowNew(true);
    const open = params.get("open");
    if (open) setOpenSlug(open);
  }, [params]);

  // keep the URL in sync with the filters (so "save current view" captures them)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (fStatus) sp.set("status", fStatus);
    if (fPriority) sp.set("priority", fPriority);
    if (fCollection) sp.set("collection", fCollection);
    const qs = sp.toString();
    const next = qs ? `/tasks?${qs}` : "/tasks";
    window.history.replaceState(null, "", next);
  }, [q, fStatus, fPriority, fCollection]);

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      const c = unwrapWikiLink(t.data.collection ?? null);
      if (c) set.add(c);
    }
    return [...set];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.data;
      if (fStatus && d.status !== fStatus) return false;
      if (fPriority && d.priority !== fPriority) return false;
      if (fCollection) {
        const c = unwrapWikiLink(d.collection ?? null);
        if (c !== fCollection) return false;
      }
      if (q) {
        const hay = `${d.title} ${(d.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [tasks, q, fStatus, fPriority, fCollection]);

  const openTask: TaskView | null =
    tasks.find((t) => t.slug === openSlug) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg">任务</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass flex overflow-hidden rounded-full p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${
                view === "kanban" ? "btn-brand" : "text-muted"
              }`}
            >
              <LayoutGrid size={14} /> 看板
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${
                view === "list" ? "btn-brand" : "text-muted"
              }`}
            >
              <List size={14} /> 列表
            </button>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-brand flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
          >
            <Plus size={16} /> 新建
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex h-9 items-center gap-2 rounded-full px-3">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题 / 标签"
            className="w-40 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
          />
        </div>
        <FilterSelect
          value={fStatus}
          onChange={setFStatus}
          placeholder="全部状态"
          options={[
            ["todo", "待办"],
            ["doing", "进行中"],
            ["blocked", "受阻"],
            ["done", "完成"],
            ["archived", "归档"],
          ]}
        />
        <FilterSelect
          value={fPriority}
          onChange={setFPriority}
          placeholder="全部优先级"
          options={[["P0", "P0"], ["P1", "P1"], ["P2", "P2"], ["P3", "P3"]]}
        />
        <FilterSelect
          value={fCollection}
          onChange={setFCollection}
          placeholder="全部合集"
          options={collections.map((c) => [c, c] as [string, string])}
        />
      </div>

      {/* Saved views (B5.3): name and restore a filter combo */}
      <SavedViewsBar page="tasks" />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          kind="tasks"
          title="还没有任务"
          description="用「新建」创建第一个任务，然后在看板里拖拽推进它。"
          action={
            <button
              onClick={() => setShowNew(true)}
              className="btn-brand rounded-full px-4 py-2 text-sm"
            >
              新建任务
            </button>
          }
        />
      ) : view === "kanban" ? (
        <KanbanBoard
          tasks={filtered}
          onPatch={patch}
          onOpen={(t) => setOpenSlug(t.slug)}
        />
      ) : (
        <TaskList tasks={filtered} onOpen={(t) => setOpenSlug(t.slug)} />
      )}

      {openTask && (
        <TaskDrawer
          task={openTask}
          onClose={() => setOpenSlug(null)}
          onPatch={patch}
          onDelete={remove}
        />
      )}

      <NewTaskDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={async (body) => {
          await create(body);
        }}
        collections={collections}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass h-9 rounded-full border-0 bg-transparent px-3 text-sm text-fg outline-none [&>option]:text-black"
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
