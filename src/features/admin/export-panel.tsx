"use client";

import { Download } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/** Data export (spec §6.8 ⑥): download the whole vault/ as a zip. */
export function ExportPanel() {
  return (
    <GlassCard className="space-y-3">
      <h2 className="font-display text-lg font-medium text-fg">数据导出</h2>
      <p className="text-sm text-muted">
        一键打包整个 <code className="font-mono">vault/</code> 为 zip 下载。zip 内是纯
        Markdown，可直接解压、用 Obsidian 打开或导入其它工具。
      </p>
      <a
        href="/api/admin/export"
        className="btn-brand inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm"
        download
      >
        <Download size={15} /> 下载 vault.zip
      </a>
    </GlassCard>
  );
}
