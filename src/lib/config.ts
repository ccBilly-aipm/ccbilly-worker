import path from "node:path";
import os from "node:os";

/**
 * Central path & environment resolution.
 * Tests override VAULT_DIR / SKILLS roots via env so they never touch real
 * user data (HANDBOOK ADR-009). Never hardcode absolute paths elsewhere.
 */

/** Project root = process.cwd() in dev/build; stable for a single-user local app. */
export function projectRoot(): string {
  return process.cwd();
}

/** vault/ directory — the single source of truth for business data. */
export function vaultDir(): string {
  return process.env.CCBILLY_VAULT_DIR
    ? path.resolve(process.env.CCBILLY_VAULT_DIR)
    : path.join(projectRoot(), "vault");
}

/** SQLite index cache location (rebuildable, gitignored). */
export function cacheDir(): string {
  return process.env.CCBILLY_CACHE_DIR
    ? path.resolve(process.env.CCBILLY_CACHE_DIR)
    : path.join(projectRoot(), "cache");
}

export function indexDbPath(): string {
  return path.join(cacheDir(), "index.db");
}

/** Per-type subdirectories inside the vault. */
export const VAULT_SUBDIRS = {
  task: "tasks",
  collection: "collections",
  daily: "reports/daily",
  weekly: "reports/weekly",
  skill: "skills",
  knowledge: "knowledge",
  app: "apps",
} as const;

/**
 * V2 (ADR-019/020/021/022): additional vault directories introduced by the
 * dual-role version. Not entry-type dirs — they hold inbox captures, decision
 * logs, config (preset + dashboard layout) and template packs.
 */
export const VAULT_V2_DIRS = {
  inbox: "inbox",
  decisions: "decisions",
  config: "config",
  templates: "templates",
} as const;

export function vaultV2Dir(key: keyof typeof VAULT_V2_DIRS): string {
  return path.join(vaultDir(), VAULT_V2_DIRS[key]);
}

export type VaultEntryType =
  | "task"
  | "collection"
  | "daily"
  | "weekly"
  | "skill"
  | "app";

export function vaultTypeDir(type: keyof typeof VAULT_SUBDIRS): string {
  return path.join(vaultDir(), VAULT_SUBDIRS[type]);
}

/**
 * Personal-level Claude Code skills root (~/.claude/skills).
 * In test/E2E, overridden by CCBILLY_SKILLS_TEST_ROOT so we never write real skills.
 */
export function personalSkillsRoot(): string {
  return (
    process.env.CCBILLY_SKILLS_TEST_ROOT ??
    path.join(os.homedir(), ".claude", "skills")
  );
}

/** Additional project-level skill roots (each contributes <root>/.claude/skills). */
export function projectSkillRoots(): string[] {
  const raw = process.env.CCBILLY_SKILL_PROJECT_ROOTS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => path.resolve(r));
}

export function isE2E(): boolean {
  return process.env.CCBILLY_E2E === "1";
}

/** Auth mode (S1-4). "none" = localhost single-user convenience; "passcode" = all
 * mutations require a session. Default "none". */
export function authMode(): "none" | "passcode" {
  return process.env.AUTH_MODE === "passcode" ? "passcode" : "none";
}
