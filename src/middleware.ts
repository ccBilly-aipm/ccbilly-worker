import { NextRequest, NextResponse } from "next/server";
import {
  isProtectedRequest,
  isAuthEndpoint,
  decideProtected,
  type AuthMode,
} from "@/lib/admin/exposure";

/**
 * Layered auth enforcement (S1-4 / ADR-016). Runs on every /api/* and /admin
 * request. Localhost + AUTH_MODE=none stays frictionless; exposed deployments
 * (LAN/public/Docker) without auth are failed closed on protected requests.
 *
 * The session cookie holds HMAC-SHA256(passcode, "ccbilly-admin-v2"). We recompute
 * it here with Web Crypto (Edge-safe) to validate — mirroring lib/admin/auth.ts.
 */

const COOKIE_NAME = "ccbilly_admin";

async function expectedTokenEdge(passcode: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("ccbilly-admin-v2"),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v2.${hex.slice(0, 32)}`;
}

/** Constant-time compare of two equal-length-ish strings (Edge). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Only guard protected (mutation / sensitive) requests; reads pass through.
  if (!isProtectedRequest(method, pathname) && !pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  // The login endpoint must remain reachable to establish a session.
  if (isAuthEndpoint(pathname)) return NextResponse.next();

  const authMode: AuthMode =
    process.env.AUTH_MODE === "passcode" ? "passcode" : "none";
  const passcode = process.env.ADMIN_PASSCODE ?? "";
  const passcodeConfigured = Boolean(passcode);

  let hasValidSession = false;
  if (passcodeConfigured) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) hasValidSession = safeEqual(token, await expectedTokenEdge(passcode));
  }

  // /admin page navigations: let the page's own server check + login screen handle
  // UX, but still fail-closed on exposed no-auth deployments.
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/api");

  const decision = decideProtected({
    method,
    pathname,
    host: req.headers.get("host"),
    authMode,
    passcodeConfigured,
    hasValidSession,
  });

  if (decision.action === "allow") return NextResponse.next();

  // For admin PAGE requests that are merely unauthenticated (401), let the page
  // render its login screen instead of a bare JSON error.
  if (isAdminPage && decision.status === 401) return NextResponse.next();

  return NextResponse.json(
    { error: "访问被拒绝", detail: decision.reason },
    { status: decision.status },
  );
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
