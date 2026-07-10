import { NextRequest, NextResponse } from "next/server";
import { verifyPasscode, setAdminCookie, clearAdminCookie } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const passcode = String(body.passcode ?? "");
  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "口令错误" }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
