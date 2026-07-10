"use client";

import { useState } from "react";
import { Terminal, TreePine } from "lucide-react";
import { ClaudeSkillsTab } from "@/features/skills/claude-skills-tab";
import { SkillTreeTab } from "@/features/skills/skill-tree-tab";

/** Skill 管理 page: two tabs on one page (spec §6.5). */
export function SkillsTabs() {
  const [tab, setTab] = useState<"claude" | "tree">("claude");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg">Skill 管理</h1>
        <div className="glass ml-auto flex overflow-hidden rounded-full p-0.5">
          <button
            onClick={() => setTab("claude")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
              tab === "claude" ? "btn-brand" : "text-muted"
            }`}
          >
            <Terminal size={14} /> Claude Code Skills
          </button>
          <button
            onClick={() => setTab("tree")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
              tab === "tree" ? "btn-brand" : "text-muted"
            }`}
          >
            <TreePine size={14} /> 个人技能树
          </button>
        </div>
      </div>

      {tab === "claude" ? <ClaudeSkillsTab /> : <SkillTreeTab />}
    </div>
  );
}
