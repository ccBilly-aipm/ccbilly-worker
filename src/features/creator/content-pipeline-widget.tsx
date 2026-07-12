import Link from "next/link";
import { listContent } from "@/lib/index/queries";

const STAGES: { key: string; label: string }[] = [
  { key: "idea", label: "选题" },
  { key: "draft", label: "草稿" },
  { key: "ready", label: "待发" },
  { key: "published", label: "已发" },
  { key: "review", label: "复盘" },
];

/** Dashboard widget: content pipeline counts per stage. */
export function ContentPipelineWidget() {
  const items = listContent();
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        选题库还是空的。到「选题库」记下第一个灵感。
      </p>
    );
  }
  const counts = new Map<string, number>();
  for (const it of items) {
    const stage = String(it.data.stage ?? "idea");
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return (
    <Link href="/content" className="grid grid-cols-5 gap-1.5">
      {STAGES.map((s) => (
        <div
          key={s.key}
          className="rounded-lg bg-[rgb(var(--glass-bg)/0.08)] px-1 py-2 text-center"
        >
          <div className="font-display text-lg font-semibold text-fg tabular">
            {counts.get(s.key) ?? 0}
          </div>
          <div className="text-[10px] text-muted">{s.label}</div>
        </div>
      ))}
    </Link>
  );
}
