import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isProtectedRequest,
  isAuthEndpoint,
  isLocalhostHost,
  hostnameFromHost,
  decideProtected,
  RateLimiter,
  type DecisionInput,
} from "../../src/lib/admin/exposure";

/**
 * S1-4 adversarial auth-model suite. Proves the layered decision:
 * localhost+none frictionless; exposed+none fail-closed; passcode requires
 * session; login rate-limited; constant-time passcode compare. See §S1-4.
 */

describe("request classification", () => {
  it("flags mutation methods as protected", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isProtectedRequest(m, "/api/tasks")).toBe(true);
    }
  });
  it("treats plain GET as unprotected", () => {
    expect(isProtectedRequest("GET", "/api/tasks")).toBe(false);
  });
  it("treats the vault export GET as protected (exfiltration)", () => {
    expect(isProtectedRequest("GET", "/api/admin/export")).toBe(true);
  });
  it("marks the login endpoint", () => {
    expect(isAuthEndpoint("/api/admin/auth")).toBe(true);
    expect(isAuthEndpoint("/api/tasks")).toBe(false);
  });
});

describe("host parsing", () => {
  it("strips ports and IPv6 brackets", () => {
    expect(hostnameFromHost("localhost:3000")).toBe("localhost");
    expect(hostnameFromHost("[::1]:3000")).toBe("::1");
    expect(hostnameFromHost("192.168.1.5:80")).toBe("192.168.1.5");
  });
  it("classifies loopback hosts", () => {
    expect(isLocalhostHost("localhost:3000")).toBe(true);
    expect(isLocalhostHost("127.0.0.1")).toBe(true);
    expect(isLocalhostHost("[::1]:3000")).toBe(true);
    expect(isLocalhostHost("192.168.1.5")).toBe(false);
    expect(isLocalhostHost("evil.example.com")).toBe(false);
  });
});

describe("decideProtected — the layered matrix", () => {
  const base: DecisionInput = {
    method: "POST",
    pathname: "/api/skills/personal/x",
    host: "localhost:3000",
    authMode: "none",
    passcodeConfigured: false,
    hasValidSession: false,
  };

  it("localhost + none → allow (convenience never degraded)", () => {
    expect(decideProtected({ ...base }).action).toBe("allow");
  });

  it("EXPOSED (LAN) + none → deny 403 fail-closed", () => {
    const d = decideProtected({ ...base, host: "192.168.1.5:3000" });
    expect(d).toEqual({ action: "deny", status: 403, reason: expect.any(String) });
  });

  it("EXPOSED public host + none → deny 403", () => {
    const d = decideProtected({ ...base, host: "myserver.example.com" });
    expect(d.action).toBe("deny");
    if (d.action === "deny") expect(d.status).toBe(403);
  });

  it("passcode + no session → deny 401 (even on localhost)", () => {
    const d = decideProtected({
      ...base,
      authMode: "passcode",
      passcodeConfigured: true,
      hasValidSession: false,
    });
    expect(d.action).toBe("deny");
    if (d.action === "deny") expect(d.status).toBe(401);
  });

  it("passcode + valid session → allow", () => {
    const d = decideProtected({
      ...base,
      host: "192.168.1.5:3000",
      authMode: "passcode",
      passcodeConfigured: true,
      hasValidSession: true,
    });
    expect(d.action).toBe("allow");
  });

  it("passcode mode but no passcode set → deny 403 (misconfig fail-closed)", () => {
    const d = decideProtected({
      ...base,
      authMode: "passcode",
      passcodeConfigured: false,
    });
    expect(d.action).toBe("deny");
    if (d.action === "deny") expect(d.status).toBe(403);
  });

  it("login endpoint always allowed", () => {
    const d = decideProtected({
      ...base,
      host: "192.168.1.5",
      pathname: "/api/admin/auth",
    });
    expect(d.action).toBe("allow");
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const rl = new RateLimiter(5, 60_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rl.check("ip", t + i)).toBe(true);
    expect(rl.check("ip", t + 6)).toBe(false); // 6th blocked
  });
  it("resets after the window elapses", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.check("ip", 0)).toBe(true);
    expect(rl.check("ip", 100)).toBe(true);
    expect(rl.check("ip", 200)).toBe(false);
    expect(rl.check("ip", 1201)).toBe(true); // window passed
  });
  it("keys are independent", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("a", 0)).toBe(true);
    expect(rl.check("b", 0)).toBe(true);
    expect(rl.check("a", 1)).toBe(false);
  });
});

describe("constant-time passcode compare + token validation", () => {
  const OLD = process.env.ADMIN_PASSCODE;
  beforeEach(() => {
    process.env.ADMIN_PASSCODE = "s3cret-pass";
  });
  afterEach(() => {
    if (OLD === undefined) delete process.env.ADMIN_PASSCODE;
    else process.env.ADMIN_PASSCODE = OLD;
  });

  it("verifyPasscode accepts the exact passcode, rejects others", async () => {
    const { verifyPasscode } = await import("../../src/lib/admin/auth");
    expect(verifyPasscode("s3cret-pass")).toBe(true);
    expect(verifyPasscode("wrong")).toBe(false);
    expect(verifyPasscode("s3cret-pas")).toBe(false); // length differs
    expect(verifyPasscode("")).toBe(false);
  });

  it("timingSafeEqualStr handles unequal lengths without throwing", async () => {
    const { timingSafeEqualStr } = await import("../../src/lib/admin/auth");
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
  });

  it("isValidToken validates only the HMAC token for the current passcode", async () => {
    const { expectedToken, isValidToken } = await import("../../src/lib/admin/auth");
    const tok = expectedToken();
    expect(tok.startsWith("v2.")).toBe(true);
    expect(isValidToken(tok)).toBe(true);
    expect(isValidToken("v2.deadbeef")).toBe(false);
    expect(isValidToken(undefined)).toBe(false);
  });
});
