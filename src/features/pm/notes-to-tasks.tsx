"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { extractActionItems } from "@/lib/pm/templates";
import { ListChecks } from "lucide-react";

/**
 * Meeting-notes → action items (blueprint B3.5). Paste notes containing
 * `- [ ] @行动项` lines; preview the extracted items; one click creates a task
 * for each.
 */
export function NotesToTasks() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const items = extractActionItems(text);

  const convert = async () => {
    if (items.length === 0 || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/notes-to-tasks", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ markdown: text }),
      });
      const d = await res.json();
      setResult(d.created ?? 0);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted">
        <ListChecks size={15} /> 会议纪要 → 行动项
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={"粘贴纪要，含如下行会被提取：\n- [ ] @张三 跟进接口联调"}
        className="input w-full resize-y font-mono text-xs"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          识别到 {items.length} 个行动项
        </span>
        <button
          type="button"
          disabled={items.length === 0 || busy}
          onClick={convert}
          className="glass glass-hover rounded-lg px-3 py-1.5 text-sm text-fg disabled:opacity-50"
        >
          批量转任务
        </button>
      </div>
      {result !== null && (
        <p className="text-xs text-success">已创建 {result} 个任务。</p>
      )}
    </GlassCard>
  );
}
