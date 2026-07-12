import { NextRequest, NextResponse } from "next/server";
import { verifyPasscode, setAdminCookie, clearAdminCookie } from "@/lib/admin/auth";
import { RateLimiter } from "@/lib/admin/exposure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 attempts / minute / client (S1-4). Module-scoped so it persists across
// requests within a running server process.
const loginLimiter = new RateLimiter(5, 60_000);

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(req: NextRequest) {
  if (!loginLimiter.check(clientKey(req), Date.now())) {
    return NextResponse.json(
      { error: "尝试过于频繁，请稍后再试" },
      { status: 429 },
    );
  }
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
