"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface AppEntry {
  slug: string;
  data: {
    id: string;
    name: string;
    mode: string;
    url: string;
    icon?: string;
    category?: string;
    status: string;
    order?: number;
    notes?: string;
    proxyBaseUrl?: string;
  };
}

const EMPTY = {
  name: "",
  mode: "link",
  url: "",
  icon: "",
  category: "",
  status: "enabled",
  proxyBaseUrl: "",
};

/** Apps CRUD (spec §6.8 ③). Writes to vault/apps/. */
export function AppsAdmin() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/apps", { cache: "no-store" });
    const d = await res.json();
    setApps(d.apps ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (a: AppEntry) => {
    setEditing(a.slug);
    setForm({
      name: a.data.name,
      mode: a.data.mode,
      url: a.data.url,
      icon: a.data.icon ?? "",
      category: a.data.category ?? "",
      status: a.data.status,
      proxyBaseUrl: a.data.proxyBaseUrl ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      ...(form.mode === "proxy" ? { proxyBaseUrl: form.proxyBaseUrl } : {}),
    };
    if (editing) {
      await fetch(`/api/apps/${editing}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    await load();
  };

  const remove = async (slug: string) => {
    if (!confirm("删除该应用？将移入 vault 回收站。")) return;
    await fetch(`/api/apps/${slug}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-fg">应用管理</h2>
        <button
          onClick={openNew}
          className="btn-brand flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
        >
          <Plus size={15} /> 新建应用
        </button>
      </div>

      {showForm && (
        <GlassCard className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="名称">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Labeled>
            <Labeled label="图标（emoji）">
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🧩"
                className="input"
              />
            </Labeled>
            <Labeled label="模式">
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="input [&>option]:text-black"
              >
                <option value="link">link（新标签打开）</option>
                <option value="iframe">iframe（内嵌）</option>
                <option value="proxy">proxy（反向代理）</option>
              </select>
            </Labeled>
            <Labeled label="分类">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              />
            </Labeled>
            <Labeled label="URL">
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="input"
              />
            </Labeled>
            <Labeled label="状态">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input [&>option]:text-black"
              >
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </Labeled>
            {form.mode === "proxy" && (
              <Labeled label="proxyBaseUrl（代理目标）">
                <input
                  value={form.proxyBaseUrl}
                  onChange={(e) =>
                    setForm({ ...form, proxyBaseUrl: e.target.value })
                  }
                  placeholder="https://api.example.com"
                  className="input"
                />
              </Labeled>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:text-fg"
            >
              取消
            </button>
            <button onClick={save} className="btn-brand rounded-lg px-4 py-2 text-sm">
              保存
            </button>
          </div>
        </GlassCard>
      )}

      <GlassCard className="divide-y divide-[rgb(var(--border)/0.08)] p-0">
        {apps.length === 0 ? (
          <p className="p-4 text-sm text-muted">还没有应用，点「新建应用」添加。</p>
        ) : (
          apps.map((a) => (
            <div key={a.slug} className="flex items-center gap-3 p-3 text-sm">
              <span className="text-xl">{a.data.icon || "🧩"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-fg">{a.data.name}</div>
                <div className="truncate text-xs text-muted">
                  {a.data.mode} · {a.data.category} ·{" "}
                  {a.data.status === "enabled" ? "启用" : "停用"}
                </div>
              </div>
              <button
                onClick={() => openEdit(a)}
                className="text-muted hover:text-fg"
                aria-label="编辑"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => remove(a.slug)}
                className="text-danger hover:opacity-80"
                aria-label="删除"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
