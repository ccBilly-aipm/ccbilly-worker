import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listApps, createApp } from "@/lib/vault/app-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json({ apps: listApps() });
}

const CreateSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  mode: z.enum(["link", "iframe", "proxy"]),
  url: z.string().min(1, "URL 不能为空"),
  icon: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
  order: z.number().optional(),
  notes: z.string().optional(),
  proxyBaseUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await ensureIndexReady();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  try {
    const app = await createApp(parsed.data);
    return NextResponse.json({ app }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
