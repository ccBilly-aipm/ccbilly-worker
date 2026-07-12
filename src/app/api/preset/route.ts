import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readPreset, writePreset } from "@/lib/preset/preset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ preset: readPreset() });
}

const Schema = z.object({
  active: z.enum(["pm", "creator", "both"]).optional(),
  onboarded: z.boolean().optional(),
});

/**
 * Switch the active preset / mark onboarding done. This is a mutation, so it
 * passes through the V1.1 auth middleware (fail-closed when exposed). Switching
 * only changes presentation state — it never touches business data (ADR-020).
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const preset = await writePreset(parsed.data);
  return NextResponse.json({ preset });
}
