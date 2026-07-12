/**
 * V2 migration CLI (ADR-022): `pnpm migrate`.
 *
 * 1. Backs up the ENTIRE vault to a timestamped zip (reversible red line).
 * 2. Runs the idempotent, non-destructive migration (creates V2 dirs only).
 * 3. Rebuilds the index.
 *
 * Old vault data is never rewritten — the V2 schema fields are all optional, so
 * existing files stay valid. This mainly provisions the new V2 directories.
 */
import { backupVault } from "../src/lib/vault/backup";
import { migrateVault } from "../src/lib/vault/migrate";
import { rebuildIndex } from "../src/lib/index/indexer";
import { vaultDir } from "../src/lib/config";

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  console.log(`migrating vault at ${vaultDir()} …`);

  console.log("① backing up vault (reversible) …");
  const backup = await backupVault(timestamp());
  console.log(`   backup written: ${backup}`);

  console.log("② applying V2 migration (idempotent, non-destructive) …");
  const result = migrateVault();
  if (result.alreadyMigrated) {
    console.log("   already migrated — no changes.");
  } else {
    for (const d of result.createdDirs) console.log(`   + dir ${d}`);
    console.log(`   seeded ${result.seededFiles.length} placeholder file(s).`);
  }

  console.log("③ rebuilding index …");
  const { entries, broken } = await rebuildIndex();
  console.log(`   done. entries=${entries}, broken=${broken}`);

  console.log(
    `\n✓ migration complete. If anything looks wrong, restore from:\n  ${backup}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("migration failed:", e);
  console.error("your vault backup (if created) is intact; no data was deleted.");
  process.exit(1);
});
