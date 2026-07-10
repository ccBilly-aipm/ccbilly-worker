"use client";

import { useCallback, useEffect, useState } from "react";

export interface TaskView {
  filePath: string;
  slug: string;
  type: string;
  data: {
    id: string;
    title: string;
    status: string;
    priority: string;
    collection?: string | null;
    tags?: string[];
    progress?: number;
    due?: string | null;
    created: string;
    updated: string;
    [k: string]: unknown;
  };
  content: string;
  mtimeMs: number;
}

/**
 * Client task store: loads tasks from the API and re-fetches after mutations.
 * A lightweight polling refresh keeps the board in sync with external (Obsidian)
 * edits within seconds without a websocket.
 */
export function useTasks(pollMs = 4000) {
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (pollMs > 0) {
      const id = setInterval(() => void load(), pollMs);
      return () => clearInterval(id);
    }
  }, [load, pollMs]);

  const patch = useCallback(
    async (slug: string, body: Record<string, unknown>) => {
      // optimistic: apply status/progress immediately, then reconcile
      const res = await fetch(`/api/tasks/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "操作失败");
      }
      return (await res.json()).task as TaskView;
    },
    [load],
  );

  const create = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "创建失败");
      await load();
      return d.task as TaskView;
    },
    [load],
  );

  const remove = useCallback(
    async (slug: string) => {
      await fetch(`/api/tasks/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      await load();
    },
    [load],
  );

  return { tasks, loading, error, reload: load, patch, create, remove };
}
