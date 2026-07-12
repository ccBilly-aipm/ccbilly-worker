"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

/**
 * Quick-capture input (blueprint B5.1). One line → vault/inbox. Used both on the
 * dashboard widget (compact) and the inbox page. Refreshes the route so the
 * server re-reads the inbox list.
 */
export function QuickCaptureForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={compact ? "快速记一句…" : "记点什么，稍后再分诊…"}
        aria-label="快速捕捉"
        className="input flex-1"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        aria-label="捕捉"
        className="glass glass-hover inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-fg disabled:opacity-50"
      >
        <Send size={15} />
      </button>
    </form>
  );
}
