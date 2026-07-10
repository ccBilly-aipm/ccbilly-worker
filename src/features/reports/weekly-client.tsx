"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2, Download } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyMarkdownButton } from "@/features/reports/copy-button";
import { WeeklyBarChart, CollectionDonut } from "@/features/reports/weekly-charts";
import { isoWeekKey } from "@/lib/utils/date";

interface WeeklyView {
  slug: string;
  data: { week: string; status: string; range?: string };
  content: string;
}
interface WeeklyStats {
  completedCount: number;
  createdCount: number;
  collectionShare: { collection: string; count: number; pct: number }[];
  dailyCompleted: { date: string; count: number }[];
}

/** Weekly reports (spec §6.4): aggregate + charts + edit/finalize/export/copy-md. */
export function WeeklyClient({ openCurrent }: { openCurrent?: boolean }) {
  const currentKey = isoWeekKey();
  const [week, setWeek] = useState(currentKey);
  const [weeklies, setWeeklies] = useState<WeeklyView[]>([]);
  const [report, setReport] = useState<WeeklyView | null>(null);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/reports/weekly", { cache: "no-store" });
    const data = await res.json();
    setWeeklies(data.weeklies ?? []);
  }, []);

  const loadWeek = useCallback(async (w: string) => {
    const res = await fetch(`/api/reports/weekly/${w}`, { cache: "no-store" });
    const data = await res.json();
    setReport(data.report);
    setStats(data.stats);
    setDraft(data.report?.content ?? "");
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    void loadWeek(week);
  }, [week, loadWeek]);
  useEffect(() => {
    if (openCurrent) setWeek(currentKey);
  }, [openCurrent, currentKey]);

  const weekOptions = useMemo(() => {
    const set = new Set(weeklies.map((w) => w.data.week));
    set.add(currentKey);
    return [...set].sort().reverse();
  }, [weeklies, currentKey]);

  const generate = async () => {
    setBusy(true);
    try {
      await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ week }),
      });
      await loadList();
      await loadWeek(week);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await fetch(`/api/reports/weekly/${week}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", content: draft }),
      });
      await loadWeek(week);
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    setBusy(true);
    try {
      await save();
      await fetch(`/api/reports/weekly/${week}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });
      await loadList();
      await loadWeek(week);
    } finally {
      setBusy(false);
    }
  };

  const markdownForCopy = () =>
    `# ${week} 周报${report?.data.range ? `（${report.data.range}）` : ""}\n\n${draft.trim()}\n`;

  const exportMd = () => {
    const blob = new Blob([markdownForCopy()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${week}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFinal = report?.data.status === "final";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg">周报</h1>
        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="glass h-9 rounded-full bg-transparent px-3 text-sm text-fg [&>option]:text-black"
        >
          {weekOptions.map((w) => (
            <option key={w} value={w}>
              {w}
              {w === currentKey ? "（本周）" : ""}
            </option>
          ))}
        </select>
        {report && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              isFinal ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {isFinal ? "已定稿" : "草稿"}
          </span>
        )}
      </header>

      {/* Charts always available (computed live) */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard>
            <h3 className="mb-2 text-sm text-muted">每日完成</h3>
            <WeeklyBarChart data={stats.dailyCompleted} />
          </GlassCard>
          <GlassCard>
            <h3 className="mb-2 text-sm text-muted">合集分布</h3>
            {stats.collectionShare.length > 0 ? (
              <CollectionDonut data={stats.collectionShare} />
            ) : (
              <p className="py-12 text-center text-sm text-muted">暂无数据</p>
            )}
          </GlassCard>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!report ? (
          <button
            onClick={generate}
            disabled={busy}
            className="btn-brand flex h-9 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-60"
          >
            <Sparkles size={15} /> 生成周报
          </button>
        ) : (
          <>
            <button
              onClick={generate}
              disabled={busy || isFinal}
              className="glass glass-hover flex h-9 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-40"
            >
              <Sparkles size={15} /> 重新聚合速览
            </button>
            <CopyMarkdownButton getText={markdownForCopy} />
            <button
              onClick={exportMd}
              className="glass glass-hover flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
            >
              <Download size={15} /> 导出 .md
            </button>
            {!isFinal && (
              <button
                onClick={finalize}
                disabled={busy}
                className="btn-brand flex h-9 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-60"
              >
                <CheckCircle2 size={15} /> 定稿
              </button>
            )}
          </>
        )}
      </div>

      {!report ? (
        <EmptyState
          kind="reports"
          title={`${week} 还没有周报`}
          description="点「生成周报」，系统会汇总本周 7 天的完成/新建数和各合集投入占比。"
        />
      ) : (
        <GlassCard>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            disabled={isFinal}
            rows={16}
            className="input font-mono text-[13px] leading-relaxed disabled:opacity-70"
          />
        </GlassCard>
      )}
    </div>
  );
}
