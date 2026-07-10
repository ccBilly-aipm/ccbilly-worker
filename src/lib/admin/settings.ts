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
  displayName: string; // 称呼 (default 「B哥」)
  weekStartsMonday: boolean;
  defaultTheme: "dark" | "light" | "system";
  skillProjectRoots: string[];
}

const DEFAULTS: Settings = {
  displayName: "B哥",
  weekStartsMonday: true,
  defaultTheme: "dark",
  skillProjectRoots: [],
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
