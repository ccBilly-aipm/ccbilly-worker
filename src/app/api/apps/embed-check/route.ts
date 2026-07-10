import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checks whether a URL can be embedded in an iframe (spec §6.7). Inspects
 * X-Frame-Options and CSP frame-ancestors. Best-effort: some sites block HEAD or
 * vary headers, so the client also has a load-timeout fallback.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ embeddable: false, reason: "缺少 url" });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "ccBilly-embed-check" },
    });
    clearTimeout(timer);

    const xfo = res.headers.get("x-frame-options")?.toLowerCase() ?? "";
    const csp = res.headers.get("content-security-policy") ?? "";
    const frameAncestors = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1] ?? "";

    let embeddable = true;
    let reason = "";
    if (xfo.includes("deny") || xfo.includes("sameorigin")) {
      embeddable = false;
      reason = `对方设置了 X-Frame-Options: ${xfo}`;
    } else if (frameAncestors && !/(\*|'self')/.test(frameAncestors)) {
      // frame-ancestors restricts to specific origins that likely aren't us
      if (!frameAncestors.includes("localhost")) {
        embeddable = false;
        reason = `对方 CSP 限制了 frame-ancestors: ${frameAncestors.trim()}`;
      }
    }

    return NextResponse.json({ embeddable, reason });
  } catch (e) {
    // network error / abort — let the client's load-timeout decide
    return NextResponse.json({
      embeddable: true,
      reason: "",
      note: `预检失败（${(e as Error).name}），以实际加载为准`,
    });
  }
}
