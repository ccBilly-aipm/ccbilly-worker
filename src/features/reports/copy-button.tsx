"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Copy-as-Markdown button (spec §6.3): copies pure Markdown for Feishu paste. */
export function CopyMarkdownButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable (insecure context); fall back to a textarea
      const ta = document.createElement("textarea");
      ta.value = getText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      onClick={copy}
      className="glass glass-hover flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-fg"
    >
      {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
      {copied ? "已复制" : "复制为 Markdown"}
    </button>
  );
}
