import { cookies } from "next/headers";

/**
 * Admin passcode auth (spec §6.8). RED-FLAG in README: this only guards against
 * accidental local clicks — NOT real security. Public deploys must add a real
 * auth layer. The cookie is httpOnly and holds a derived token, not the passcode.
 */

const COOKIE_NAME = "ccbilly_admin";

function expectedToken(): string {
  const pass = process.env.ADMIN_PASSCODE ?? "";
  // simple non-reversible-ish token; sufficient for local misclick protection
  let h = 2166136261;
  for (let i = 0; i < pass.length; i++) {
    h ^= pass.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `v1.${(h >>> 0).toString(36)}`;
}

/** Whether a passcode is configured at all. */
export function isPasscodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE);
}

export function verifyPasscode(input: string): boolean {
  const pass = process.env.ADMIN_PASSCODE ?? "";
  return Boolean(pass) && input === pass;
}

export async function isAdminAuthed(): Promise<boolean> {
  // if no passcode configured, allow (single-user local convenience) but the UI
  // shows a warning to set one.
  if (!isPasscodeConfigured()) return true;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === expectedToken();
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
