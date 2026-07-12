import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setCollectionCycle } from "@/lib/vault/collection-service";
import { cyclesWithBurndown } from "@/lib/pm/burndown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ cycles: cyclesWithBurndown() });
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const Schema = z.object({
  slug: z.string().min(1),
  cycle: z
    .object({
      start: z.string().regex(dateRe),
      end: z.string().regex(dateRe),
    })
    .nullable(),
});

/** Set or clear a collection's cycle window (auth-guarded mutation). */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  if (parsed.data.cycle && parsed.data.cycle.end < parsed.data.cycle.start) {
    return NextResponse.json({ error: "结束日期不能早于开始日期" }, { status: 400 });
  }
  try {
    await setCollectionCycle(parsed.data.slug, parsed.data.cycle);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
