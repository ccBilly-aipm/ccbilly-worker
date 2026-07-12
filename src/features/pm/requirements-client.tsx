"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Plus, ChevronRight } from "lucide-react";
import { riceScore } from "@/lib/pm/rice";
import type { Rice } from "@/lib/schema";

export interface ReqView {
  slug: string;
  title: string;
  stage: string;
  rice: Rice;
}

const STAGE_LABEL: Record<string, string> = {
  inbox: "收集",
  pool: "需求池",
  scheduled: "已排期",
  shipped: "已交付",
};
const NEXT_STAGE: Record<string, string> = {
  inbox: "pool",
  pool: "scheduled",
  scheduled: "shipped",
  shipped: "shipped",
};
const STAGE_ORDER = ["inbox", "pool", "scheduled", "shipped"];

/**
 * Requirement pool with RICE (blueprint B3.1). Grouped by stage; within a stage,
 * sorted by RICE score. Inline RICE editing + "move to next stage".
 */
export function RequirementsClient({ requirements }: { requirements: ReqView[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/requirements", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ title: title.trim() }),
    });
    setTitle("");
    setCreating(false);
    router.refresh();
  };

  const patch = async (slug: string, body: Record<string, unknown>) => {
    await fetch(`/api/requirements/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify(body),
    });
    router.refresh();
  };

  const byStage = (stage: string) =>
    requirements
      .filter((r) => (r.stage || "inbox") === stage)
      .sort((a, b) => riceScore(b.rice) - riceScore(a.rice));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-fg">需求池</h1>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-fg"
        >
          <Plus size={15} /> 新建需求
        </button>
      </div>

      {creating && (
        <GlassCard>
          <form onSubmit={create} className="flex gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="需求标题…"
              className="input flex-1"
            />
            <button type="submit" className="glass glass-hover rounded-lg px-4 text-sm text-fg">
              添加
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {STAGE_ORDER.map((stage) => {
          const items = byStage(stage);
          return (
            <GlassCard key={stage}>
              <h2 className="mb-3 text-sm font-medium text-muted">
                {STAGE_LABEL[stage]} · {items.length}
              </h2>
              {items.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">（空）</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li
                      key={r.slug}
                      className="rounded-lg bg-[rgb(var(--glass-bg)/0.05)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-fg">{r.title}</span>
                        <span className="shrink-0 rounded bg-[rgb(var(--aurora-cyan)/0.12)] px-1.5 py-0.5 text-xs text-brand-cyan tabular">
                          {riceScore(r.rice)}
                        </span>
                      </div>
                      <RiceEditor
                        rice={r.rice}
                        onChange={(rice) => patch(r.slug, { rice })}
                      />
                      {stage !== "shipped" && (
                        <button
                          type="button"
                          onClick={() => patch(r.slug, { stage: NEXT_STAGE[stage] })}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-brand-cyan"
                        >
                          移到 {STAGE_LABEL[NEXT_STAGE[stage]]}
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function RiceEditor({
  rice,
  onChange,
}: {
  rice: Rice;
  onChange: (rice: Partial<Rice>) => void;
}) {
  const fields: { key: keyof Rice; label: string; step: number }[] = [
    { key: "reach", label: "R", step: 1 },
    { key: "impact", label: "I", step: 0.5 },
    { key: "confidence", label: "C", step: 0.1 },
    { key: "effort", label: "E", step: 0.5 },
  ];
  return (
    <div className="mt-2 grid grid-cols-4 gap-1.5">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">{f.label}</span>
          <input
            type="number"
            step={f.step}
            min={0}
            defaultValue={Number(rice?.[f.key] ?? 0)}
            aria-label={`${f.label} ${f.key}`}
            onBlur={(e) => onChange({ [f.key]: Number(e.target.value) } as Partial<Rice>)}
            className="input !px-1.5 !py-1 text-center text-xs tabular"
          />
        </label>
      ))}
    </div>
  );
}
