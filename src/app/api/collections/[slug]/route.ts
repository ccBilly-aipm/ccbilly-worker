import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { setCollectionStatus } from "@/lib/vault/collection-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const PatchSchema = z.object({
  status: z.enum(["active", "archived"]),
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
    const collection = await setCollectionStatus(slug, parsed.data.status);
    return NextResponse.json({ collection });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
