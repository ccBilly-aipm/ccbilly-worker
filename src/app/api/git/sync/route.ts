import { NextResponse } from "next/server";
import { sync } from "@/lib/git/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await sync();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
