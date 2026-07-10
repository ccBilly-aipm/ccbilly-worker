"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<void>;
  collections: string[];
  defaultStatus?: string;
}

const PRIORITIES = ["P0", "P1", "P2", "P3"];

/** New-task modal (spec §6.2). Minimal required field is title. */
export function NewTaskDialog({
  open,
  onClose,
  onCreate,
  collections,
  defaultStatus = "todo",
}: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("P2");
  const [collection, setCollection] = useState("");
  const [due, setDue] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setPriority("P2");
    setCollection("");
    setDue("");
    setTags("");
    setErr(null);
  };

  const submit = async () => {
    if (!title.trim()) {
      setErr("请填写任务标题");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        title: title.trim(),
        status: defaultStatus,
        priority,
        collection: collection || null,
        due: due || null,
        tags: tags
          .split(/[,，\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      });
      reset();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-md space-y-4 p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-fg">
                新建任务
              </h2>
              <button onClick={onClose} aria-label="关闭" className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <Field label="标题">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="例如：接入 Excalidraw 到应用中心"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="优先级">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="input"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="截止日期">
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="合集">
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="input"
              >
                <option value="">（无）</option>
                {collections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="标签（逗号分隔）">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="工作台, 集成"
                className="input"
              />
            </Field>

            {err && <p className="text-sm text-danger">{err}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-fg"
              >
                取消
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="btn-brand rounded-lg px-4 py-2 text-sm disabled:opacity-60"
              >
                {busy ? "创建中…" : "创建"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
