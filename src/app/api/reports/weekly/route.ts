import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  listWeeklies,
  generateWeekly,
  currentWeekKey,
} from "@/lib/reports/report-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json({ weeklies: listWeeklies() });
}

const PostSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  await ensureIndexReady();
  const body = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const week = parsed.data.week ?? currentWeekKey();
  try {
    const report = await generateWeekly(week);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
