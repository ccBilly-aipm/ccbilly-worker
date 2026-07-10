"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { SkillRadar } from "@/features/skills/skill-radar";
import { SkillDetailDrawer } from "@/features/skills/skill-detail-drawer";

interface SkillEntry {
  slug: string;
  data: {
    name: string;
    category: string;
    level: number;
    target_level: number;
    status: string;
  };
}
interface Matrix {
  categories: { category: string; skills: SkillEntry[] }[];
  radar: { category: string; avgLevel: number; count: number }[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  learning: { label: "学习中", cls: "bg-info/15 text-info" },
  using: { label: "使用中", cls: "bg-brand-cyan/15 text-brand-cyan" },
  mastered: { label: "已精通", cls: "bg-success/15 text-success" },
  paused: { label: "暂停", cls: "bg-muted/15 text-muted" },
};

/** Tab B: personal skill tree (spec §6.5). Matrix by category + radar. */
export function SkillTreeTab() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/skill-tree", { cache: "no-store" });
    setMatrix(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );

  if (!matrix || matrix.categories.length === 0)
    return (
      <EmptyState
        kind="skills"
        title="技能树是空的"
        description="在 vault/skills/ 下添加技能条目，或用 pnpm seed 生成演示数据。"
      />
    );

  return (
    <div className="space-y-4">
      <GlassCard>
        <h3 className="mb-2 text-sm text-muted">分类雷达</h3>
        <SkillRadar data={matrix.radar} />
      </GlassCard>

      {matrix.categories.map((cat) => (
        <section key={cat.category} className="space-y-2">
          <h3 className="font-display text-sm font-medium text-fg">
            {cat.category}
            <span className="ml-2 text-xs text-muted">{cat.skills.length}</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.skills.map((s) => {
              const st = STATUS_LABEL[s.data.status] ?? STATUS_LABEL.learning;
              const level = Number(s.data.level ?? 1);
              const target = Number(s.data.target_level ?? 5);
              return (
                <button
                  key={s.slug}
                  onClick={() => setOpen(s.slug)}
                  className="glass glass-hover space-y-2 p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">
                      {s.data.name}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < level
                            ? "bg-brand"
                            : i < target
                              ? "bg-[rgb(var(--fg)/0.15)]"
                              : "bg-[rgb(var(--fg)/0.06)]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted tabular">
                    Lv.{level} / 目标 Lv.{target}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && (
        <SkillDetailDrawer
          slug={open}
          onClose={() => setOpen(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
