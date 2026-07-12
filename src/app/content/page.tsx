import Link from "next/link";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listContent } from "@/lib/index/queries";
import { ContentBoard, type ContentCard } from "@/features/creator/content-board";

export const dynamic = "force-dynamic";

/** Content pipeline board (blueprint B4.2). */
export default async function ContentPage() {
  await ensureIndexReady();
  const cards: ContentCard[] = listContent().map((c) => ({
    slug: c.slug,
    title: String(c.data.title),
    stage: String(c.data.stage ?? "idea"),
    platforms: Array.isArray(c.data.platforms) ? (c.data.platforms as string[]) : [],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-fg">内容管道</h1>
          <p className="text-sm text-muted">
            拖动卡片在选题 → 草稿 → 待发 → 已发 → 复盘之间流转。
          </p>
        </div>
        <Link
          href="/ideas"
          className="glass glass-hover rounded-full px-3 py-2 text-sm text-fg"
        >
          去选题库
        </Link>
      </header>

      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          还没有内容。到「选题库」记一个选题，它就会出现在这里的「选题」列。
        </p>
      ) : (
        <ContentBoard cards={cards} />
      )}
    </div>
  );
}
