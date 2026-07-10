"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const BRAND = ["#22D3EE", "#818CF8", "#C084FC", "#34D399", "#FBBF24", "#60A5FA"];

const TOOLTIP_STYLE = {
  background: "rgba(11,18,38,0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#EAF0FA",
  fontSize: 12,
};

/** 14-day completion trend (spec §6.1). */
export function TrendArea({
  data,
}: {
  data: { date: string; completed: number }[];
}) {
  const rows = data.map((d) => ({ day: d.date.slice(5), completed: d.completed }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={rows}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "rgb(var(--fg-muted))", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={18}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#22D3EE"
          strokeWidth={2}
          fill="url(#trend-fill)"
          name="完成"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Task distribution by collection (spec §6.1). */
export function DistributionPie({
  data,
}: {
  data: { collection: string; count: number }[];
}) {
  if (data.length === 0)
    return <p className="py-12 text-center text-sm text-muted">暂无数据</p>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="collection"
          innerRadius={40}
          outerRadius={62}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={BRAND[i % BRAND.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
