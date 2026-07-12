import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLayout, saveLayout } from "@/lib/dashboard/layout-service";
import { readPreset } from "@/lib/preset/preset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const preset = readPreset().active;
  return NextResponse.json({ preset, layout: getLayout(preset) });
}

const Schema = z.object({
  layout: z.array(z.object({ id: z.string(), w: z.number() })),
});

/**
 * Save the dashboard layout for the active preset. Mutation → auth-guarded by
 * the V1.1 middleware. The service sanitizes ids/widths, so a malformed payload
 * can't inject arbitrary widgets or break the grid (ADR-021).
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const preset = readPreset().active;
  const layout = await saveLayout(preset, parsed.data.layout);
  return NextResponse.json({ layout });
}
