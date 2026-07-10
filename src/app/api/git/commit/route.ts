import { NextRequest, NextResponse } from "next/server";
import { quickCommit } from "@/lib/git/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message : undefined;
  const result = await quickCommit(message);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
