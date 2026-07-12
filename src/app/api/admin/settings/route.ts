import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/admin/settings";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: readSettings() });
}

const Schema = z.object({
  displayName: z.string().optional(),
  weekStartsMonday: z.boolean().optional(),
  defaultTheme: z.enum(["dark", "light", "system"]).optional(),
  skillProjectRoots: z.array(z.string()).optional(),
  allowInternalProxyTargets: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const settings = await writeSettings(parsed.data);
  return NextResponse.json({ settings });
}
