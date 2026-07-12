import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { indexDbPath, cacheDir } from "@/lib/config";

/**
 * SQLite index cache (cache/index.db). It is a REBUILDABLE mirror of vault/*.md
 * — never the source of truth (ADR-003). Safe to delete; `reindex` rebuilds it.
 *
 * A single process-wide connection is fine for a single-user local app.
 */

let db: Database.Database | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entries (
  file_path   TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  type        TEXT NOT NULL,
  id          TEXT,
  title       TEXT,
  status      TEXT,
  priority    TEXT,
  collection  TEXT,          -- resolved collection target (bare, no [[]])
  progress    INTEGER,
  due         TEXT,
  tags        TEXT,          -- JSON array
  category    TEXT,
  kind        TEXT,          -- V2: task | requirement | content (null = task)
  score       REAL,          -- V2: computed RICE score for requirements
  stage       TEXT,          -- V2: requirement/content pipeline stage
  data_json   TEXT NOT NULL, -- full frontmatter JSON
  content     TEXT NOT NULL, -- body markdown
  mtime_ms    REAL NOT NULL,
  created     TEXT,
  updated     TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_collection ON entries(collection);
CREATE INDEX IF NOT EXISTS idx_entries_kind ON entries(kind);
CREATE INDEX IF NOT EXISTS idx_entries_stage ON entries(stage);

CREATE TABLE IF NOT EXISTS links (
  src_path   TEXT NOT NULL,  -- file that contains the [[link]]
  target     TEXT NOT NULL,  -- link target (title/slug)
  PRIMARY KEY (src_path, target)
);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target);

CREATE TABLE IF NOT EXISTS broken (
  file_path TEXT PRIMARY KEY,
  slug      TEXT NOT NULL,
  type      TEXT NOT NULL,
  error     TEXT NOT NULL,
  mtime_ms  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

/**
 * Bump when the entries/index schema changes so a stale cache (e.g. a V1 index.db
 * lacking the V2 kind/score/stage columns) triggers a full rebuild instead of
 * failing on INSERT. The cache is rebuildable, so this is safe (ADR-003).
 */
export const INDEX_SCHEMA_VERSION = "2";

/** True if the on-disk cache schema matches the current code (else rebuild). */
export function indexSchemaCurrent(): boolean {
  try {
    const cols = getDb()
      .prepare("PRAGMA table_info(entries)")
      .all() as { name: string }[];
    const names = new Set(cols.map((c) => c.name));
    const hasV2Cols = names.has("kind") && names.has("score") && names.has("stage");
    return hasV2Cols && getMeta("schema_version") === INDEX_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(cacheDir(), { recursive: true });
  db = new Database(indexDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA_SQL);
  return db;
}

/** Close and (optionally) delete the DB file — used by reindex/tests. */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDbFile(): void {
  closeDb();
  const p = indexDbPath();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(p + suffix);
    } catch {
      /* ignore missing */
    }
  }
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export { path };
