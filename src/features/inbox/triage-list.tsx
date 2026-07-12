"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, Target, Lightbulb } from "lucide-react";
import type { InboxItem } from "@/lib/inbox/inbox-service";

/**
 * Inbox triage list (blueprint B5.1): each capture can be turned into a task,
 * requirement, or content idea. The action calls the auth-guarded triage API and
 * refreshes so the item leaves the inbox.
 */
export function TriageList({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const triage = async (slug: string, target: "task" | "requirement" | "content") => {
    if (busy) return;
    setBusy(slug);
    try {
      const res = await fetch("/api/inbox/triage", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ slug, target }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.slug}
          className="flex items-center justify-between gap-3 rounded-lg bg-[rgb(var(--glass-bg)/0.05)] px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-fg">
            {item.text}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={busy === item.slug}
              onClick={() => triage(item.slug, "task")}
              title="转为任务"
              aria-label="转为任务"
              className="rounded p-1.5 text-muted hover:text-brand-cyan disabled:opacity-50"
            >
              <ListTodo size={15} />
            </button>
            <button
              type="button"
              disabled={busy === item.slug}
              onClick={() => triage(item.slug, "requirement")}
              title="转为需求"
              aria-label="转为需求"
              className="rounded p-1.5 text-muted hover:text-brand-cyan disabled:opacity-50"
            >
              <Target size={15} />
            </button>
            <button
              type="button"
              disabled={busy === item.slug}
              onClick={() => triage(item.slug, "content")}
              title="转为选题"
              aria-label="转为选题"
              className="rounded p-1.5 text-muted hover:text-brand-cyan disabled:opacity-50"
            >
              <Lightbulb size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
