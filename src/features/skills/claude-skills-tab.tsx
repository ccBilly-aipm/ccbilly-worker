"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, FileCode, Lock, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { SkillEditor } from "@/features/skills/skill-editor";

interface SkillSummary {
  name: string;
  level: "personal" | "project";
  rootLabel: string;
  description: string;
  skillPath: string;
  mtimeMs: number;
  overriddenBy?: string;
}

/** Tab A: Claude Code Skills manager (spec §6.5). Scan/view/edit real SKILL.md.
 *  New/delete write are deferred per ADR-006 (shown disabled). */
export function ClaudeSkillsTab() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [roots, setRoots] = useState<{ level: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<SkillSummary | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/skills", { cache: "no-store" });
    const data = await res.json();
    setSkills(data.skills ?? []);
    setRoots(data.roots ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <GlassCard className="flex items-start gap-3 border-info/20 !bg-info/5 p-3 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-info" />
        <div className="space-y-1 text-muted">
          <p>
            这里管理的是<b className="text-fg">真实生效</b>的 Claude Code Skill 文件。SKILL.md
            的改动对运行中的会话即时生效（仅新建顶级 skills 目录需要重启 Claude Code）。
          </p>
          <p className="flex items-center gap-1 text-xs">
            <Shield size={13} className="text-success" />
            所有文件操作限定在白名单目录内并严防路径穿越；当前阶段仅开放 查看 / 编辑（保存前自动备份），新建/删除稍后开放。
          </p>
        </div>
      </GlassCard>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {roots.map((r) => (
          <span key={r.level} className="glass rounded-full px-3 py-1">
            {r.label}
          </span>
        ))}
        <span className="ml-auto">共 {skills.length} 个 Skill</span>
        <button
          disabled
          title="按 ADR-006，对真实 ~/.claude/skills 的新建将在安全性验收后开放"
          className="glass flex cursor-not-allowed items-center gap-1 rounded-full px-3 py-1 opacity-50"
        >
          <Lock size={12} /> 新建（暂未开放）
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <EmptyState
          kind="skills"
          title="未扫描到 Skill"
          description="在 ~/.claude/skills 下放置 <名称>/SKILL.md，或在后台配置项目级扫描目录。"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.map((s) => (
            <button
              key={`${s.level}-${s.name}`}
              onClick={() => setOpen(s)}
              className="glass glass-hover space-y-1.5 p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <FileCode size={15} className="text-brand-cyan" />
                <span className="font-mono text-sm text-fg">{s.name}</span>
                <span
                  className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${
                    s.level === "personal"
                      ? "bg-brand-cyan/15 text-brand-cyan"
                      : "bg-muted/15 text-muted"
                  }`}
                >
                  {s.level === "personal" ? "个人级" : "项目级"}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-muted">{s.description}</p>
              {s.overriddenBy && (
                <p className="text-[10px] text-warning">
                  被个人级同名 Skill 覆盖
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {open && (
        <SkillEditor
          level={open.level}
          name={open.name}
          onClose={() => setOpen(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
