import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { updateApp, deleteApp } from "@/lib/vault/app-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const PatchSchema = z.object({
  name: z.string().optional(),
  mode: z.enum(["link", "iframe", "proxy"]).optional(),
  url: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
  order: z.number().optional(),
  notes: z.string().optional(),
  proxyBaseUrl: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  try {
    const app = await updateApp(slug, parsed.data);
    return NextResponse.json({ app });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  try {
    await deleteApp(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
