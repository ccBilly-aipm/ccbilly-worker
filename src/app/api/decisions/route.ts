import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDecision, listDecisions } from "@/lib/pm/decision-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function GET() {
  return NextResponse.json({ decisions: listDecisions() });
}

const Schema = z.object({
  title: z.string().min(1).max(200),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Create an ADR-style decision (auth-guarded mutation). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const decision = await createDecision(
    parsed.data.title,
    stamp(),
    parsed.data.reviewDate ?? null,
  );
  return NextResponse.json({ slug: decision.slug });
}
