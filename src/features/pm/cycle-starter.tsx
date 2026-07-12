"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";

export interface CollectionOption {
  slug: string;
  title: string;
  hasCycle: boolean;
}

/**
 * Start a cycle on a collection (blueprint B3.2): pick a collection + date range.
 * Auth-guarded mutation; the collection then gains a burndown.
 */
export function CycleStarter({ collections }: { collections: CollectionOption[] }) {
  const router = useRouter();
  const available = collections.filter((c) => !c.hasCycle);
  const [slug, setSlug] = useState(available[0]?.slug ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  if (available.length === 0) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !start || !end || busy) return;
    setBusy(true);
    try {
      await fetch("/api/cycles", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ slug, cycle: { start, end } }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="space-y-3">
      <h2 className="text-sm font-medium text-muted">开启一个周期</h2>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">合集</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input max-w-[180px] [&>option]:text-black"
          >
            {available.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">开始</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">结束</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !slug || !start || !end}
          className="glass glass-hover rounded-lg px-4 py-2 text-sm text-fg disabled:opacity-50"
        >
          开启
        </button>
      </form>
    </GlassCard>
  );
}
