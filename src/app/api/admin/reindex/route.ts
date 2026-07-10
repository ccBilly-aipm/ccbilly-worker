import { NextResponse } from "next/server";
import { forceReindex } from "@/lib/index/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await forceReindex();
  return NextResponse.json(result);
}
