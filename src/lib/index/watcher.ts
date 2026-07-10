import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { vaultDir } from "@/lib/config";
import { indexFile, unindexFile } from "@/lib/index/indexer";

/**
 * Watches vault/ for external changes (e.g. Obsidian edits) and keeps the index
 * in sync within seconds (spec §2 / acceptance criterion). Debounced per-file so
 * a burst of writes coalesces. Ignores dotfiles (.obsidian, .trash) and the
 * temp files atomic writes create.
 */

let watcher: FSWatcher | null = null;
const timers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 250;

function schedule(fn: () => void, key: string): void {
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void fn();
    }, DEBOUNCE_MS),
  );
}

function isMarkdown(p: string): boolean {
  return p.endsWith(".md") && !path.basename(p).startsWith(".");
}

export function startWatcher(): FSWatcher {
  if (watcher) return watcher;
  const dir = vaultDir();
  watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    ignored: (p) => {
      const base = path.basename(p);
      // ignore dot-dirs/files and atomic temp files
      return (
        base.startsWith(".") &&
        (base === ".obsidian" || base === ".trash" || base.includes(".tmp-"))
      );
    },
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher
    .on("add", (p) => {
      if (isMarkdown(p)) schedule(() => indexFile(p), p);
    })
    .on("change", (p) => {
      if (isMarkdown(p)) schedule(() => indexFile(p), p);
    })
    .on("unlink", (p) => {
      if (p.endsWith(".md")) schedule(() => unindexFile(p), p);
    });

  return watcher;
}

export async function stopWatcher(): Promise<void> {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
