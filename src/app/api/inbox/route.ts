import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addCapture, listCaptures } from "@/lib/inbox/inbox-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function GET() {
  return NextResponse.json({ items: listCaptures() });
}

const Schema = z.object({ text: z.string().min(1).max(2000) });

/** Capture a one-line note into vault/inbox (mutation → auth-guarded). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "捕捉内容不能为空" }, { status: 400 });
  }
  const item = await addCapture(parsed.data.text, stamp());
  return NextResponse.json({ item });
}
