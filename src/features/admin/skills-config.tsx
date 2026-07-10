"use client";

import { useEffect, useState } from "react";
import { Plus, X, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/** Skill scan-dir config (spec §6.8 ④). Project roots are stored in settings and
 *  also readable from the env var CCBILLY_SKILL_PROJECT_ROOTS. */
export function SkillsConfig() {
  const [roots, setRoots] = useState<string[]>([]);
  const [scanned, setScanned] = useState<{ level: string; label: string }[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setRoots(d.settings.skillProjectRoots ?? []));
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setScanned(d.roots ?? []));
  }, []);

  const save = async (next: string[]) => {
    setRoots(next);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillProjectRoots: next }),
    });
  };

  return (
    <div className="space-y-4">
      <GlassCard className="flex items-start gap-3 border-info/20 !bg-info/5 p-3 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0 text-info" />
        <p>
          个人级 <code className="font-mono">~/.claude/skills</code> 始终扫描。这里配置的
          项目级根目录会额外扫描 <code className="font-mono">&lt;root&gt;/.claude/skills</code>。
          配置也可用环境变量 <code className="font-mono">CCBILLY_SKILL_PROJECT_ROOTS</code>（逗号分隔）。
        </p>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-display text-lg font-medium text-fg">当前扫描目录</h2>
        <ul className="space-y-1 text-sm">
          {scanned.map((r) => (
            <li key={r.level} className="font-mono text-muted">
              {r.label}
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-display text-lg font-medium text-fg">项目级根目录</h2>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="/绝对/路径/到/项目根"
            className="input font-mono"
          />
          <button
            onClick={() => {
              if (input.trim()) {
                save([...roots, input.trim()]);
                setInput("");
              }
            }}
            className="btn-brand flex shrink-0 items-center gap-1 rounded-lg px-3 text-sm"
          >
            <Plus size={15} /> 添加
          </button>
        </div>
        {roots.length === 0 ? (
          <p className="text-sm text-muted">尚未配置项目级根目录。</p>
        ) : (
          <ul className="space-y-1">
            {roots.map((r, i) => (
              <li
                key={r}
                className="flex items-center gap-2 rounded-lg bg-[rgb(var(--glass-bg)/0.06)] px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate font-mono text-muted">{r}</span>
                <button
                  onClick={() => save(roots.filter((_, j) => j !== i))}
                  className="text-danger hover:opacity-80"
                  aria-label="移除"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          修改后需重启开发服务器以让环境变量生效；已在此处配置的目录将在下次扫描时被读取。
        </p>
      </GlassCard>
    </div>
  );
}
