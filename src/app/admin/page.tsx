import { ensureIndexReady } from "@/lib/index/bootstrap";
import { countsByType, listBroken } from "@/lib/index/queries";
import { getMeta } from "@/lib/index/db";
import { GlassCard } from "@/components/ui/glass-card";
import { ReindexButton } from "@/features/admin/reindex-button";

export const dynamic = "force-dynamic";

/**
 * Admin data overview (spec §6.8 ①). Full admin panels (git / apps CRUD / skill
 * dirs / personalization / export) arrive in M5; M1 ships the data overview +
 * rebuild-index + repair list so the foundation is observable.
 */
export default async function AdminPage() {
  await ensureIndexReady();
  const counts = countsByType();
  const broken = listBroken();
  const lastReindex = getMeta("last_reindex");

  const rows: [string, number][] = [
    ["任务 task", counts.task ?? 0],
    ["合集 collection", counts.collection ?? 0],
    ["日报 daily", counts.daily ?? 0],
    ["周报 weekly", counts.weekly ?? 0],
    ["技能 skill", counts.skill ?? 0],
    ["知识 knowledge", counts.knowledge ?? 0],
    ["应用 app", counts.app ?? 0],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-fg">后台管理</h1>

      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-fg">数据概览</h2>
          <ReindexButton />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map(([label, n]) => (
            <div
              key={label}
              className="rounded-xl bg-[rgb(var(--glass-bg)/0.06)] p-3"
            >
              <div className="font-display text-2xl font-semibold text-fg tabular">
                {n}
              </div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          索引最近重建：{lastReindex ?? "未记录"} · 索引缓存位于{" "}
          <code className="font-mono">cache/index.db</code>（可随时删除重建，不丢数据）
        </p>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 font-display text-lg font-medium text-fg">
          待修复文件 · {broken.length}
        </h2>
        {broken.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            没有解析失败的文件，全部 frontmatter 校验通过。
          </p>
        ) : (
          <ul className="space-y-2">
            {broken.map((b) => (
              <li
                key={b.file_path}
                className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm"
              >
                <div className="font-mono text-xs text-danger">{b.slug}.md</div>
                <div className="text-muted">{b.error}</div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <p className="text-center text-xs text-muted">
        Git 同步 / 应用管理 / Skill 目录 / 个性化 / 数据导出 面板将在 M5 上线。
      </p>
    </div>
  );
}
