import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listContent } from "@/lib/index/queries";
import { IdeasClient, type IdeaView } from "@/features/creator/ideas-client";

export const dynamic = "force-dynamic";

/** Parse the heat level (1-5) from a `热度N` tag. */
function heatFromTags(tags: unknown): number {
  if (!Array.isArray(tags)) return 0;
  for (const t of tags) {
    const m = String(t).match(/^热度(\d)$/);
    if (m) return Number(m[1]);
  }
  return 0;
}

/** Pull the source URL and angle out of the content body if present. */
function parseBody(content: string): { angle: string; sourceUrl: string | null } {
  const angleM = content.match(/\*\*切入角度\*\*：(.+)/);
  const urlM = content.match(/来源：(\S+)/);
  return {
    angle: angleM ? angleM[1].trim() : "",
    sourceUrl: urlM ? urlM[1].trim() : null,
  };
}

/** 选题库 (blueprint B4.1). */
export default async function IdeasPage() {
  await ensureIndexReady();
  const ideas: IdeaView[] = listContent("idea").map((c) => {
    const { angle, sourceUrl } = parseBody(c.content);
    return {
      slug: c.slug,
      title: String(c.data.title),
      angle,
      sourceUrl,
      heat: heatFromTags(c.data.tags),
      tags: Array.isArray(c.data.tags)
        ? (c.data.tags as string[]).filter((t) => !/^热度\d$/.test(t))
        : [],
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <IdeasClient ideas={ideas} />
    </div>
  );
}
