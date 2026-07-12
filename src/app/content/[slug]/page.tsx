import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getBySlug } from "@/lib/index/queries";
import { ContentDetail, type ContentDetailData } from "@/features/creator/content-detail";
import type { MetricRow } from "@/lib/creator/platforms";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

/** Content detail: platform checklist + metrics (blueprint B4.4/B4.5). */
export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureIndexReady();
  const { slug } = await params;
  const entry = getBySlug("task", decodeURIComponent(slug));
  if (!entry || entry.data.kind !== "content") notFound();

  const data: ContentDetailData = {
    slug: entry.slug,
    title: String(entry.data.title),
    stage: String(entry.data.stage ?? "idea"),
    platforms: Array.isArray(entry.data.platforms)
      ? (entry.data.platforms as string[])
      : [],
    publishDate: (entry.data.publish_date as string) ?? null,
    metrics: Array.isArray(entry.data.metrics)
      ? (entry.data.metrics as MetricRow[])
      : [],
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/content"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> 返回内容管道
      </Link>
      <h1 className="font-display text-2xl font-semibold text-fg">{data.title}</h1>
      <ContentDetail data={data} />
    </div>
  );
}
