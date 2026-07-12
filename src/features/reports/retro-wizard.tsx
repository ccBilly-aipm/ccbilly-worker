"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";

/**
 * Weekly retro guided flow (blueprint B5.4): four steps —
 * 1) auto-summarize this week's data, 2) highlights, 3) problems, 4) next-week
 * plan — producing a finalized weekly report. Uses the existing weekly
 * generate + save APIs. `week` is the ISO week key (YYYY-Www).
 */
export function RetroWizard({ week }: { week: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState("");
  const [problems, setProblems] = useState("");
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setOpen(true);
    setStep(0);
    setBusy(true);
    try {
      // generate to get the auto week summary, then read it back
      await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ week }),
      });
      const r = await fetch(`/api/reports/weekly/${week}`);
      const d = await r.json();
      const body: string = d.report?.content ?? "";
      // pull the 本周速览 section as the summary seed
      const m = body.match(/## 本周速览\n([\s\S]*?)(?=\n## |$)/);
      setSummary((m ? m[1] : body).trim());
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    const content = [
      "## 本周速览",
      summary.trim() || "（本周数据）",
      "",
      "## 重点产出",
      highlights.trim() || "- ",
      "",
      "## 问题与风险",
      problems.trim() || "- ",
      "",
      "## 下周计划",
      plan.trim() || "- ",
      "",
    ].join("\n");
    try {
      const headers = { "content-type": "application/json", "x-ccbilly-admin": "1" };
      // save the assembled body, then finalize
      await fetch(`/api/reports/weekly/${week}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "save", content }),
      });
      await fetch(`/api/reports/weekly/${week}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "finalize" }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-fg"
      >
        <Sparkles size={15} /> 周复盘引导
      </button>
    );
  }

  const steps = [
    {
      title: "① 本周数据",
      hint: "系统已自动汇总本周完成/新增/投入。可微调。",
      value: summary,
      set: setSummary,
    },
    { title: "② 亮点", hint: "这周做得好的、值得记住的。", value: highlights, set: setHighlights },
    { title: "③ 问题", hint: "遇到的问题与风险。", value: problems, set: setProblems },
    { title: "④ 下周计划", hint: "下周要推进的重点。", value: plan, set: setPlan },
  ];
  const s = steps[step];

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-medium text-fg">{s.title}</h3>
        <span className="text-xs text-muted">{step + 1} / 4</span>
      </div>
      <p className="text-xs text-muted">{s.hint}</p>
      <textarea
        value={s.value}
        onChange={(e) => s.set(e.target.value)}
        rows={6}
        className="input w-full resize-y text-sm"
        disabled={busy && step === 0}
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg disabled:opacity-40"
        >
          <ArrowLeft size={14} /> 上一步
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((v) => v + 1)}
            className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-fg"
          >
            下一步 <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-fg disabled:opacity-50"
          >
            <Check size={14} /> 完成并定稿
          </button>
        )}
      </div>
    </GlassCard>
  );
}
