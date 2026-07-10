"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, FolderTree, Folder, File as FileIcon } from "lucide-react";

interface FileNode {
  name: string;
  relPath: string;
  type: "file" | "dir";
  children?: FileNode[];
}
interface SkillDetail {
  name: string;
  level: string;
  rootLabel: string;
  skillPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
  files: FileNode[];
}

/** Skill viewer/editor drawer (spec §6.5). Edits name+description+body; saving
 *  preserves unknown frontmatter fields (allowed-tools etc.) via the server. */
export function SkillEditor({
  level,
  name,
  onClose,
  onSaved,
}: {
  level: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [nameField, setNameField] = useState("");
  const [descField, setDescField] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/skills/${level}/${encodeURIComponent(name)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.skill) {
          setDetail(d.skill);
          setNameField(String(d.skill.frontmatter.name ?? name));
          setDescField(String(d.skill.frontmatter.description ?? ""));
          setBody(d.skill.body ?? "");
        } else {
          setErr(d.error ?? "加载失败");
        }
      })
      .catch((e) => setErr(String(e)));
  }, [level, name]);

  const save = async () => {
    if (!detail) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    // preserve unknown frontmatter, override name+description
    const fm = { ...detail.frontmatter, name: nameField, description: descField };
    const res = await fetch(`/api/skills/${level}/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ frontmatter: fm, body }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(d.error ?? "保存失败");
      return;
    }
    setMsg("已保存（原文件已备份到该 skill 根的 .trash/）");
    onSaved();
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
          className="glass relative h-full w-full max-w-2xl overflow-y-auto !rounded-none p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                编辑 Skill
              </h2>
              {detail && (
                <p className="font-mono text-xs text-muted">{detail.rootLabel}</p>
              )}
            </div>
            <button onClick={onClose} aria-label="关闭" className="text-muted hover:text-fg">
              <X size={20} />
            </button>
          </div>

          {err && (
            <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
              {err}
            </p>
          )}
          {msg && (
            <p className="mb-3 rounded-lg border border-success/30 bg-success/10 p-2 text-sm text-success">
              {msg}
            </p>
          )}

          {!detail ? (
            <p className="text-sm text-muted">加载中…</p>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">
                  name（小写字母/数字/连字符，≤64）
                </span>
                <input
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                  className="input font-mono"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">
                  description（写清「能力 + 触发场景」，必填）
                </span>
                <textarea
                  value={descField}
                  onChange={(e) => setDescField(e.target.value)}
                  rows={3}
                  className="input text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">正文（Markdown）</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className="input font-mono text-xs leading-relaxed"
                />
              </label>

              {/* attachment file tree */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <FolderTree size={13} /> 附属文件
                </span>
                <div className="rounded-lg bg-[rgb(var(--glass-bg)/0.06)] p-3 text-xs">
                  <FileTree nodes={detail.files} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[rgb(var(--border)/0.1)] pt-3">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-fg"
                >
                  关闭
                </button>
                <button
                  onClick={save}
                  disabled={busy}
                  className="btn-brand flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                >
                  <Save size={15} /> {busy ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          )}
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  if (nodes.length === 0)
    return <span className="text-muted">（仅 SKILL.md）</span>;
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <li key={n.relPath} style={{ paddingLeft: depth * 12 }}>
          <span className="flex items-center gap-1.5 text-muted">
            {n.type === "dir" ? (
              <Folder size={12} className="text-brand-indigo" />
            ) : (
              <FileIcon size={12} />
            )}
            <span className={n.type === "dir" ? "text-fg" : ""}>{n.name}</span>
          </span>
          {n.children && n.children.length > 0 && (
            <FileTree nodes={n.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
