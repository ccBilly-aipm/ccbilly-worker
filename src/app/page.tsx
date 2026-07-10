import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listByType } from "@/lib/index/queries";
import { dashboardStats } from "@/lib/dashboard/stats";
import { readSettings } from "@/lib/admin/settings";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/components/ui/count-up";
import { TodayOrbit } from "@/features/dashboard/today-orbit";
import {
  LazyTrendArea,
  LazyDistributionPie,
} from "@/features/dashboard/lazy-charts";
import { ActivityHeatmap } from "@/features/dashboard/activity-heatmap";
import { localDateKey } from "@/lib/utils/date";
import Link from "next/link";
import { ListTodo, FileText, Sparkles, AppWindow } from "lucide-react";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function greeting(h: number): string {
  if (h < 5) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export default async function DashboardPage() {
  await ensureIndexReady();
  const stats = dashboardStats();
  const settings = readSettings();
  const tasks = listByType("task");
  const counts = {
    task: tasks.length,
    daily: listByType("daily").length,
    skill: listByType("skill").length,
    app: listByType("app").length,
  };
  const today = new Date();
  const dateLabel = `${localDateKey(today)} 星期${WEEKDAYS[today.getDay()]}`;
  const hello = greeting(today.getHours());

  const active = tasks.filter(
    (t) => t.data.status !== "done" && t.data.status !== "archived",
  );

  const statCards = [
    { label: "任务", value: counts.task, href: "/tasks", icon: ListTodo },
    { label: "日报", value: counts.daily, href: "/reports/daily", icon: FileText },
    { label: "技能", value: counts.skill, href: "/skills", icon: Sparkles },
    { label: "应用", value: counts.app, href: "/apps", icon: AppWindow },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg md:text-3xl">
          {hello}，<span className="text-brand-gradient">{settings.displayName}</span>
        </h1>
        <p className="text-sm text-muted tabular">{dateLabel}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <GlassCard hover className="flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-semibold text-fg">
                    <CountUp value={s.value} />
                  </div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
                <Icon size={24} className="text-brand-cyan opacity-70" />
              </GlassCard>
            </Link>
          );
        })}
      </section>

      {/* Signature: 今日轨道 + today's active list */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassCard className="flex items-center justify-center py-6">
          <TodayOrbit
            points={stats.orbit}
            completionRate={stats.completionRate}
            counts={stats.counts}
          />
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 font-display text-lg font-medium text-fg">
            今日待办 · {active.length}
          </h2>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              没有待办任务。用右上角「新建」创建第一个吧。
            </p>
          ) : (
            <ul className="space-y-2">
              {active.slice(0, 7).map((t) => (
                <Link
                  key={t.filePath}
                  href={`/tasks?open=${encodeURIComponent(t.slug)}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
                >
                  <span className="truncate text-fg">{String(t.data.title)}</span>
                  <span className="rounded bg-[rgb(var(--glass-bg)/0.1)] px-1.5 py-0.5 text-xs text-muted">
                    {String(t.data.priority ?? "P2")}
                  </span>
                </Link>
              ))}
            </ul>
          )}
        </GlassCard>
      </section>

      {/* Trend + distribution */}
      <section className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <h3 className="mb-2 text-sm text-muted">近 14 天完成趋势</h3>
          <LazyTrendArea data={stats.trend14} />
        </GlassCard>
        <GlassCard>
          <h3 className="mb-2 text-sm text-muted">按合集的任务分布</h3>
          <LazyDistributionPie data={stats.distribution} />
        </GlassCard>
      </section>

      {/* Activity heatmap */}
      <section>
        <GlassCard>
          <h3 className="mb-3 text-sm text-muted">年度活动热力图</h3>
          <ActivityHeatmap data={stats.heatmap} />
        </GlassCard>
      </section>
    </div>
  );
}
