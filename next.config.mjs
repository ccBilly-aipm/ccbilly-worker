/** @type {import('next').NextConfig} */

/**
 * Security response headers (S1-6 / ADR-017). Applied to every route.
 *
 * CSP is deliberately pragmatic, not maximal: the deep-space glassmorphism theme
 * relies on inline styles, and next-themes + Recharts inject inline scripts, so
 * 'unsafe-inline' is permitted for style/script for now (a nonce-based strict CSP
 * is a larger refactor tracked for later). frame-src is left open so the App
 * Center can embed iframe apps; frame-ancestors 'self' still prevents THIS app
 * from being framed by others (clickjacking). This is a net tightening over the
 * previous no-header baseline.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' only in dev (React Refresh); dropped in production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // API calls are same-origin; the reverse proxy runs server-side (SSRF-guarded).
  "connect-src 'self'",
  // App Center embeds third-party apps in iframes → allow any https frame source.
  "frame-src 'self' https:",
  // but this app itself may only be framed by itself (anti-clickjacking).
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "chokidar", "simple-git"],
  eslint: {
    dirs: ["src", "scripts", "tests/unit"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Dev-only Next.js indicator floats bottom-left by default and covered the
  // sidebar "折叠" button. Move it to the bottom-right. (Only shows in `pnpm dev`;
  // never in production builds.) To hide it entirely, set `devIndicators: false`.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
