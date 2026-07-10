import { NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { skillMatrix } from "@/lib/vault/skill-tree-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json(skillMatrix());
}
