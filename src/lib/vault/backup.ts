import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { vaultDir, projectRoot } from "@/lib/config";

/**
 * Zip the entire vault to a timestamped backup (ADR-022). Used before any
 * migration so every change is reversible. Backups go to `backups/` at the
 * project root (gitignored). Returns the backup file path.
 *
 * The timestamp is passed in (callers stamp it) so this stays deterministic and
 * testable; `Date` is avoided here on purpose.
 */
export function backupVault(stamp: string, destDir?: string): Promise<string> {
  const dir = destDir ?? path.join(projectRoot(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `vault-${stamp}.zip`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(out);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve(out));
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(vaultDir(), "vault");
    void archive.finalize();
  });
}
