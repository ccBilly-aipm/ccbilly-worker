import { ensureIndexReady } from "@/lib/index/bootstrap";
import { roadmapData } from "@/lib/pm/roadmap";
import { RoadmapTimeline } from "@/features/pm/roadmap-timeline";
import { GlassCard } from "@/components/ui/glass-card";
import { localDateKey } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/** Roadmap timeline (blueprint B3.3). */
export default async function RoadmapPage() {
  await ensureIndexReady();
  const data = roadmapData();
  const today = localDateKey(new Date());

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">路线图</h1>
        <p className="text-sm text-muted">按周期横向铺开，今日线高亮。</p>
      </header>
      <GlassCard>
        <RoadmapTimeline data={data} today={today} />
      </GlassCard>
    </div>
  );
}
