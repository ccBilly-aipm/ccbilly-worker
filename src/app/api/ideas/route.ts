import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTask } from "@/lib/vault/task-service";
import { listContent } from "@/lib/index/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List content items in the idea stage (选题库). */
export async function GET() {
  return NextResponse.json({ ideas: listContent("idea") });
}

const Schema = z.object({
  title: z.string().min(1).max(200),
  angle: z.string().max(500).optional(),
  sourceUrl: z.string().url().optional(),
  heat: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Create an idea (content, stage=idea) — the 选题库 (blueprint B4.1). Can be
 * seeded from a feed article via sourceUrl. Auth-guarded mutation.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const { title, angle, sourceUrl, heat, tags } = parsed.data;
  const description = [
    title,
    angle ? `\n\n**切入角度**：${angle}` : "",
    sourceUrl ? `\n\n来源：${sourceUrl}` : "",
  ].join("");

  const entry = await createTask({
    title,
    kind: "content",
    stage: "idea",
    tags: [...(tags ?? []), ...(heat ? [`热度${heat}`] : [])],
    description,
  });
  return NextResponse.json({ slug: entry.slug });
}
