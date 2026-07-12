import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { vaultTypeDir } from "@/lib/config";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { indexFile } from "@/lib/index/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().min(1),
  views: z.number().int().min(0).default(0),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  followers_gained: z.number().int().default(0),
});

/**
 * Append a manual metric snapshot to a content item (blueprint B4.5). Snapshots
 * accumulate in the `metrics` frontmatter array. Auth-guarded mutation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const safe = path.basename(slug);
  const filePath = path.join(vaultTypeDir("task"), `${safe}.md`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "未找到该内容" }, { status: 404 });
  }
  const { data, content } = parseDoc(fs.readFileSync(filePath, "utf8"));
  const d = data as Record<string, unknown>;
  d.kind = "content";
  const metrics = Array.isArray(d.metrics) ? [...(d.metrics as unknown[])] : [];
  metrics.push(parsed.data);
  d.metrics = metrics;
  await atomicWriteFile(filePath, stringifyDoc(d, content));
  await indexFile(filePath, "task");
  return NextResponse.json({ ok: true, count: metrics.length });
}
