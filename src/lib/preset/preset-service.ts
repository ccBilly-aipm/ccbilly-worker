import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { DEFAULT_PRESET, PRESETS, type PresetId } from "@/lib/preset/presets";

/**
 * Active preset persistence (ADR-020). Stored as `vault/config/preset.md` so it
 * syncs with the vault over Git. Frontmatter holds the active preset id and
 * whether onboarding has been completed. Reading is fail-safe: a missing or
 * malformed file falls back to the default preset (never throws).
 */

export interface PresetState {
  active: PresetId;
  onboarded: boolean;
}

const DEFAULTS: PresetState = { active: DEFAULT_PRESET, onboarded: false };

function presetPath(): string {
  return path.join(vaultV2Dir("config"), "preset.md");
}

function isPresetId(v: unknown): v is PresetId {
  return typeof v === "string" && v in PRESETS;
}

export function readPreset(): PresetState {
  try {
    const raw = fs.readFileSync(presetPath(), "utf8");
    const { data } = parseDoc(raw);
    const d = data as Record<string, unknown>;
    return {
      active: isPresetId(d.active) ? d.active : DEFAULT_PRESET,
      onboarded: d.onboarded === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writePreset(
  partial: Partial<PresetState>,
): Promise<PresetState> {
  const next = { ...readPreset(), ...partial };
  // guard against an invalid preset id sneaking in
  if (!isPresetId(next.active)) next.active = DEFAULT_PRESET;
  fs.mkdirSync(vaultV2Dir("config"), { recursive: true });
  const body = `# 角色预设\n\n当前：**${PRESETS[next.active].label}**\n\n${PRESETS[next.active].description}\n`;
  await atomicWriteFile(
    presetPath(),
    stringifyDoc(
      { type: "config", config: "preset", active: next.active, onboarded: next.onboarded },
      body,
    ),
  );
  return next;
}
