import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFeed, SsrfError } from "@/lib/creator/feed-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ url: z.string().url() });

/**
 * Fetch + parse a feed (blueprint B4.6). The URL passes the SSRF guard first
 * (red line: only allowlist-safe targets may go out). GET is read-only but this
 * is POST so it's auth-guarded (fetching is an outbound action).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效的地址" }, { status: 400 });
  }
  try {
    const articles = await fetchFeed(parsed.data.url);
    return NextResponse.json({ articles });
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json(
        { error: "订阅源被安全策略拒绝", detail: e.message },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "抓取失败", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
