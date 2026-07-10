import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getAppById } from "@/lib/vault/app-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reverse-proxy skeleton (spec §6.7): forwards to a proxy-mode app's configured
 * baseUrl with optional injected headers. This is a FRAMEWORK for future
 * self-hosted API integrations; the demo target is example.com.
 *
 * A "*" catch-all path segment can be appended in future (proxy/[appId]/[...path]);
 * for now this proxies the base path only.
 */
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  await ensureIndexReady();
  const { appId } = await params;
  const app = getAppById(appId);
  if (!app || app.data.mode !== "proxy") {
    return NextResponse.json(
      { error: "未找到 proxy 模式应用" },
      { status: 404 },
    );
  }

  const baseUrl = String(app.data.proxyBaseUrl ?? app.data.url ?? "");
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return NextResponse.json(
      { error: "该应用未配置合法的 proxyBaseUrl" },
      { status: 400 },
    );
  }

  const injectedHeaders =
    (app.data.proxyHeaders as Record<string, string> | undefined) ?? {};

  try {
    const target = new URL(baseUrl);
    // forward query string
    target.search = req.nextUrl.search;

    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: {
        // pass through a minimal safe set + injected headers
        accept: req.headers.get("accept") ?? "*/*",
        ...injectedHeaders,
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await req.text(),
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") ?? "text/plain";
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "代理请求失败", detail: (e as Error).message },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
