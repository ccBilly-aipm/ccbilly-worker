import { listByType } from "@/lib/index/queries";

/**
 * Roadmap timeline (blueprint B3.3). Collects collections that have a cycle and
 * lays them out on a shared date axis. The client renders bars positioned by
 * start/end fraction across the overall [min,max] window, with a today marker.
 */

export interface RoadmapBar {
  slug: string;
  title: string;
  start: string;
  end: string;
}

export interface RoadmapData {
  bars: RoadmapBar[];
  min: string;
  max: string;
}

export function roadmapData(): RoadmapData {
  const bars: RoadmapBar[] = listByType("collection")
    .filter((c) => c.data.cycle && typeof c.data.cycle === "object")
    .map((c) => {
      const cycle = c.data.cycle as { start: string; end: string };
      return {
        slug: c.slug,
        title: String(c.data.title),
        start: cycle.start,
        end: cycle.end,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  if (bars.length === 0) return { bars, min: "", max: "" };
  const min = bars.reduce((m, b) => (b.start < m ? b.start : m), bars[0].start);
  const max = bars.reduce((m, b) => (b.end > m ? b.end : m), bars[0].end);
  return { bars, min, max };
}
