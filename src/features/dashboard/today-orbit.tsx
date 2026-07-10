"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface OrbitPoint {
  slug: string;
  title: string;
  status: string;
  progress: number;
  priority: string;
}

const STATUS_COLOR: Record<string, string> = {
  todo: "#60A5FA",
  doing: "#22D3EE",
  blocked: "#FB7185",
  done: "#34D399",
  archived: "#94A3B8",
};

/**
 * 今日轨道 — the dashboard signature element (spec §6.1). A ring whose arc shows
 * today's completion rate; tasks are light points on the orbit colored by
 * status. The whole orbit rotates slowly (paused under prefers-reduced-motion via
 * the .animate-orbit-spin class the global media query disables). Click a point
 * to open the task.
 */
export function TodayOrbit({
  points,
  completionRate,
  counts,
}: {
  points: OrbitPoint[];
  completionRate: number;
  counts: { active: number; doing: number; done: number; blocked: number };
}) {
  const router = useRouter();
  const [hover, setHover] = useState<OrbitPoint | null>(null);

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const rInner = 96;
  const rOrbit = 128;
  const stroke = 10;
  const circ = 2 * Math.PI * rInner;
  const offset = circ * (1 - completionRate / 100);

  // distribute points evenly on the orbit; multiple radii for density.
  // Round to 2 decimals so server (Node) and client (browser) trig produce the
  // exact same string — otherwise last-digit float drift causes a hydration
  // mismatch on the <circle> cx/cy attributes.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const placed = points.map((p, i) => {
    const angle = (i / Math.max(points.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const ringR = rOrbit + (i % 3) * 12 - 12;
    return {
      ...p,
      x: round2(cx + Math.cos(angle) * ringR),
      y: round2(cy + Math.sin(angle) * ringR),
    };
  });

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full"
        role="img"
        aria-label={`今日轨道，完成率 ${completionRate}%`}
      >
        <defs>
          <linearGradient id="orbit-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          <filter id="orbit-glow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint orbit guide rings */}
        {[rOrbit - 12, rOrbit, rOrbit + 12].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgb(var(--fg) / 0.06)"
            strokeWidth={1}
          />
        ))}

        {/* completion arc */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill="none"
          stroke="rgb(var(--fg) / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill="none"
          stroke="url(#orbit-arc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-[stroke-dashoffset] duration-1000 ease-space"
        />

        {/* rotating layer of task points */}
        <g
          className="animate-orbit-spin"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          {placed.map((p) => (
            <circle
              key={p.slug}
              cx={p.x}
              cy={p.y}
              r={p.status === "doing" ? 5 : 4}
              fill={STATUS_COLOR[p.status] ?? "#94A3B8"}
              filter="url(#orbit-glow)"
              className="cursor-pointer"
              style={{ opacity: p.status === "done" ? 0.85 : 1 }}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() =>
                router.push(`/tasks?open=${encodeURIComponent(p.slug)}`)
              }
            >
              <title>{`${p.title} · ${p.progress}%`}</title>
            </circle>
          ))}
        </g>

        {/* center readout */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-fg font-display"
          style={{ fontSize: 40, fontWeight: 600 }}
        >
          {completionRate}%
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 12 }}
        >
          今日完成率
        </text>
      </svg>

      {/* legend + hover title */}
      <div className="mt-1 h-5 text-center text-xs text-muted">
        {hover ? (
          <span className="text-fg">{hover.title}</span>
        ) : (
          <span>
            进行中 {counts.doing} · 完成 {counts.done} · 受阻 {counts.blocked} · 待办{" "}
            {counts.active - counts.doing - counts.blocked}
          </span>
        )}
      </div>
    </div>
  );
}
