import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { vaultDir } from "@/lib/config";
import { applyChanges } from "@/lib/index/indexer";

/**
 * Watches vault/ for external changes (e.g. Obsidian edits, a `git pull` landing
 * hundreds of files) and keeps the index in sync within seconds (spec §2).
 *
 * S2-2 change-storm throttling: individual events are accumulated into pending
 * sets and flushed together after a debounce window, in ONE batched transaction
 * (applyChanges). A concurrency lock ensures only one flush runs at a time; any
 * events that arrive mid-flush are captured and flushed in the next cycle. This
 * turns a 500-file burst into a couple of batch commits instead of 500.
 */

let watcher: FSWatcher | null = null;

const pendingChanged = new Set<string>();
const pendingRemoved = new Set<string>();
let flushTimer: NodeJS.Timeout | null = null;
let flushing = false;

const DEBOUNCE_MS = 250;

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  flushTimer = null;
  // concurrency lock: if a flush is in-flight, retry shortly (pending sets keep
  // accumulating in the meantime and are drained on the next cycle).
  if (flushing) {
    scheduleFlush();
    return;
  }
  if (pendingChanged.size === 0 && pendingRemoved.size === 0) return;

  flushing = true;
  // snapshot + clear so new events during the flush queue for the next cycle
  const changed = [...pendingChanged];
  const removed = [...pendingRemoved];
  pendingChanged.clear();
  pendingRemoved.clear();

  try {
    await applyChanges(changed, removed);
  } catch {
    // on failure, requeue so we don't silently drop updates
    for (const p of changed) pendingChanged.add(p);
    for (const p of removed) pendingRemoved.add(p);
  } finally {
    flushing = false;
    // if more work accumulated (either requeued or arrived mid-flush), run again
    if (pendingChanged.size > 0 || pendingRemoved.size > 0) scheduleFlush();
  }
}

function isMarkdown(p: string): boolean {
  return p.endsWith(".md") && !path.basename(p).startsWith(".");
}

/** Exposed for tests: force a synchronous-ish flush of pending changes. */
export async function flushPending(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}

export function startWatcher(): FSWatcher {
  if (watcher) return watcher;
  const dir = vaultDir();
  // Some filesystems don't deliver native inotify/FSEvents reliably (CI runners,
  // overlayfs/tmpfs containers, network mounts). Fall back to polling there. Opt
  // in via CHOKIDAR_USEPOLLING=1, and default it on under CI.
  const usePolling =
    process.env.CHOKIDAR_USEPOLLING === "1" || process.env.CI === "true";
  watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    usePolling,
    interval: usePolling ? 300 : undefined,
    ignored: (p) => {
      const base = path.basename(p);
      return (
        base.startsWith(".") &&
        (base === ".obsidian" || base === ".trash" || base.includes(".tmp-"))
      );
    },
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher
    .on("add", (p) => {
      if (isMarkdown(p)) {
        pendingRemoved.delete(p);
        pendingChanged.add(p);
        scheduleFlush();
      }
    })
    .on("change", (p) => {
      if (isMarkdown(p)) {
        pendingRemoved.delete(p);
        pendingChanged.add(p);
        scheduleFlush();
      }
    })
    .on("unlink", (p) => {
      if (p.endsWith(".md")) {
        pendingChanged.delete(p);
        pendingRemoved.add(p);
        scheduleFlush();
      }
    });

  return watcher;
}

export async function stopWatcher(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingChanged.clear();
  pendingRemoved.clear();
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
