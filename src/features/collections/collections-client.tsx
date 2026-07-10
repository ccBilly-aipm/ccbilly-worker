"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Archive, ArchiveRestore } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";

interface CollectionItem {
  slug: string;
  data: { title: string; status: string; description?: string };
  stats: { taskCount: number; doneCount: number; progress: number };
}

/** Collections wall (spec §6.2): progress ring + task count, archive toggle. */
export function CollectionsClient() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/collections", { cache: "no-store" });
    const data = await res.json();
    setItems(data.collections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!title.trim()) return;
    await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    setTitle("");
    setCreating(false);
    await load();
  };

  const toggleArchive = async (slug: string, next: "active" | "archived") => {
    await fetch(`/api/collections/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg">合集</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="btn-brand ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
        >
          <Plus size={16} /> 新建合集
        </button>
      </header>

      {creating && (
        <GlassCard className="flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="合集名称，例如：开源项目接入"
            className="input"
          />
          <button onClick={create} className="btn-brand shrink-0 rounded-lg px-4 py-2 text-sm">
            创建
          </button>
        </GlassCard>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          kind="tasks"
          title="还没有合集"
          description="合集用来把相关任务组织在一起，进度会自动汇总。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <GlassCard key={c.slug} hover className="flex items-center gap-4">
              <ProgressRing value={c.stats.progress} size={64} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/collections/${encodeURIComponent(c.slug)}`}
                  className="block truncate font-display text-base font-medium text-fg hover:text-brand-cyan"
                >
                  {c.data.title}
                </Link>
                <p className="text-xs text-muted">
                  {c.stats.doneCount}/{c.stats.taskCount} 任务完成
                  {c.data.status === "archived" && " · 已归档"}
                </p>
              </div>
              <button
                onClick={() =>
                  toggleArchive(
                    c.slug,
                    c.data.status === "archived" ? "active" : "archived",
                  )
                }
                title={c.data.status === "archived" ? "恢复" : "归档"}
                className="text-muted hover:text-fg"
              >
                {c.data.status === "archived" ? (
                  <ArchiveRestore size={16} />
                ) : (
                  <Archive size={16} />
                )}
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
