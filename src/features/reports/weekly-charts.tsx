"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const BRAND = ["#22D3EE", "#818CF8", "#C084FC", "#34D399", "#FBBF24", "#60A5FA"];

/** Weekly charts (spec §6.4): per-day completed bar + collection distribution donut. */
export function WeeklyBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const rows = data.map((d) => ({ day: d.date.slice(5), count: d.count }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={rows}>
        <defs>
          <linearGradient id="wbar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={20}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          contentStyle={{
            background: "rgba(11,18,38,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#EAF0FA",
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="url(#wbar)" radius={[6, 6, 0, 0]} name="完成" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CollectionDonut({
  data,
}: {
  data: { collection: string; count: number; pct: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="collection"
          innerRadius={44}
          outerRadius={68}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={BRAND[i % BRAND.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "rgba(11,18,38,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#EAF0FA",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
