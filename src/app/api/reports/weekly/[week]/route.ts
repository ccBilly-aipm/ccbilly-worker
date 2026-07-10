import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  getWeekly,
  saveWeeklyBody,
  finalizeWeekly,
  weeklyStatsForKey,
} from "@/lib/reports/report-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ week: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { week } = await params;
  const report = getWeekly(week);
  const stats = weeklyStatsForKey(week);
  if (!report) return NextResponse.json({ report: null, stats });
  return NextResponse.json({ report, stats });
}

const PatchSchema = z.object({
  action: z.enum(["save", "finalize"]),
  content: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { week } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  try {
    let report;
    if (parsed.data.action === "save") {
      report = await saveWeeklyBody(week, parsed.data.content ?? "");
    } else {
      report = await finalizeWeekly(week);
    }
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
