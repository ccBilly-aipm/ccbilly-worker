"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyMarkdownButton } from "@/features/reports/copy-button";
import { ReportCalendar } from "@/features/reports/report-calendar";
import { localDateKey } from "@/lib/utils/date";

interface ReportView {
  slug: string;
  data: { date: string; status: string; generated_at?: string };
  content: string;
}

/** Daily reports (spec §6.3): generate/edit/finalize, calendar browse, copy-md. */
export function DailyClient({ generateToday }: { generateToday?: boolean }) {
  const today = localDateKey();
  const [selected, setSelected] = useState(today);
  const [dailies, setDailies] = useState<ReportView[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/reports/daily", { cache: "no-store" });
    const data = await res.json();
    setDailies(data.dailies ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const current = useMemo(
    () => dailies.find((d) => d.data.date === selected) ?? null,
    [dailies, selected],
  );

  useEffect(() => {
    setDraft(current?.content ?? "");
  }, [current]);

  // auto-trigger generation when arriving with ?generate=1 and none exists today
  useEffect(() => {
    if (generateToday && loaded && !dailies.some((d) => d.data.date === today)) {
      void generate("generate");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateToday, loaded]);

  const generate = async (mode: "generate" | "reaggregate") => {
    if (mode === "reaggregate") {
      if (!confirm("重新聚合会把新的任务动态并入对应小节末尾（不覆盖你手写的内容）。继续？"))
        return;
    }
    setBusy(true);
    try {
      await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: selected, mode }),
      });
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await fetch(`/api/reports/daily/${selected}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", content: draft }),
      });
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    setBusy(true);
    try {
      await save();
      await fetch(`/api/reports/daily/${selected}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const markdownForCopy = () => `# ${selected} 日报\n\n${draft.trim()}\n`;
  const isFinal = current?.data.status === "final";

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <h1 className="font-display text-2xl font-semibold text-fg">日报</h1>
        <ReportCalendar
          type="daily"
          entries={dailies.map((d) => ({
            key: d.data.date,
            status: d.data.status,
          }))}
          selected={selected}
          onSelect={setSelected}
        />
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg text-fg tabular">{selected}</span>
          {current && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isFinal
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              }`}
            >
              {isFinal ? "已定稿" : "草稿"}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!current ? (
              <button
                onClick={() => generate("generate")}
                disabled={busy}
                className="btn-brand flex h-9 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-60"
              >
                <Sparkles size={15} /> 生成日报
              </button>
            ) : (
              <>
                <button
                  onClick={() => generate("reaggregate")}
                  disabled={busy}
                  className="glass glass-hover flex h-9 items-center gap-1.5 rounded-full px-3 text-sm"
                >
                  <RefreshCw size={15} /> 重新聚合
                </button>
                <CopyMarkdownButton getText={markdownForCopy} />
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
        </div>

        {!current ? (
          <EmptyState
            kind="reports"
            title={`${selected} 还没有日报`}
            description="点「生成日报」，系统会把当天所有任务动态按 完成/推进/新建/受阻 归类填入模板。"
          />
        ) : (
          <GlassCard className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              disabled={isFinal}
              rows={22}
              className="input font-mono text-[13px] leading-relaxed disabled:opacity-70"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1">
                <FileText size={12} /> 失焦自动保存 · 纯 Markdown
              </span>
              {!isFinal && (
                <button onClick={save} className="text-brand-cyan hover:underline">
                  立即保存
                </button>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
