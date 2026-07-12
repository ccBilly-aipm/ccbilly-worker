"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Plus, Flame, ExternalLink } from "lucide-react";

export interface IdeaView {
  slug: string;
  title: string;
  angle: string;
  sourceUrl: string | null;
  heat: number;
  tags: string[];
}

/** 选题库 (blueprint B4.1): inspiration cards with heat + angle + tags. */
export function IdeasClient({ ideas }: { ideas: IdeaView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [angle, setAngle] = useState("");
  const [heat, setHeat] = useState(3);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ title: title.trim(), angle: angle.trim() || undefined, heat }),
    });
    setTitle("");
    setAngle("");
    setHeat(3);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-fg">选题库</h1>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-fg"
        >
          <Plus size={15} /> 记个选题
        </button>
      </div>

      {open && (
        <GlassCard className="space-y-2">
          <form onSubmit={create} className="space-y-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="选题标题…"
              className="input w-full"
            />
            <input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="一句话切入角度（可选）"
              className="input w-full"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted">
                热度
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={heat}
                  onChange={(e) => setHeat(Number(e.target.value))}
                  className="accent-[rgb(var(--aurora-cyan))]"
                />
                <span className="tabular text-fg">{heat}</span>
              </label>
              <button type="submit" className="glass glass-hover rounded-lg px-4 py-2 text-sm text-fg">
                添加
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {ideas.length === 0 ? (
        <GlassCard>
          <p className="py-6 text-center text-sm text-muted">
            选题库还是空的。用「记个选题」记下第一个灵感，或到「情报源」把好文章存为选题。
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ideas.map((idea) => (
            <GlassCard key={idea.slug} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-fg">{idea.title}</h3>
                <span className="flex shrink-0 items-center gap-0.5 text-xs text-warning">
                  {Array.from({ length: idea.heat }).map((_, i) => (
                    <Flame key={i} size={12} fill="currentColor" />
                  ))}
                </span>
              </div>
              {idea.angle && <p className="text-sm text-muted">{idea.angle}</p>}
              <div className="flex items-center gap-2">
                {idea.sourceUrl && (
                  <a
                    href={idea.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline"
                  >
                    <ExternalLink size={11} /> 来源
                  </a>
                )}
                {idea.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-[rgb(var(--glass-bg)/0.1)] px-1.5 py-0.5 text-[11px] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
