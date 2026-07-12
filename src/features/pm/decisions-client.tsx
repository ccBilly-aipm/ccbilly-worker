"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Plus, AlarmClock } from "lucide-react";
import type { Decision } from "@/lib/pm/decision-service";

/** Decision log (blueprint B3.4): ADR-style entries + review-due reminders. */
export function DecisionsClient({
  decisions,
  today,
}: {
  decisions: Decision[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/decisions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ title: title.trim(), reviewDate: reviewDate || null }),
    });
    setTitle("");
    setReviewDate("");
    setOpen(false);
    router.refresh();
  };

  const due = (d: Decision) =>
    d.reviewDate && d.reviewDate <= today && d.status !== "reviewed";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-fg">决策日志</h1>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-fg"
        >
          <Plus size={15} /> 记一个决策
        </button>
      </div>

      {open && (
        <GlassCard>
          <form onSubmit={create} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] text-muted">决策标题</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：选 stdio 而非 HTTP 实现 MCP"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted">复盘日期（可选）</span>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="input"
              />
            </label>
            <button type="submit" className="glass glass-hover rounded-lg px-4 py-2 text-sm text-fg">
              创建（含模板）
            </button>
          </form>
        </GlassCard>
      )}

      {decisions.length === 0 ? (
        <GlassCard>
          <p className="py-6 text-center text-sm text-muted">
            还没有决策记录。每个重要选择都值得记下背景、选项、理由与复盘时间。
          </p>
        </GlassCard>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li key={d.slug}>
              <GlassCard className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-fg">{d.title}</div>
                  <div className="text-xs text-muted tabular">
                    {d.created.slice(0, 10)}
                    {d.reviewDate && ` · 复盘 ${d.reviewDate}`}
                  </div>
                </div>
                {due(d) && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                    <AlarmClock size={12} /> 待复盘
                  </span>
                )}
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
