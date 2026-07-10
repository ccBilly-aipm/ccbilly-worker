"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Archive } from "lucide-react";
import type { TaskView } from "@/features/tasks/use-tasks";
import { StatusBadge, PriorityBadge, STATUS_META } from "@/features/tasks/task-badges";
import {
  parseSubtasks,
  parseActivity,
  splitSections,
} from "@/lib/markdown/sections";
import { unwrapWikiLink } from "@/lib/markdown/wikilink";

interface Props {
  task: TaskView | null;
  onClose: () => void;
  onPatch: (slug: string, body: Record<string, unknown>) => Promise<unknown>;
  onDelete: (slug: string) => Promise<void>;
}

const STATUS_OPTIONS = ["todo", "doing", "blocked", "done", "archived"];

/** Task detail drawer (spec §6.2): body editor + subtask checklist + progress
 *  slider + activity timeline. Every change writes back through the API. */
export function TaskDrawer({ task, onClose, onPatch, onDelete }: Props) {
  const [busy, setBusy] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");

  useEffect(() => {
    if (task) {
      setBodyDraft(task.content);
      setEditingBody(false);
    }
  }, [task]);

  const subtasks = useMemo(
    () => (task ? parseSubtasks(task.content) : []),
    [task],
  );
  const activity = useMemo(
    () => (task ? parseActivity(task.content) : []),
    [task],
  );
  const preamble = useMemo(
    () => (task ? splitSections(task.content).preamble : ""),
    [task],
  );

  if (!task) return null;
  const d = task.data;
  const progress = Number(d.progress ?? 0);
  const collection = unwrapWikiLink(d.collection ?? null);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await onPatch(task.slug, body);
    } finally {
      setBusy(false);
    }
  };

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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={String(d.status)} />
                <PriorityBadge priority={String(d.priority)} />
              </div>
              <h2 className="font-display text-xl font-semibold text-fg">
                {String(d.title)}
              </h2>
              {collection && (
                <p className="text-xs text-muted">合集：{collection}</p>
              )}
            </div>
            <button onClick={onClose} aria-label="关闭" className="text-muted hover:text-fg">
              <X size={20} />
            </button>
          </div>

          {/* Status switcher */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">状态</h3>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => {
                const active = d.status === s;
                return (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => run({ action: "status", status: s })}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-transparent bg-[rgb(var(--aurora-cyan)/0.18)] text-fg"
                        : "border-[rgb(var(--border)/0.12)] text-muted hover:text-fg"
                    }`}
                  >
                    {STATUS_META[s]?.label ?? s}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Progress slider */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs text-muted">进度</h3>
              <span className="font-display text-sm text-fg tabular">
                {progress}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              defaultValue={progress}
              key={`${task.slug}-${progress}`}
              disabled={busy}
              onMouseUp={(e) =>
                run({
                  action: "progress",
                  progress: Number((e.target as HTMLInputElement).value),
                })
              }
              onTouchEnd={(e) =>
                run({
                  action: "progress",
                  progress: Number((e.target as HTMLInputElement).value),
                })
              }
              className="w-full accent-[rgb(var(--aurora-cyan))]"
            />
          </section>

          {/* Subtasks */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">子任务 · {subtasks.length}</h3>
            {subtasks.length === 0 ? (
              <p className="text-sm text-muted">暂无子任务</p>
            ) : (
              <ul className="space-y-1.5">
                {subtasks.map((st) => (
                  <li key={st.index} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={st.done}
                      disabled={busy}
                      onChange={(e) =>
                        run({
                          action: "subtask",
                          index: st.index,
                          done: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[rgb(var(--aurora-cyan))]"
                    />
                    <span className={st.done ? "text-muted line-through" : "text-fg"}>
                      {st.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Body / description editor */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs text-muted">描述与内容</h3>
              <button
                onClick={() => {
                  if (editingBody) {
                    void run({ action: "fields", fields: { content: bodyDraft } });
                  }
                  setEditingBody((v) => !v);
                }}
                className="text-xs text-brand-cyan hover:underline"
              >
                {editingBody ? "保存" : "编辑"}
              </button>
            </div>
            {editingBody ? (
              <textarea
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={12}
                className="input font-mono text-xs leading-relaxed"
              />
            ) : (
              <div className="rounded-lg bg-[rgb(var(--glass-bg)/0.06)] p-3 text-sm text-muted whitespace-pre-wrap">
                {preamble || "（无描述）"}
              </div>
            )}
          </section>

          {/* Activity timeline */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs text-muted">动态 · {activity.length}</h3>
            <ul className="space-y-2 border-l border-[rgb(var(--border)/0.15)] pl-3">
              {[...activity].reverse().map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="text-muted tabular">{a.timestamp}</span>
                  <span className="ml-2 text-fg">{a.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Danger zone */}
          <div className="flex gap-2 border-t border-[rgb(var(--border)/0.1)] pt-4">
            <button
              disabled={busy}
              onClick={() => run({ action: "archive" })}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg"
            >
              <Archive size={15} /> 归档
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (confirm(`确定删除任务「${d.title}」？将移入 vault 回收站。`)) {
                  await onDelete(task.slug);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 size={15} /> 删除
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
