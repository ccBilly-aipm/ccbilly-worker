import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { vaultTypeDir } from "@/lib/config";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { indexFile } from "@/lib/index/indexer";
import { ContentStage } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  stage: z.enum(ContentStage.options).optional(),
  platforms: z.array(z.string()).optional(),
  publish_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

/** Update a content item's stage / platforms / publish date. Auth-guarded. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  // slug basename guard against traversal
  const safe = path.basename(slug);
  const filePath = path.join(vaultTypeDir("task"), `${safe}.md`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "未找到该内容" }, { status: 404 });
  }
  const { data, content } = parseDoc(fs.readFileSync(filePath, "utf8"));
  const d = data as Record<string, unknown>;
  d.kind = "content";
  if (parsed.data.stage) d.stage = parsed.data.stage;
  if (parsed.data.platforms) d.platforms = parsed.data.platforms;
  if (parsed.data.publish_date !== undefined) d.publish_date = parsed.data.publish_date;
  await atomicWriteFile(filePath, stringifyDoc(d, content));
  await indexFile(filePath, "task");
  return NextResponse.json({ ok: true });
}
