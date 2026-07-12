import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateRice, updateStage } from "@/lib/pm/requirement-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  rice: z
    .object({
      reach: z.number().min(0).optional(),
      impact: z.number().min(0).optional(),
      confidence: z.number().min(0).max(1).optional(),
      effort: z.number().min(0.1).optional(),
    })
    .optional(),
  stage: z.enum(["inbox", "pool", "scheduled", "shipped"]).optional(),
});

/** Update a requirement's RICE and/or pipeline stage. Auth-guarded mutation. */
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
  try {
    let entry;
    if (parsed.data.rice) entry = await updateRice(slug, parsed.data.rice);
    if (parsed.data.stage) entry = await updateStage(slug, parsed.data.stage);
    if (!entry) return NextResponse.json({ error: "无更新字段" }, { status: 400 });
    return NextResponse.json({ slug: entry.slug });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
