"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Triggers a full index rebuild (spec §6.8: 「重建索引」按钮). */
export function ReindexButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reindex", { method: "POST" });
      const data = await res.json();
      setMsg(`已重建：${data.entries} 条 · ${data.broken} 待修复`);
      router.refresh();
    } catch {
      setMsg("重建失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="btn-brand flex h-8 items-center gap-1.5 rounded-full px-3 text-sm disabled:opacity-60"
      >
        <RefreshCw size={14} className={cn(busy && "animate-spin")} />
        {busy ? "重建中…" : "重建索引"}
      </button>
    </div>
  );
}
