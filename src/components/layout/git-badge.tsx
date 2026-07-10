"use client";

import useSWRLike from "@/lib/hooks/use-poll";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface GitStatus {
  available: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  changed?: number;
}

/** Compact git status badge in the topbar (spec §6.1). Polls the status API. */
export function GitBadge() {
  const { data } = useSWRLike<GitStatus>("/api/git/status", 15000);

  if (!data || !data.available) {
    return (
      <span
        className="glass hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted sm:flex"
        title="未检测到 Git 仓库"
      >
        <GitBranch size={14} />
        <span>未接入</span>
      </span>
    );
  }

  const dirty = (data.changed ?? 0) > 0;
  return (
    <a
      href="/admin/git"
      className="glass glass-hover hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs sm:flex"
      title={`分支 ${data.branch} · 领先 ${data.ahead} · 落后 ${data.behind} · 变更 ${data.changed}`}
    >
      <GitBranch size={14} className={cn(dirty ? "text-warning" : "text-success")} />
      <span className="text-fg">{data.branch}</span>
      {dirty && <span className="text-warning">{data.changed}</span>}
      {(data.ahead ?? 0) > 0 && <span className="text-info">↑{data.ahead}</span>}
      {(data.behind ?? 0) > 0 && <span className="text-danger">↓{data.behind}</span>}
    </a>
  );
}
