import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getCollectionWithTasks } from "@/lib/vault/collection-service";
import { ProgressRing } from "@/components/ui/progress-ring";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge, PriorityBadge } from "@/features/tasks/task-badges";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureIndexReady();
  const { slug } = await params;
  const data = getCollectionWithTasks(decodeURIComponent(slug));
  if (!data) notFound();
  const { collection, stats, tasks } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> 返回合集
      </Link>

      <GlassCard className="flex items-center gap-5">
        <ProgressRing value={stats.progress} size={80} stroke={6} />
        <div>
          <h1 className="font-display text-2xl font-semibold text-fg">
            {String(collection.data.title)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {String(collection.data.description || "（无描述）")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {stats.doneCount}/{stats.taskCount} 任务完成 ·{" "}
            {collection.data.status === "archived" ? "已归档" : "活跃"}
          </p>
        </div>
      </GlassCard>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-medium text-fg">下属任务</h2>
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">该合集下暂无任务</p>
        ) : (
          <div className="glass divide-y divide-[rgb(var(--border)/0.08)]">
            {tasks.map((t) => (
              <Link
                key={t.slug}
                href={`/tasks?open=${encodeURIComponent(t.slug)}`}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
              >
                <StatusBadge status={String(t.data.status)} />
                <span className="flex-1 truncate text-fg">
                  {String(t.data.title)}
                </span>
                <PriorityBadge priority={String(t.data.priority)} />
                <span className="text-xs text-muted tabular">
                  {Number(t.data.progress ?? 0)}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
