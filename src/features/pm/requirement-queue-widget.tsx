import Link from "next/link";
import { listRequirements } from "@/lib/index/queries";
import { riceScore } from "@/lib/pm/rice";
import type { Rice } from "@/lib/schema";

/** Dashboard widget: top requirements by RICE score awaiting triage/scheduling. */
export function RequirementQueueWidget() {
  const reqs = listRequirements().slice(0, 6);
  if (reqs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        需求池为空。到「需求池」新建第一个需求并打 RICE 分。
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {reqs.map((r) => (
        <Link
          key={r.filePath}
          href="/requirements"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
        >
          <span className="truncate text-fg">{String(r.data.title)}</span>
          <span className="ml-2 shrink-0 rounded bg-[rgb(var(--aurora-cyan)/0.12)] px-1.5 py-0.5 text-xs text-brand-cyan tabular">
            {riceScore(r.data.rice as Rice)}
          </span>
        </Link>
      ))}
    </ul>
  );
}
