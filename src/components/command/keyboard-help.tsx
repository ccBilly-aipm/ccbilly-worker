"use client";

import { useEffect, useState } from "react";

/**
 * Keyboard shortcut cheat sheet (blueprint B5.2). Press `?` (outside inputs) to
 * toggle. Lists the global shortcuts. Esc closes.
 */
const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Cmd/Ctrl + K", label: "命令面板（搜索 + 快捷动作）" },
  { keys: "! …  在命令面板", label: "快速捕捉到收件箱" },
  { keys: "?", label: "显示 / 隐藏本快捷键表" },
  { keys: "Esc", label: "关闭面板 / 弹层" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-sm rounded-2xl p-5"
        role="dialog"
        aria-label="快捷键"
      >
        <h2 className="mb-3 font-display text-lg font-medium text-fg">快捷键</h2>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">{s.label}</span>
              <kbd className="shrink-0 rounded bg-[rgb(var(--glass-bg)/0.15)] px-2 py-0.5 font-mono text-xs text-fg">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
