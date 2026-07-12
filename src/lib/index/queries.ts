import { getDb } from "@/lib/index/db";
import type { EntryType } from "@/lib/schema";

/**
 * Read-side queries over the index. UI always reads through here, never scans
 * the filesystem directly (ADR-003/004). Derived values (collection progress,
 * backlinks) are computed here, not stored on disk (spec §5).
 */

export interface IndexRow {
  file_path: string;
  slug: string;
  type: EntryType;
  id: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  collection: string | null;
  progress: number | null;
  due: string | null;
  tags: string; // JSON
  category: string | null;
  data_json: string;
  content: string;
  mtime_ms: number;
  created: string | null;
  updated: string | null;
}

export interface EntryView {
  filePath: string;
  slug: string;
  type: EntryType;
  data: Record<string, unknown>;
  content: string;
  mtimeMs: number;
}

function rowToView(row: IndexRow): EntryView {
  return {
    filePath: row.file_path,
    slug: row.slug,
    type: row.type,
    data: JSON.parse(row.data_json),
    content: row.content,
    mtimeMs: row.mtime_ms,
  };
}

export function listByType(type: EntryType): EntryView[] {
  const rows = getDb()
    .prepare("SELECT * FROM entries WHERE type = ? ORDER BY updated DESC, slug ASC")
    .all(type) as IndexRow[];
  return rows.map(rowToView);
}

export function getByFilePath(filePath: string): EntryView | null {
  const row = getDb()
    .prepare("SELECT * FROM entries WHERE file_path = ?")
    .get(filePath) as IndexRow | undefined;
  return row ? rowToView(row) : null;
}

export function getById(id: string): EntryView | null {
  const row = getDb()
    .prepare("SELECT * FROM entries WHERE id = ?")
    .get(id) as IndexRow | undefined;
  return row ? rowToView(row) : null;
}

export function getBySlug(type: EntryType, slug: string): EntryView | null {
  const row = getDb()
    .prepare("SELECT * FROM entries WHERE type = ? AND slug = ?")
    .get(type, slug) as IndexRow | undefined;
  return row ? rowToView(row) : null;
}

/** Tasks belonging to a collection (matched by collection title). */
export function tasksInCollection(collectionTitle: string): EntryView[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM entries WHERE type = 'task' AND collection = ? ORDER BY priority ASC, updated DESC",
    )
    .all(collectionTitle) as IndexRow[];
  return rows.map(rowToView);
}

/**
 * Collection progress = weighted completion of member tasks.
 * Weight = 1 per task; a task contributes its `progress` (done => 100).
 * Returns { taskCount, doneCount, progress(0-100) }.
 */
export function collectionProgress(collectionTitle: string): {
  taskCount: number;
  doneCount: number;
  progress: number;
} {
  const rows = getDb()
    .prepare(
      "SELECT status, progress FROM entries WHERE type = 'task' AND collection = ? AND status != 'archived'",
    )
    .all(collectionTitle) as { status: string; progress: number | null }[];
  if (rows.length === 0) return { taskCount: 0, doneCount: 0, progress: 0 };
  let sum = 0;
  let done = 0;
  for (const r of rows) {
    const p = r.status === "done" ? 100 : (r.progress ?? 0);
    sum += p;
    if (r.status === "done") done++;
  }
  return {
    taskCount: rows.length,
    doneCount: done,
    progress: Math.round(sum / rows.length),
  };
}

/** Files that link TO a given target (backlinks). */
export function backlinks(target: string): EntryView[] {
  const rows = getDb()
    .prepare(
      `SELECT e.* FROM links l JOIN entries e ON e.file_path = l.src_path
       WHERE l.target = ? ORDER BY e.type, e.slug`,
    )
    .all(target) as IndexRow[];
  return rows.map(rowToView);
}

export interface BrokenRow {
  file_path: string;
  slug: string;
  type: string;
  error: string;
  mtime_ms: number;
}

export function listBroken(): BrokenRow[] {
  return getDb()
    .prepare("SELECT * FROM broken ORDER BY mtime_ms DESC")
    .all() as BrokenRow[];
}

export function countsByType(): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT type, COUNT(*) as n FROM entries GROUP BY type")
    .all() as { type: string; n: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.type] = r.n;
  return out;
}

export function brokenCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as n FROM broken").get() as {
    n: number;
  };
  return row.n;
}

// ---- V2 queries (ADR-019) ----

/** Requirements (kind=requirement), ordered by computed RICE score desc. */
export function listRequirements(stage?: string): EntryView[] {
  const db = getDb();
  const rows = stage
    ? (db
        .prepare(
          "SELECT * FROM entries WHERE kind = 'requirement' AND stage = ? ORDER BY score DESC, updated DESC",
        )
        .all(stage) as IndexRow[])
    : (db
        .prepare(
          "SELECT * FROM entries WHERE kind = 'requirement' ORDER BY score DESC, updated DESC",
        )
        .all() as IndexRow[]);
  return rows.map(rowToView);
}

/** Content items (kind=content), newest first (optionally by stage). */
export function listContent(stage?: string): EntryView[] {
  const db = getDb();
  const rows = stage
    ? (db
        .prepare(
          "SELECT * FROM entries WHERE kind = 'content' AND stage = ? ORDER BY updated DESC",
        )
        .all(stage) as IndexRow[])
    : (db
        .prepare(
          "SELECT * FROM entries WHERE kind = 'content' ORDER BY updated DESC",
        )
        .all() as IndexRow[]);
  return rows.map(rowToView);
}

/** Plain tasks only (kind is null/absent or explicitly 'task'). */
export function listPlainTasks(): EntryView[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM entries WHERE type = 'task' AND (kind IS NULL OR kind = 'task') ORDER BY updated DESC, slug ASC",
    )
    .all() as IndexRow[];
  return rows.map(rowToView);
}
