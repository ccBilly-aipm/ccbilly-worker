"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PM_TEMPLATES } from "@/lib/pm/templates";
import { Copy, Check, FileText } from "lucide-react";

/**
 * PM template pack (blueprint B3.6). Lists built-in templates; "copy" puts the
 * template body on the clipboard to paste into a new doc / knowledge note.
 */
export function TemplatesPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <GlassCard className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted">
        <FileText size={15} /> 模板包
      </h2>
      <ul className="space-y-2">
        {PM_TEMPLATES.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-[rgb(var(--glass-bg)/0.05)] px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm text-fg">{t.title}</div>
              <div className="truncate text-[11px] text-muted">{t.description}</div>
            </div>
            <button
              type="button"
              onClick={() => copy(t.id, t.body)}
              aria-label={`复制 ${t.title} 模板`}
              className="shrink-0 rounded p-1.5 text-muted hover:text-brand-cyan"
            >
              {copied === t.id ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
