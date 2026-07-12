import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateVault, ensureV2Dirs } from "../../src/lib/vault/migrate";
import { backupVault } from "../../src/lib/vault/backup";

/**
 * V2-M1b: migration must be idempotent, non-destructive, and reversible
 * (backup-first). Old vault files must be untouched. See ADR-022 + red line
 * "迁移必须可逆（自动备份先行）；旧版 vault 无损兼容".
 */
let vault: string;
let backupsDir: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-mig-"));
  backupsDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-migbk-"));
  process.env.CCBILLY_VAULT_DIR = vault;
  // seed a V1-style task file
  fs.mkdirSync(path.join(vault, "tasks"), { recursive: true });
  fs.writeFileSync(
    path.join(vault, "tasks", "old.md"),
    "---\nid: old\ntype: task\ntitle: 旧任务\nstatus: todo\npriority: P2\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'\n---\n正文\n",
  );
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  fs.rmSync(backupsDir, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
});

describe("migrateVault", () => {
  it("creates the four V2 directories", () => {
    const res = migrateVault();
    for (const d of ["inbox", "decisions", "config", "templates"]) {
      expect(fs.existsSync(path.join(vault, d)), `${d} should exist`).toBe(true);
    }
    expect(res.createdDirs.length).toBe(4);
  });

  it("is idempotent — a second run makes no changes", () => {
    migrateVault();
    const second = migrateVault();
    expect(second.alreadyMigrated).toBe(true);
    expect(second.createdDirs).toEqual([]);
    expect(second.seededFiles).toEqual([]);
  });

  it("does NOT touch existing business data", () => {
    const before = fs.readFileSync(path.join(vault, "tasks", "old.md"), "utf8");
    migrateVault();
    const after = fs.readFileSync(path.join(vault, "tasks", "old.md"), "utf8");
    expect(after).toBe(before);
  });

  it("ensureV2Dirs is safe to call alone", () => {
    const created = ensureV2Dirs();
    expect(created.length).toBe(4);
    expect(ensureV2Dirs()).toEqual([]); // already there
  });
});

describe("backupVault (reversible)", () => {
  it("writes a timestamped zip containing the vault", async () => {
    const out = await backupVault("20260101-000000", backupsDir);
    expect(out).toContain("vault-20260101-000000.zip");
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.statSync(out).size).toBeGreaterThan(0);
  });
});
