"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, GitCommit, RefreshCw, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface GitStatus {
  available: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  changed?: number;
  files?: { path: string; status: string }[];
  hasRemote?: boolean;
  conflicted?: string[];
}

/** Git sync panel (spec §2/§6.8): status, quick commit, sync, conflict display.
 *  Never force-pushes; conflicts are surfaced, not auto-resolved. */
export function GitPanel() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/git/status", { cache: "no-store" });
    setStatus(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const commit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/git/commit", { method: "POST" });
    const d = await res.json();
    setMsg({ ok: d.ok, text: d.message + (d.detail ? ` — ${d.detail}` : "") });
    setBusy(false);
    await load();
  };

  const sync = async () => {
    setBusy(true);
    setMsg(null);
    setConflicts([]);
    const res = await fetch("/api/git/sync", { method: "POST" });
    const d = await res.json();
    setMsg({ ok: d.ok, text: d.message + (d.detail ? ` — ${d.detail}` : "") });
    if (d.conflicts) setConflicts(d.conflicts);
    setBusy(false);
    await load();
  };

  if (!status) return <GlassCard>加载 Git 状态…</GlassCard>;

  if (!status.available) {
    return (
      <GlassCard className="space-y-2">
        <div className="flex items-center gap-2 text-fg">
          <GitBranch size={18} /> 未检测到 Git 仓库
        </div>
        <p className="text-sm text-muted">
          在项目根执行 <code className="font-mono">git init</code> 后即可使用同步面板。
        </p>
      </GlassCard>
    );
  }

  const dirty = (status.changed ?? 0) > 0;

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-fg">
            <GitBranch size={16} className="text-brand-cyan" />
            {status.branch}
          </span>
          <span className="text-muted tabular">变更 {status.changed}</span>
          <span className="text-info tabular">领先 {status.ahead ?? 0}</span>
          <span className="text-danger tabular">落后 {status.behind ?? 0}</span>
          <span className="text-muted">
            {status.hasRemote ? "已配置远端" : "未配置远端"}
          </span>
          <button
            onClick={load}
            className="ml-auto text-muted hover:text-fg"
            aria-label="刷新"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={commit}
            disabled={busy || !dirty}
            className="btn-brand flex items-center gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-50"
          >
            <GitCommit size={15} /> 快速提交
          </button>
          <button
            onClick={sync}
            disabled={busy || !status.hasRemote}
            title={status.hasRemote ? "" : "未配置远端"}
            className="glass glass-hover flex items-center gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={15} /> 同步（pull --rebase 后 push）
          </button>
        </div>

        {!status.hasRemote && (
          <p className="text-xs text-muted">
            提示：先 <code className="font-mono">git remote add origin &lt;url&gt;</code> 并
            <code className="font-mono">git push -u origin main</code> 一次，之后即可用同步按钮。
          </p>
        )}

        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.ok
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {msg.text}
          </p>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
              <AlertTriangle size={15} /> 检测到冲突，请用 Obsidian / 编辑器手动解决：
            </p>
            <ul className="mt-1 space-y-0.5 font-mono text-xs text-muted">
              {conflicts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>

      {dirty && status.files && (
        <GlassCard>
          <h3 className="mb-2 text-sm text-muted">变更文件 · {status.files.length}</h3>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto font-mono text-xs">
            {status.files.map((f) => (
              <li key={f.path} className="flex gap-2 text-muted">
                <span className="w-6 text-brand-cyan">{f.status}</span>
                <span>{f.path}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
