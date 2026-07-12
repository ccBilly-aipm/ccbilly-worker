"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PRESETS, type PresetId } from "@/lib/preset/presets";
import { Target, PenSquare, Layers, Check, ArrowRight } from "lucide-react";

/**
 * Three-screen onboarding (blueprint B5.5): pick role → preview → done. Skippable
 * (defaults to 双修). Writing the choice goes through the auth-guarded preset API.
 */

const ROLE_ICON: Record<PresetId, typeof Target> = {
  pm: Target,
  creator: PenSquare,
  both: Layers,
};

export function OnboardingClient() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<PresetId>("both");
  const [saving, setSaving] = useState(false);

  const finish = async (preset: PresetId) => {
    setSaving(true);
    await fetch("/api/preset", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ active: preset, onboarded: true }),
    });
    // full reload so the server layout re-reads the preset and re-renders nav
    window.location.assign("/");
  };

  const skip = () => finish("both");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-6 py-10">
      {step === 0 && (
        <div className="w-full space-y-5 text-center">
          <h1 className="font-display text-2xl font-semibold text-fg md:text-3xl">
            欢迎，先选个角色
          </h1>
          <p className="text-sm text-muted">
            角色决定工作台默认展示哪些模块。随时可在后台切换，且<b className="text-fg">不影响任何数据</b>。
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(PRESETS) as PresetId[]).map((id) => {
              const p = PRESETS[id];
              const Icon = ROLE_ICON[id];
              const selected = choice === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChoice(id)}
                  aria-pressed={selected}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[rgb(var(--aurora-cyan)/0.5)] bg-[rgb(var(--aurora-cyan)/0.08)]"
                      : "border-[rgb(var(--border)/0.14)] hover:border-[rgb(var(--border)/0.3)]"
                  }`}
                >
                  <Icon size={22} className="mb-2 text-brand-cyan" />
                  <div className="font-display text-base font-medium text-fg">
                    {p.label}
                  </div>
                  <p className="mt-1 text-xs text-muted">{p.description}</p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-fg"
            >
              下一步 <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={skip}
              className="text-sm text-muted hover:text-fg"
            >
              跳过（用双修模式）
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full space-y-5 text-center">
          <h1 className="font-display text-2xl font-semibold text-fg">
            {PRESETS[choice].label} · 预览
          </h1>
          <GlassCard className="text-left">
            <p className="mb-3 text-sm text-muted">这个预设会显示这些模块：</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS[choice].modules.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-[rgb(var(--glass-bg)/0.1)] px-2.5 py-1 text-xs text-fg"
                >
                  {m}
                </span>
              ))}
            </div>
          </GlassCard>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-muted hover:text-fg"
            >
              返回
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => finish(choice)}
              className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-fg disabled:opacity-50"
            >
              <Check size={15} /> 完成，进入工作台
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
