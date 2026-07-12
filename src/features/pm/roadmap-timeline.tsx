"use client";

import Link from "next/link";
import type { RoadmapData } from "@/lib/pm/roadmap";

/** Horizontal roadmap timeline with a today marker (blueprint B3.3). */
export function RoadmapTimeline({ data, today }: { data: RoadmapData; today: string }) {
  const { bars, min, max } = data;
  if (bars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        还没有带周期的合集。到「周期」页给合集设定起止日期。
      </p>
    );
  }

  const minMs = new Date(min + "T00:00:00").getTime();
  const maxMs = new Date(max + "T00:00:00").getTime();
  const span = Math.max(1, maxMs - minMs);
  const frac = (d: string) =>
    ((new Date(d + "T00:00:00").getTime() - minMs) / span) * 100;

  const todayInRange = today >= min && today <= max;
  const todayLeft = todayInRange ? frac(today) : null;

  return (
    <div className="relative space-y-2">
      {/* axis labels */}
      <div className="flex justify-between text-[11px] text-muted tabular">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <div className="relative space-y-2 rounded-xl bg-[rgb(var(--glass-bg)/0.04)] p-3">
        {todayLeft !== null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[rgb(var(--aurora-cyan)/0.7)]"
            style={{ left: `calc(${todayLeft}% + 12px)` }}
            aria-hidden
          >
            <span className="absolute -top-1 left-1 text-[10px] text-brand-cyan">
              今日
            </span>
          </div>
        )}
        {bars.map((b) => {
          const left = frac(b.start);
          const width = Math.max(4, frac(b.end) - left);
          return (
            <div key={b.slug} className="relative h-8">
              <Link
                href="/cycles"
                title={`${b.title} · ${b.start} → ${b.end}`}
                className="absolute top-0 flex h-8 items-center overflow-hidden rounded-lg bg-[rgb(var(--aurora-indigo)/0.25)] px-2 ring-1 ring-[rgb(var(--aurora-indigo)/0.4)] hover:bg-[rgb(var(--aurora-indigo)/0.35)]"
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <span className="truncate text-xs text-fg">{b.title}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
