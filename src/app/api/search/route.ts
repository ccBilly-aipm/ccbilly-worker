import { NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getDb } from "@/lib/index/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  type: string;
  title: string;
  slug: string;
}

const HREF_BY_TYPE: Record<string, (r: Row) => string> = {
  task: (r) => `/tasks?open=${encodeURIComponent(r.slug)}`,
  daily: (r) => `/reports/daily/${r.slug}`,
  weekly: (r) => `/reports/weekly/${r.slug}`,
  skill: (r) => `/skills?open=${encodeURIComponent(r.slug)}`,
  knowledge: (r) => `/knowledge/${r.slug}`,
  app: () => `/apps`,
  collection: (r) => `/collections/${r.slug}`,
};

export async function GET() {
  await ensureIndexReady();
  const rows = getDb()
    .prepare(
      `SELECT id, type, COALESCE(title, slug) as title, slug
       FROM entries
       WHERE type IN ('task','daily','weekly','skill','knowledge','app','collection')
       ORDER BY updated DESC LIMIT 200`,
    )
    .all() as Row[];

  const items = rows.map((r) => ({
    id: r.id || `${r.type}-${r.slug}`,
    type: r.type,
    title: r.title,
    href: (HREF_BY_TYPE[r.type] ?? (() => "/"))(r),
  }));

  return NextResponse.json({ items });
}
