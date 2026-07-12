"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface Settings {
  displayName: string;
  weekStartsMonday: boolean;
  defaultTheme: string;
  skillProjectRoots: string[];
  allowInternalProxyTargets: boolean;
}

/** Personalization (spec §6.8 ⑤): 称呼 / 每周起始 / 默认主题 + logout. */
export function SettingsPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setS(d.settings));
  }, []);

  const save = async (patch: Partial<Settings>) => {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json();
    setS(d.settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  };

  if (!s) return <GlassCard>加载中…</GlassCard>;

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-fg">个性化</h2>
          {saved && <span className="text-xs text-success">已保存</span>}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">称呼</span>
          <input
            defaultValue={s.displayName}
            onBlur={(e) => save({ displayName: e.target.value })}
            className="input max-w-xs"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.weekStartsMonday}
            onChange={(e) => save({ weekStartsMonday: e.target.checked })}
            className="h-4 w-4 accent-[rgb(var(--aurora-cyan))]"
          />
          <span className="text-sm text-fg">每周起始日为周一</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">默认主题</span>
          <select
            value={s.defaultTheme}
            onChange={(e) => save({ defaultTheme: e.target.value })}
            className="input max-w-xs [&>option]:text-black"
          >
            <option value="dark">深空（暗色）</option>
            <option value="light">云海晨光（亮色）</option>
            <option value="system">跟随系统</option>
          </select>
          <span className="text-[11px] text-muted">
            实际首屏主题仍由浏览器保存的偏好决定，此项作为默认建议。
          </span>
        </label>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-display text-lg font-medium text-fg">安全 · 反向代理</h2>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={s.allowInternalProxyTargets}
            onChange={(e) =>
              save({ allowInternalProxyTargets: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--aurora-cyan))]"
          />
          <span className="text-sm text-fg">
            允许代理到内网 / 本机目标
            <span className="mt-0.5 block text-[11px] text-muted">
              默认关闭。仅在你确实需要代理到本机模型服务（如 oMLX/LM Studio）等内网地址时开启；
              开启后反向代理才可访问 127.0.0.1 / 私网地址。云元数据地址（169.254.169.254）
              <b className="text-fg">始终被拒绝</b>。公网部署请保持关闭。
            </span>
          </span>
        </label>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-2 font-display text-lg font-medium text-fg">会话</h2>
        <button
          onClick={logout}
          className="glass glass-hover flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-danger"
        >
          <LogOut size={15} /> 退出后台
        </button>
      </GlassCard>
    </div>
  );
}
