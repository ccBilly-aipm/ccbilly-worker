"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

/** Category-average radar (spec §6.5 Tab B). */
export function SkillRadar({
  data,
}: {
  data: { category: string; avgLevel: number }[];
}) {
  if (data.length < 3) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        至少 3 个分类才能绘制雷达图
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#C084FC" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="rgba(255,255,255,0.12)" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 11 }}
        />
        <PolarRadiusAxis
          domain={[0, 5]}
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 9 }}
          axisLine={false}
        />
        <Radar
          dataKey="avgLevel"
          stroke="#818CF8"
          fill="url(#radar-fill)"
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
