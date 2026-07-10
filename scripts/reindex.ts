/** Rebuild the SQLite index from vault/*.md. Run: `pnpm reindex`. */
import { rebuildIndex } from "../src/lib/index/indexer";
import { vaultDir } from "../src/lib/config";

async function main() {
  console.log(`rebuilding index from ${vaultDir()} …`);
  const { entries, broken } = await rebuildIndex();
  console.log(`done. entries=${entries}, broken=${broken}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("reindex failed:", e);
  process.exit(1);
});
