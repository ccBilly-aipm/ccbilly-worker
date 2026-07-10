import Link from "next/link";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listNotes } from "@/lib/vault/knowledge-service";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  await ensureIndexReady();
  const notes = listNotes();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">知识库</h1>
        <p className="text-sm text-muted">
          浏览 vault/knowledge 的笔记与双链。深度编辑请在 Obsidian 完成。
        </p>
      </header>

      {notes.length === 0 ? (
        <EmptyState
          kind="knowledge"
          title="知识库是空的"
          description="在 vault/knowledge/ 下添加 .md 笔记（支持 [[双链]]），工作台会自动收录。"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <Link key={n.slug} href={`/knowledge/${encodeURIComponent(n.slug)}`}>
              <GlassCard hover className="flex items-center gap-3">
                <BookOpen size={18} className="shrink-0 text-brand-cyan opacity-70" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-fg">{n.title}</div>
                  {n.updated && (
                    <div className="text-xs text-muted tabular">
                      {n.updated.slice(0, 10)}
                    </div>
                  )}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
