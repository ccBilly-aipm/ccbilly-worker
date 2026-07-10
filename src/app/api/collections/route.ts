import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  listCollectionsWithStats,
  createCollection,
} from "@/lib/vault/collection-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json({ collections: listCollectionsWithStats() });
}

const CreateSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
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
    const collection = await createCollection(parsed.data);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
