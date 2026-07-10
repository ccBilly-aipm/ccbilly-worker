import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getNote } from "@/lib/vault/knowledge-service";
import { renderMarkdown } from "@/lib/markdown/render";
import { GlassCard } from "@/components/ui/glass-card";
import { ArrowLeft, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KnowledgeNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureIndexReady();
  const { slug } = await params;
  const data = getNote(decodeURIComponent(slug));
  if (!data) notFound();
  const { note, backlinks } = data;
  const html = renderMarkdown(note.content);
  const title = String(note.data.title ?? note.slug);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> 返回知识库
      </Link>

      <GlassCard className="space-y-3">
        <h1 className="font-display text-2xl font-semibold text-fg">{title}</h1>
        <article
          className="prose-invert max-w-none text-sm leading-relaxed text-fg [&_a]:text-brand-cyan [&_a]:underline [&_code]:font-mono [&_code]:text-brand-indigo [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-medium [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </GlassCard>

      <GlassCard>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm text-muted">
          <Link2 size={14} /> 反链 · {backlinks.length}
        </h2>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">暂无其它条目链接到此笔记</p>
        ) : (
          <ul className="space-y-1">
            {backlinks.map((b) => (
              <li key={b.filePath} className="text-sm">
                <span className="text-fg">
                  {String(b.data.title ?? b.data.name ?? b.slug)}
                </span>
                <span className="ml-2 text-xs text-muted">{b.type}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
