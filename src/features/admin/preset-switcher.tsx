"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PRESETS, type PresetId } from "@/lib/preset/presets";

/**
 * Admin preset switcher (ADR-020). Switching is a mutation guarded by the auth
 * middleware; it only changes which modules show, never business data. A full
 * reload re-reads the preset in the server layout so nav updates immediately.
 */
export function PresetSwitcher() {
  const [active, setActive] = useState<PresetId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/preset")
      .then((r) => r.json())
      .then((d) => setActive(d.preset.active));
  }, []);

  const choose = async (id: PresetId) => {
    if (busy || id === active) return;
    setBusy(true);
    await fetch("/api/preset", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ active: id }),
    });
    // reload so the server layout re-renders the preset-filtered nav
    window.location.reload();
  };

  return (
    <GlassCard className="space-y-3">
      <h2 className="font-display text-lg font-medium text-fg">角色预设</h2>
      <p className="text-[11px] text-muted">
        切换只改变展示哪些模块，<b className="text-fg">不迁移、不删除任何数据</b>。
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {(Object.keys(PRESETS) as PresetId[]).map((id) => {
          const p = PRESETS[id];
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => choose(id)}
              aria-pressed={on}
              className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                on
                  ? "border-[rgb(var(--aurora-cyan)/0.5)] bg-[rgb(var(--aurora-cyan)/0.08)]"
                  : "border-[rgb(var(--border)/0.14)] hover:border-[rgb(var(--border)/0.3)]"
              }`}
            >
              <div className="text-sm font-medium text-fg">
                {p.label}
                {on && <span className="ml-1.5 text-xs text-brand-cyan">当前</span>}
              </div>
              <p className="mt-1 text-[11px] text-muted">{p.description}</p>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
