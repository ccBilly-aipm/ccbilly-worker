import { ensureIndexReady } from "@/lib/index/bootstrap";
import { countsByType, listByType } from "@/lib/index/queries";
import { GlassCard } from "@/components/ui/glass-card";
import { localDateKey } from "@/lib/utils/date";
import { readSettings } from "@/lib/admin/settings";
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
  const counts = countsByType();
  const tasks = listByType("task");
  const settings = readSettings();
  const today = new Date();
  const dateLabel = `${localDateKey(today)} 星期${WEEKDAYS[today.getDay()]}`;
  const hello = greeting(today.getHours());

  const active = tasks.filter(
    (t) => t.data.status !== "done" && t.data.status !== "archived",
  );
  const doing = tasks.filter((t) => t.data.status === "doing");

  const stats = [
    { label: "任务", value: counts.task ?? 0, href: "/tasks", icon: ListTodo },
    { label: "日报", value: counts.daily ?? 0, href: "/reports/daily", icon: FileText },
    { label: "技能", value: counts.skill ?? 0, href: "/skills", icon: Sparkles },
    { label: "应用", value: counts.app ?? 0, href: "/apps", icon: AppWindow },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg md:text-3xl">
          {hello}，<span className="text-brand-gradient">{settings.displayName}</span>
        </h1>
        <p className="text-sm text-muted tabular">{dateLabel}</p>
      </header>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <GlassCard hover className="flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-semibold text-fg tabular">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
                <Icon size={24} className="text-brand-cyan opacity-70" />
              </GlassCard>
            </Link>
          );
        })}
      </section>

      {/* Today's tasks — the 今日轨道 signature element lands in M6 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-3 font-display text-lg font-medium text-fg">
            进行中 · {doing.length}
          </h2>
          {doing.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">暂无进行中的任务</p>
          ) : (
            <ul className="space-y-2">
              {doing.slice(0, 6).map((t) => (
                <li
                  key={t.filePath}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
                >
                  <span className="truncate text-fg">
                    {String(t.data.title)}
                  </span>
                  <span className="text-xs text-muted tabular">
                    {String(t.data.progress ?? 0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
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
              {active.slice(0, 6).map((t) => (
                <li
                  key={t.filePath}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
                >
                  <span className="truncate text-fg">
                    {String(t.data.title)}
                  </span>
                  <span className="rounded bg-[rgb(var(--glass-bg)/0.1)] px-1.5 py-0.5 text-xs text-muted">
                    {String(t.data.priority ?? "P2")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </section>

      <p className="text-center text-xs text-muted">
        「今日轨道」签名图与趋势图表将在 M6 打磨阶段上线。
      </p>
    </div>
  );
}
