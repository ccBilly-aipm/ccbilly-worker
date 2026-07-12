import { getDb, resetDbFile, setMeta, INDEX_SCHEMA_VERSION } from "@/lib/index/db";
import { scanAll, readEntry } from "@/lib/vault/repo";
import type { BrokenEntry, VaultEntry } from "@/lib/vault/types";
import { unwrapWikiLink, extractLinkTargets } from "@/lib/markdown/wikilink";
import { localISO } from "@/lib/utils/date";
import { riceScore } from "@/lib/pm/rice";
import type { EntryType } from "@/lib/schema";

/**
 * Indexer: projects vault entries into the SQLite cache and maintains the
 * backlink graph. Full rebuild (reindex) or incremental (single file changed).
 */

function upsertEntry(entry: VaultEntry): void {
  const db = getDb();
  const d = entry.data as Record<string, unknown>;
  const collection = unwrapWikiLink(
    (d.collection as string | null | undefined) ?? null,
  );
  const tags = Array.isArray(d.tags) ? JSON.stringify(d.tags) : "[]";

  // V2 (ADR-019): derive kind/stage/score for indexed filtering. A task file
  // without `kind` indexes as a plain task; requirements get a computed RICE
  // score; content items carry their pipeline stage.
  const kind = (d.kind as string | undefined) ?? null;
  const stage = (d.stage as string | undefined) ?? null;
  const score =
    kind === "requirement" && d.rice
      ? riceScore(d.rice as Parameters<typeof riceScore>[0])
      : null;

  db.prepare(
    `INSERT OR REPLACE INTO entries
     (file_path, slug, type, id, title, status, priority, collection,
      progress, due, tags, category, kind, score, stage,
      data_json, content, mtime_ms, created, updated)
     VALUES (@file_path, @slug, @type, @id, @title, @status, @priority, @collection,
      @progress, @due, @tags, @category, @kind, @score, @stage,
      @data_json, @content, @mtime_ms, @created, @updated)`,
  ).run({
    file_path: entry.filePath,
    slug: entry.slug,
    type: entry.type,
    id: (d.id as string) ?? entry.slug,
    title: (d.title as string) ?? (d.name as string) ?? entry.slug,
    status: (d.status as string) ?? null,
    priority: (d.priority as string) ?? null,
    collection,
    progress: typeof d.progress === "number" ? d.progress : null,
    due: (d.due as string) ?? null,
    tags,
    category: (d.category as string) ?? null,
    kind,
    score,
    stage,
    data_json: JSON.stringify(entry.data),
    content: entry.content,
    mtime_ms: entry.mtimeMs,
    created: (d.created as string) ?? null,
    updated: (d.updated as string) ?? null,
  });

  // rebuild link rows for this file
  db.prepare("DELETE FROM links WHERE src_path = ?").run(entry.filePath);
  const targets = new Set<string>(extractLinkTargets(entry.content));
  if (collection) targets.add(collection);
  const insLink = db.prepare(
    "INSERT OR IGNORE INTO links (src_path, target) VALUES (?, ?)",
  );
  for (const t of targets) insLink.run(entry.filePath, t);

  // clear any prior broken record for this file
  db.prepare("DELETE FROM broken WHERE file_path = ?").run(entry.filePath);
}

function upsertBroken(broken: BrokenEntry): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO broken (file_path, slug, type, error, mtime_ms)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(broken.filePath, broken.slug, broken.type, broken.error, broken.mtimeMs);
  // a broken file should not linger in entries
  db.prepare("DELETE FROM entries WHERE file_path = ?").run(broken.filePath);
}

function removeFile(filePath: string): void {
  const db = getDb();
  db.prepare("DELETE FROM entries WHERE file_path = ?").run(filePath);
  db.prepare("DELETE FROM links WHERE src_path = ?").run(filePath);
  db.prepare("DELETE FROM broken WHERE file_path = ?").run(filePath);
}

/** Full rebuild from scratch. Drops and recreates the DB file first. */
export async function rebuildIndex(): Promise<{
  entries: number;
  broken: number;
}> {
  resetDbFile();
  const db = getDb();
  const { entries, broken } = await scanAll();
  const tx = db.transaction(() => {
    for (const e of entries) upsertEntry(e);
    for (const b of broken) upsertBroken(b);
  });
  tx();
  setMeta("last_reindex", localISO());
  setMeta("schema_version", INDEX_SCHEMA_VERSION);
  return { entries: entries.length, broken: broken.length };
}

/** Incremental: a single file was added/changed. */
export async function indexFile(
  filePath: string,
  typeHint?: EntryType,
): Promise<void> {
  const { entry, broken } = await readEntry(filePath, typeHint);
  if (entry) upsertEntry(entry);
  else if (broken) upsertBroken(broken);
}

/**
 * Batch incremental update (S2-2): read all changed/removed files, then apply
 * every write inside a SINGLE transaction. A change storm (e.g. `git pull`
 * bringing in 500 files) coalesces into one commit instead of N, which is both
 * far faster and crash-consistent. Reads happen outside the transaction (I/O),
 * writes inside it.
 */
export async function applyChanges(changed: string[], removed: string[]): Promise<{
  indexed: number;
  broken: number;
  removed: number;
}> {
  // Read (I/O) outside the transaction.
  const results = await Promise.all(
    changed.map(async (filePath) => {
      try {
        return { filePath, ...(await readEntry(filePath)) };
      } catch (err) {
        return {
          filePath,
          broken: {
            filePath,
            slug: filePath,
            type: "unknown" as BrokenEntry["type"],
            error: `读取失败：${(err as Error).message}`,
            mtimeMs: 0,
          } as BrokenEntry,
        };
      }
    }),
  );

  let indexed = 0;
  let brokenN = 0;
  const db = getDb();
  const tx = db.transaction(() => {
    for (const filePath of removed) removeFile(filePath);
    for (const r of results) {
      if (r.entry) {
        upsertEntry(r.entry);
        indexed++;
      } else if (r.broken) {
        upsertBroken(r.broken);
        brokenN++;
      }
    }
  });
  tx();
  return { indexed, broken: brokenN, removed: removed.length };
}

/** Incremental: a file was removed. */
export function unindexFile(filePath: string): void {
  removeFile(filePath);
}
