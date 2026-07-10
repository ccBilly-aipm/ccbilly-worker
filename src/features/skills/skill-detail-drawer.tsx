"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Link2 } from "lucide-react";
import { getSection } from "@/lib/markdown/sections";

interface SkillView {
  slug: string;
  content: string;
  data: { name: string; category: string; level: number; target_level: number; status: string };
}
interface Backlink {
  slug: string;
  type: string;
  data: { title?: string; name?: string };
}

/** Tab B skill detail (spec §6.5): learning timeline + one-click append + backlinks. */
export function SkillDetailDrawer({
  slug,
  onClose,
  onChanged,
}: {
  slug: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [skill, setSkill] = useState<SkillView | null>(null);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/skill-tree/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    const d = await res.json();
    setSkill(d.skill);
    setBacklinks(d.backlinks ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const addLog = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await fetch(`/api/skill-tree/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "log", note }),
    });
    setNote("");
    setBusy(false);
    await load();
    onChanged();
  };

  const learningLog = skill ? getSection(skill.content, "学习记录") : "";
  const resources = skill ? getSection(skill.content, "资源") : "";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex justify-end" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="glass relative h-full w-full max-w-lg overflow-y-auto !rounded-none p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-fg">
              {skill?.data.name ?? slug}
            </h2>
            <button onClick={onClose} aria-label="关闭" className="text-muted hover:text-fg">
              <X size={20} />
            </button>
          </div>

          {skill && (
            <p className="mb-4 text-xs text-muted">
              {skill.data.category} · Lv.{skill.data.level} / 目标 Lv.
              {skill.data.target_level}
            </p>
          )}

          {/* one-click learning log */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">追加学习记录</h3>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLog()}
                placeholder="今天学了什么…"
                className="input"
              />
              <button
                onClick={addLog}
                disabled={busy}
                className="btn-brand flex shrink-0 items-center gap-1 rounded-lg px-3 text-sm"
              >
                <Plus size={15} /> 记一笔
              </button>
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">学习记录</h3>
            <div className="rounded-lg bg-[rgb(var(--glass-bg)/0.06)] p-3 text-sm text-muted whitespace-pre-wrap">
              {learningLog || "（暂无记录）"}
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">资源</h3>
            <div className="rounded-lg bg-[rgb(var(--glass-bg)/0.06)] p-3 text-sm text-muted whitespace-pre-wrap">
              {resources || "（暂无）"}
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <Link2 size={13} /> 反链 · {backlinks.length}
            </h3>
            {backlinks.length === 0 ? (
              <p className="text-sm text-muted">暂无其它条目链接到此技能</p>
            ) : (
              <ul className="space-y-1">
                {backlinks.map((b) => (
                  <li key={b.slug} className="text-sm text-fg">
                    {b.data.title ?? b.data.name ?? b.slug}
                    <span className="ml-2 text-xs text-muted">{b.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
