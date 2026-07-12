/**
 * Layered auth decision logic (S1-4 / ADR-016). Pure functions so they are unit
 * testable and safe to run in Edge middleware. See docs/SECURITY_AUDIT.md §S1-4.
 *
 * Principle: localhost single-user convenience is never degraded; exposed
 * deployments (LAN / public / Docker) are forced into a safe posture.
 */

export type AuthMode = "none" | "passcode";

/** Mutating HTTP methods that change server/filesystem state. */
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * A few GET routes are sensitive enough to count as protected actions even
 * though they use GET (they exfiltrate data). Matched by pathname prefix.
 */
const SENSITIVE_GET_PREFIXES = ["/api/admin/export"];

/** Is this request a mutation / sensitive action that should be guarded? */
export function isProtectedRequest(method: string, pathname: string): boolean {
  if (MUTATION_METHODS.has(method.toUpperCase())) return true;
  if (method.toUpperCase() === "GET") {
    return SENSITIVE_GET_PREFIXES.some((p) => pathname.startsWith(p));
  }
  return false;
}

/** The login endpoint must stay reachable without a session (it grants one). */
export function isAuthEndpoint(pathname: string): boolean {
  return pathname === "/api/admin/auth";
}

/** Extract the hostname from a Host header value (strips port, brackets). */
export function hostnameFromHost(host: string | null): string {
  if (!host) return "";
  // strip a trailing :port (but keep IPv6 inside brackets)
  const m = host.match(/^\[([^\]]+)\]/); // [::1]:3000
  if (m) return m[1].toLowerCase();
  return host.split(":")[0].toLowerCase();
}

/** Is the request arriving on a loopback host (localhost / 127.x / ::1)? */
export function isLocalhostHost(host: string | null): boolean {
  const h = hostnameFromHost(host);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.startsWith("127.") ||
    h === "::1" ||
    h === "0:0:0:0:0:0:0:1"
  );
}

export type Decision =
  | { action: "allow" }
  | { action: "deny"; status: 401 | 403; reason: string };

export interface DecisionInput {
  method: string;
  pathname: string;
  host: string | null;
  authMode: AuthMode;
  passcodeConfigured: boolean;
  hasValidSession: boolean;
}

/**
 * Central decision for a protected (mutation/sensitive) request.
 * Non-protected requests should never reach here (caller checks isProtectedRequest).
 */
export function decideProtected(input: DecisionInput): Decision {
  const { pathname, host, authMode, passcodeConfigured, hasValidSession } = input;

  // The login endpoint is always reachable (rate-limited elsewhere).
  if (isAuthEndpoint(pathname)) return { action: "allow" };

  const local = isLocalhostHost(host);

  // passcode mode: a valid session is required for every protected request.
  if (authMode === "passcode") {
    if (!passcodeConfigured) {
      // misconfigured: passcode mode but no ADMIN_PASSCODE set → fail closed.
      return {
        action: "deny",
        status: 403,
        reason:
          "AUTH_MODE=passcode 但未设置 ADMIN_PASSCODE。请在 .env.local 配置口令后重启。",
      };
    }
    if (hasValidSession) return { action: "allow" };
    return { action: "deny", status: 401, reason: "需要登录后台会话。" };
  }

  // authMode === "none":
  // localhost single-user → allow (convenience, never degraded).
  if (local) return { action: "allow" };

  // Non-localhost exposure with no auth → FAIL CLOSED.
  return {
    action: "deny",
    status: 403,
    reason:
      "检测到从非本机地址访问且未启用鉴权。请设置 AUTH_MODE=passcode 与 ADMIN_PASSCODE 后重启，或仅在本机（localhost）使用。",
  };
}

/**
 * Fixed-window rate limiter (in-memory). Used for the login endpoint. Keyed by
 * client id (IP). Not distributed — sufficient for a single-node local app.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  /** Returns true if allowed, false if the key is over the limit. */
  check(key: string, now: number): boolean {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.limit) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
}
