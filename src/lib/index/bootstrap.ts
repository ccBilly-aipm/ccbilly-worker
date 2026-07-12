import fs from "node:fs";
import { indexDbPath } from "@/lib/config";
import { getDb, indexSchemaCurrent } from "@/lib/index/db";
import { rebuildIndex } from "@/lib/index/indexer";
import { startWatcher } from "@/lib/index/watcher";

/**
 * Server-side one-time bootstrap: ensure the index exists (rebuild if the DB
 * file is missing or empty) and start the chokidar watcher. Safe to call on
 * every request — guarded so the heavy work runs once per process.
 */

let ready: Promise<void> | null = null;

async function doBootstrap(): Promise<void> {
  const dbMissing = !fs.existsSync(indexDbPath());
  if (dbMissing) {
    await rebuildIndex();
  } else if (!indexSchemaCurrent()) {
    // A stale cache (e.g. a V1 index.db missing V2 columns) must be rebuilt to
    // the current schema before any incremental INSERT touches it (ADR-019).
    await rebuildIndex();
  } else {
    // DB exists but might be empty (fresh file); rebuild if no entries.
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as n FROM entries").get() as {
      n: number;
    };
    if (row.n === 0) await rebuildIndex();
  }
  // Watcher runs only in a long-lived server process, not during build/tests.
  if (process.env.CCBILLY_NO_WATCH !== "1") {
    startWatcher();
  }
}

export function ensureIndexReady(): Promise<void> {
  if (!ready) ready = doBootstrap();
  return ready;
}

/** Force a full rebuild (admin "重建索引" button). */
export async function forceReindex(): Promise<{
  entries: number;
  broken: number;
}> {
  const result = await rebuildIndex();
  ready = Promise.resolve();
  return result;
}
