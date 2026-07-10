import type { EntryType } from "@/lib/schema";

/** A successfully-parsed vault entry, ready for the app. */
export interface VaultEntry<T = Record<string, unknown>> {
  /** absolute file path */
  filePath: string;
  /** basename without .md */
  slug: string;
  type: EntryType;
  data: T;
  content: string; // body (markdown, no frontmatter)
  mtimeMs: number;
}

/** A file that failed schema validation — routed to the repair list (ADR-005). */
export interface BrokenEntry {
  filePath: string;
  slug: string;
  type: EntryType | "unknown";
  error: string;
  mtimeMs: number;
}

export interface ScanResult {
  entries: VaultEntry[];
  broken: BrokenEntry[];
}
