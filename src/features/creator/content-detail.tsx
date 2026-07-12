"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORMS, platformDef, type MetricRow } from "@/lib/creator/platforms";
import { LazyPlatformBars } from "@/features/dashboard/lazy-charts";

export interface ContentDetailData {
  slug: string;
  title: string;
  stage: string;
  platforms: string[];
  publishDate: string | null;
  metrics: MetricRow[];
}

/**
 * Content detail (blueprint B4.4/B4.5): pick platforms → per-platform checklist;
 * enter metric snapshots → cross-platform comparison. All writes are auth-guarded.
 */
export function ContentDetail({ data }: { data: ContentDetailData }) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<string[]>(data.platforms);
  const [saving, setSaving] = useState(false);

  const togglePlatform = async (id: string) => {
    const next = platforms.includes(id)
      ? platforms.filter((p) => p !== id)
      : [...platforms, id];
    setPlatforms(next);
    setSaving(true);
    try {
      await fetch(`/api/content/${encodeURIComponent(data.slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ platforms: next }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <h2 className="text-sm font-medium text-muted">目标平台</h2>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const on = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={saving}
                onClick={() => togglePlatform(p.id)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  on
                    ? "bg-[rgb(var(--aurora-cyan)/0.15)] text-brand-cyan ring-1 ring-[rgb(var(--aurora-cyan)/0.35)]"
                    : "text-muted hover:text-fg"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {platforms.length > 0 && (
        <GlassCard className="space-y-3">
          <h2 className="text-sm font-medium text-muted">一稿多平台适配清单</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {platforms.map((id) => {
              const def = platformDef(id);
              if (!def) return null;
              return (
                <div key={id}>
                  <div className="mb-1 text-sm text-fg">{def.label}</div>
                  <ul className="space-y-1">
                    {def.checklist.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-muted">
                        <span className="inline-block h-3 w-3 rounded-sm border border-[rgb(var(--border)/0.3)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <MetricsSection data={data} platforms={platforms} />
    </div>
  );
}

function MetricsSection({
  data,
  platforms,
}: {
  data: ContentDetailData;
  platforms: string[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState(platforms[0] ?? "公众号");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    try {
      await fetch(`/api/content/${encodeURIComponent(data.slug)}/metrics`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({
          date,
          platform,
          views: Number(views) || 0,
          likes: Number(likes) || 0,
        }),
      });
      setViews("");
      setLikes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const chartData = platforms
    .map((p) => {
      const rows = data.metrics.filter((m) => m.platform === p);
      const views = rows.reduce((s, m) => s + (Number(m.views) || 0), 0);
      return { platform: p, views };
    })
    .filter((d) => d.views > 0);

  return (
    <GlassCard className="space-y-3">
      <h2 className="text-sm font-medium text-muted">数据复盘</h2>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">平台</span>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="input [&>option]:text-black"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">阅读/播放</span>
          <input
            type="number"
            min={0}
            value={views}
            onChange={(e) => setViews(e.target.value)}
            className="input w-24"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">点赞</span>
          <input
            type="number"
            min={0}
            value={likes}
            onChange={(e) => setLikes(e.target.value)}
            className="input w-20"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="glass glass-hover rounded-lg px-3 py-2 text-sm text-fg disabled:opacity-50"
        >
          录入快照
        </button>
      </form>

      {chartData.length > 0 && <LazyPlatformBars data={chartData} />}
      {data.metrics.length > 0 && (
        <p className="text-[11px] text-muted">已录入 {data.metrics.length} 条快照。</p>
      )}
    </GlassCard>
  );
}
