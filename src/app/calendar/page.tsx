import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listContent } from "@/lib/index/queries";
import {
  PublishCalendar,
  type ScheduledItem,
} from "@/features/creator/publish-calendar";
import { localDateKey } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/** Publish scheduling calendar (blueprint B4.3). */
export default async function CalendarPage() {
  await ensureIndexReady();
  const items: ScheduledItem[] = listContent()
    .filter((c) => typeof c.data.publish_date === "string" && c.data.publish_date)
    .map((c) => ({
      slug: c.slug,
      title: String(c.data.title),
      publishDate: String(c.data.publish_date),
      platforms: Array.isArray(c.data.platforms) ? (c.data.platforms as string[]) : [],
    }));

  const now = new Date();
  const today = localDateKey(now);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">发布日历</h1>
        <p className="text-sm text-muted">
          按发布日期排布内容；拖动卡片到某一天即可改期。未排期的内容先在「内容管道」设个发布日期。
        </p>
      </header>
      <PublishCalendar
        items={items}
        year={now.getFullYear()}
        month={now.getMonth()}
        today={today}
      />
    </div>
  );
}
