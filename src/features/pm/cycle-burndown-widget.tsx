import Link from "next/link";
import { cyclesWithBurndown } from "@/lib/pm/burndown";
import { ProgressRing } from "@/components/ui/progress-ring";

/** Dashboard widget: burndown summary of the first active cycle (PM signature #2). */
export function CycleBurndownWidget() {
  const cycles = cyclesWithBurndown();
  if (cycles.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        还没有周期。给某个合集加上起止日期即可获得燃尽图。
      </p>
    );
  }
  const c = cycles[0];
  const done = c.total - c.remaining;
  const pct = c.total > 0 ? Math.round((done / c.total) * 100) : 0;
  return (
    <Link href={`/cycles`} className="flex items-center gap-4">
      <ProgressRing value={pct} size={72} />
      <div className="min-w-0">
        <div className="truncate font-medium text-fg">{c.title}</div>
        <div className="text-xs text-muted">
          剩余 {c.remaining} / {c.total} · {c.start} → {c.end}
        </div>
      </div>
    </Link>
  );
}
