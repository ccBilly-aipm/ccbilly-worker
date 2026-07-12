import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTask } from "@/lib/vault/task-service";
import { listRequirements } from "@/lib/index/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ requirements: listRequirements() });
}

const Schema = z.object({
  title: z.string().min(1).max(200),
  rice: z
    .object({
      reach: z.number().min(0).default(0),
      impact: z.number().min(0).default(0),
      confidence: z.number().min(0).max(1).default(1),
      effort: z.number().min(0.1).default(1),
    })
    .optional(),
});

/** Create a requirement (kind=requirement, stage=inbox). Auth-guarded mutation. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const entry = await createTask({
    title: parsed.data.title,
    kind: "requirement",
    stage: "inbox",
    rice: parsed.data.rice ?? { reach: 0, impact: 0, confidence: 1, effort: 1 },
  });
  return NextResponse.json({ slug: entry.slug });
}
