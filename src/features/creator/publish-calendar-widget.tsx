import Link from "next/link";
import { listContent } from "@/lib/index/queries";
import { localDateKey } from "@/lib/utils/date";

/** Dashboard widget: upcoming scheduled publishes (next few by publish_date). */
export function PublishCalendarWidget() {
  const today = localDateKey(new Date());
  const upcoming = listContent()
    .filter((c) => {
      const d = c.data.publish_date;
      return typeof d === "string" && d >= today;
    })
    .sort((a, b) =>
      String(a.data.publish_date).localeCompare(String(b.data.publish_date)),
    )
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        没有待发布的内容。在「发布日历」为选题排期。
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {upcoming.map((c) => (
        <Link
          key={c.filePath}
          href="/calendar"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
        >
          <span className="truncate text-fg">{String(c.data.title)}</span>
          <span className="ml-2 shrink-0 text-xs text-muted tabular">
            {String(c.data.publish_date)}
          </span>
        </Link>
      ))}
    </ul>
  );
}
