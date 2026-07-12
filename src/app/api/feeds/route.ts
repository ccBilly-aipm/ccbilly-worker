import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addFeedSource,
  listFeedSources,
  removeFeedSource,
  SsrfError,
} from "@/lib/creator/feed-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sources: listFeedSources() });
}

const AddSchema = z.object({
  title: z.string().max(120).optional(),
  url: z.string().url(),
});

/**
 * Add a feed source (blueprint B4.6). The URL is validated through the SSRF guard
 * BEFORE storing (red line): an internal/private/metadata target is rejected 403.
 * Auth-guarded mutation.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效的订阅地址" }, { status: 400 });
  }
  try {
    const source = await addFeedSource(parsed.data.title ?? "", parsed.data.url);
    return NextResponse.json({ source });
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json(
        { error: "该订阅地址被安全策略拒绝", detail: e.message },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const DelSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = DelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  await removeFeedSource(parsed.data.id);
  return NextResponse.json({ ok: true });
}
