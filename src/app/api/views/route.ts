import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addView, listViews, removeView } from "@/lib/views/saved-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page") ?? undefined;
  return NextResponse.json({ views: listViews(page) });
}

const AddSchema = z.object({
  page: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  query: z.string().max(500),
});

/** Save a named view (auth-guarded mutation). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const suffix = Date.now().toString(36);
  const view = await addView(parsed.data.page, parsed.data.name, parsed.data.query, suffix);
  return NextResponse.json({ view });
}

const DelSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = DelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  await removeView(parsed.data.id);
  return NextResponse.json({ ok: true });
}
