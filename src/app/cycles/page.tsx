import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listByType } from "@/lib/index/queries";
import { cyclesWithBurndown } from "@/lib/pm/burndown";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { LazyBurndownChart } from "@/features/dashboard/lazy-charts";
import { CycleStarter, type CollectionOption } from "@/features/pm/cycle-starter";

export const dynamic = "force-dynamic";

/** Cycles + burndown (blueprint B3.2). */
export default async function CyclesPage() {
  await ensureIndexReady();
  const cycles = cyclesWithBurndown();
  const collections: CollectionOption[] = listByType("collection").map((c) => ({
    slug: c.slug,
    title: String(c.data.title),
    hasCycle: Boolean(c.data.cycle),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">周期</h1>
        <p className="text-sm text-muted">
          给合集设定起止日期即成为一个冲刺周期，自动获得燃尽图。
        </p>
      </header>

      <CycleStarter collections={collections} />

      {cycles.length === 0 ? (
        <GlassCard>
          <p className="py-6 text-center text-sm text-muted">
            还没有周期。用上面的表单给某个合集开启第一个周期。
          </p>
        </GlassCard>
      ) : (
        cycles.map((c) => {
          const done = c.total - c.remaining;
          const pct = c.total > 0 ? Math.round((done / c.total) * 100) : 0;
          return (
            <GlassCard key={c.slug} className="space-y-3">
              <div className="flex items-center gap-4">
                <ProgressRing value={pct} size={64} />
                <div className="min-w-0">
                  <div className="font-display text-lg font-medium text-fg">
                    {c.title}
                  </div>
                  <div className="text-xs text-muted">
                    {c.start} → {c.end} · 剩余 {c.remaining} / {c.total} 任务 · 完成{" "}
                    {pct}%
                  </div>
                </div>
              </div>
              <LazyBurndownChart data={c.points} />
            </GlassCard>
          );
        })
      )}
    </div>
  );
}
