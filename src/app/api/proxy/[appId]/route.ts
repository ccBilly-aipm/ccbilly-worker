import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getAppById } from "@/lib/vault/app-service";
import { readSettings } from "@/lib/admin/settings";
import { assertProxyableUrl, SsrfError } from "@/lib/net/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reverse-proxy (spec §6.7) with SSRF defense (S1-3 / ADR-015).
 *
 * Only proxies to a proxy-mode registered app's configured URL. Before every
 * fetch — including each redirect hop — the target is resolved and checked
 * against the internal/reserved IP blocklist (assertProxyableUrl). Internal
 * targets require the explicit `allowInternalProxyTargets` setting; the cloud
 * metadata address is never reachable. Redirects are followed MANUALLY so a
 * 3xx to an internal address can't bypass the check.
 */

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10MB cap
const MAX_REDIRECTS = 3;

/** Request headers we NEVER forward upstream (avoid leaking local creds). */
const STRIP_REQUEST_HEADERS = new Set([
  "cookie",
  "authorization",
  "proxy-authorization",
  "host",
  "x-forwarded-for",
  "x-forwarded-host",
]);

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  await ensureIndexReady();
  const { appId } = await params;
  const app = getAppById(appId);
  if (!app || app.data.mode !== "proxy") {
    return NextResponse.json({ error: "未找到 proxy 模式应用" }, { status: 404 });
  }

  const baseUrl = String(app.data.proxyBaseUrl ?? app.data.url ?? "");
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return NextResponse.json(
      { error: "该应用未配置合法的 proxyBaseUrl" },
      { status: 400 },
    );
  }

  const allowInternal = readSettings().allowInternalProxyTargets;
  const injectedHeaders =
    (app.data.proxyHeaders as Record<string, string> | undefined) ?? {};

  // Build the outgoing header set: a minimal safe passthrough + injected headers,
  // explicitly excluding sensitive request headers.
  const outHeaders: Record<string, string> = {
    accept: req.headers.get("accept") ?? "*/*",
  };
  for (const [k, v] of Object.entries(injectedHeaders)) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) outHeaders[k] = v;
  }

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  try {
    let currentUrl = new URL(baseUrl);
    currentUrl.search = req.nextUrl.search;

    let upstream: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // SSRF check on EVERY hop (initial + each redirect target).
      await assertProxyableUrl(currentUrl.toString(), allowInternal);

      upstream = await fetch(currentUrl.toString(), {
        method: req.method,
        headers: outHeaders,
        body,
        redirect: "manual", // never auto-follow — we re-check each Location
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (!location) break;
        if (hop === MAX_REDIRECTS) {
          return NextResponse.json(
            { error: "代理请求失败：重定向次数过多" },
            { status: 502 },
          );
        }
        currentUrl = new URL(location, currentUrl); // resolve relative redirects
        continue;
      }
      break;
    }

    if (!upstream) {
      return NextResponse.json({ error: "代理请求失败" }, { status: 502 });
    }

    // Enforce a response size cap.
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      return NextResponse.json({ error: "代理响应过大，已拒绝" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "text/plain";
    return new NextResponse(buf, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json(
        { error: "代理目标被安全策略拒绝", detail: e.message },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "代理请求失败", detail: (e as Error).message },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
