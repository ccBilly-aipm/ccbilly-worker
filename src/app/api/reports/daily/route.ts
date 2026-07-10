import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  listDailies,
  generateDaily,
  reaggregateDaily,
} from "@/lib/reports/report-service";
import { localDateKey } from "@/lib/utils/date";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json({ dailies: listDailies() });
}

const PostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mode: z.enum(["generate", "reaggregate"]).default("generate"),
});

export async function POST(req: NextRequest) {
  await ensureIndexReady();
  const body = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const date = parsed.data.date ?? localDateKey();
  try {
    const report =
      parsed.data.mode === "reaggregate"
        ? await reaggregateDaily(date)
        : await generateDaily(date);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
