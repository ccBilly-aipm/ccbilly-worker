import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractActionItems } from "@/lib/pm/templates";
import { createTask } from "@/lib/vault/task-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  markdown: z.string().min(1),
  collection: z.string().optional().nullable(),
});

/**
 * Batch-convert meeting-notes action items into tasks (blueprint B3.5). Extracts
 * unchecked `- [ ] @行动项` lines and creates one task each. Auth-guarded mutation.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const items = extractActionItems(parsed.data.markdown);
  if (items.length === 0) {
    return NextResponse.json({ created: 0, slugs: [] });
  }
  const slugs: string[] = [];
  for (const title of items.slice(0, 100)) {
    const entry = await createTask({
      title: title.slice(0, 120),
      collection: parsed.data.collection ?? null,
      tags: ["会议行动项"],
    });
    slugs.push(entry.slug);
  }
  return NextResponse.json({ created: slugs.length, slugs });
}
