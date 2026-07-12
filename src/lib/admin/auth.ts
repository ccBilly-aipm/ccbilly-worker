import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Admin passcode auth (spec §6.8, hardened in S1-4 / ADR-016).
 *
 * In AUTH_MODE=none this only guards accidental local clicks. In
 * AUTH_MODE=passcode it is a real (single-user) auth gate: all mutation APIs
 * require the session cookie (enforced in middleware). The cookie holds an
 * HMAC-derived token, never the passcode; the passcode is compared in constant
 * time. See docs/SECURITY_AUDIT.md §S1-4.
 */

const COOKIE_NAME = "ccbilly_admin";

/** Constant-time string equality (avoids timing side-channels). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // still do a comparison against self to keep timing roughly constant
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Session token = HMAC-SHA256(passcode, fixed label). Deterministic per passcode
 * (so it validates across requests without server-side session storage), but not
 * reversible to the passcode.
 */
export function expectedToken(): string {
  const pass = process.env.ADMIN_PASSCODE ?? "";
  const mac = crypto.createHmac("sha256", pass).update("ccbilly-admin-v2").digest("hex");
  return `v2.${mac.slice(0, 32)}`;
}

/** Whether a passcode is configured at all. */
export function isPasscodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE);
}

export function verifyPasscode(input: string): boolean {
  const pass = process.env.ADMIN_PASSCODE ?? "";
  if (!pass) return false;
  return timingSafeEqualStr(input, pass);
}

/** Validate a raw cookie token value (constant-time). */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  return timingSafeEqualStr(token, expectedToken());
}

export async function isAdminAuthed(): Promise<boolean> {
  // AUTH_MODE=none + no passcode → allow (single-user local convenience); UI warns.
  if (process.env.AUTH_MODE !== "passcode" && !isPasscodeConfigured()) return true;
  const store = await cookies();
  return isValidToken(store.get(COOKIE_NAME)?.value);
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
