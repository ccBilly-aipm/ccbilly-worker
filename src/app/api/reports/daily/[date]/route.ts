import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  getDaily,
  saveDailyBody,
  finalizeDaily,
} from "@/lib/reports/report-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ date: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { date } = await params;
  const report = getDaily(date);
  if (!report) return NextResponse.json({ error: "日报不存在" }, { status: 404 });
  return NextResponse.json({ report });
}

const PatchSchema = z.object({
  action: z.enum(["save", "finalize"]),
  content: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { date } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  try {
    let report;
    if (parsed.data.action === "save") {
      report = await saveDailyBody(date, parsed.data.content ?? "");
    } else {
      report = await finalizeDaily(date);
    }
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
