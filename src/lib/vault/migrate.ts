import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir, VAULT_V2_DIRS } from "@/lib/config";

/**
 * V2 migration (ADR-022). Idempotent and non-destructive: it only CREATES the V2
 * directories (inbox/decisions/config/templates) and seeds default config files
 * if absent. It never rewrites or deletes existing business data — old task /
 * collection files are already valid under the extended schema (all V2 fields
 * optional), so there is nothing to backfill. Safe to run repeatedly.
 *
 * Callers (the `pnpm migrate` script) MUST back up the vault first (backupVault).
 */

export interface MigrationResult {
  createdDirs: string[];
  seededFiles: string[];
  alreadyMigrated: boolean;
}

/** Create the V2 vault directories if missing. Returns those that were created. */
export function ensureV2Dirs(): string[] {
  const created: string[] = [];
  for (const key of Object.keys(VAULT_V2_DIRS) as (keyof typeof VAULT_V2_DIRS)[]) {
    const dir = vaultV2Dir(key);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }
  return created;
}

/** Run the full V2 migration. Idempotent. */
export function migrateVault(): MigrationResult {
  const createdDirs = ensureV2Dirs();
  const seededFiles: string[] = [];

  // Seed a .gitkeep in each V2 dir so empty dirs survive Git (and are visible).
  for (const key of Object.keys(VAULT_V2_DIRS) as (keyof typeof VAULT_V2_DIRS)[]) {
    const keep = path.join(vaultV2Dir(key), ".gitkeep");
    if (!fs.existsSync(keep)) {
      fs.writeFileSync(keep, "");
      seededFiles.push(keep);
    }
  }

  return {
    createdDirs,
    seededFiles,
    alreadyMigrated: createdDirs.length === 0 && seededFiles.length === 0,
  };
}
