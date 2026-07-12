import fs from "node:fs";
import path from "node:path";
import { vaultDir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";

/**
 * Personalization settings (spec §6.8 ⑤). Stored as a small JSON in the vault so
 * it syncs with everything else. Skill scan project roots are ALSO configurable
 * here (spec §6.5) in addition to the env var.
 */

export interface Settings {
  displayName: string; // 称呼 (default 「朋友」)
  weekStartsMonday: boolean;
  defaultTheme: "dark" | "light" | "system";
  skillProjectRoots: string[];
  /**
   * SSRF opt-in (S1-3): allow the reverse proxy to reach loopback/private
   * targets (e.g. a local model server). Default OFF (fail-closed). The cloud
   * metadata address is ALWAYS blocked regardless of this flag.
   */
  allowInternalProxyTargets: boolean;
}

const DEFAULTS: Settings = {
  displayName: "朋友",
  weekStartsMonday: true,
  defaultTheme: "dark",
  skillProjectRoots: [],
  allowInternalProxyTargets: false,
};

function settingsPath(): string {
  return path.join(vaultDir(), "settings.json");
}

export function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeSettings(partial: Partial<Settings>): Promise<Settings> {
  const next = { ...readSettings(), ...partial };
  await atomicWriteFile(settingsPath(), JSON.stringify(next, null, 2) + "\n");
  return next;
}
