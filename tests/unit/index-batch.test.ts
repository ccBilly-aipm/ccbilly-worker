import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * S2-2: batch incremental indexing coalesces a change storm (e.g. git pull of
 * hundreds of files) into a single transaction. Correctness under batch +
 * mixed changed/removed. See watcher.ts / applyChanges.
 */
let vault: string;
let cache: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-batch-"));
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-batchc-"));
  process.env.CCBILLY_VAULT_DIR = vault;
  process.env.CCBILLY_CACHE_DIR = cache;
  fs.mkdirSync(path.join(vault, "tasks"), { recursive: true });
});

afterEach(async () => {
  const { closeDb } = await import("../../src/lib/index/db");
  closeDb();
  fs.rmSync(vault, { recursive: true, force: true });
  fs.rmSync(cache, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
  delete process.env.CCBILLY_CACHE_DIR;
});

function taskDoc(i: number, status = "todo") {
  return `---
id: task-${i}
type: task
title: 批量任务 ${i}
status: ${status}
priority: P2
progress: 0
created: '2026-07-10T00:00:00+08:00'
updated: '2026-07-10T00:00:00+08:00'
---
body ${i}
`;
}

function writeTasks(n: number): string[] {
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = path.join(vault, "tasks", `t-${i}.md`);
    fs.writeFileSync(p, taskDoc(i));
    paths.push(p);
  }
  return paths;
}

describe("applyChanges — batch storm", () => {
  it("indexes a 500-file storm in one call, all queryable", async () => {
    const paths = writeTasks(500);
    const { applyChanges } = await import("../../src/lib/index/indexer");
    const res = await applyChanges(paths, []);
    expect(res.indexed).toBe(500);
    expect(res.broken).toBe(0);

    const { listByType } = await import("../../src/lib/index/queries");
    const tasks = listByType("task");
    expect(tasks.length).toBe(500);
  });

  it("handles mixed changed + removed atomically", async () => {
    const paths = writeTasks(10);
    const { applyChanges } = await import("../../src/lib/index/indexer");
    await applyChanges(paths, []);

    // remove 3, change 2 (rewrite with new status)
    const removed = paths.slice(0, 3);
    for (const p of removed) fs.rmSync(p);
    fs.writeFileSync(paths[5], taskDoc(5, "done"));
    fs.writeFileSync(paths[6], taskDoc(6, "done"));

    const res = await applyChanges([paths[5], paths[6]], removed);
    expect(res.removed).toBe(3);
    expect(res.indexed).toBe(2);

    const { listByType } = await import("../../src/lib/index/queries");
    const all = listByType("task");
    expect(all.length).toBe(7); // 10 - 3 removed
    const done = all.filter((t) => (t.data as { status?: string }).status === "done");
    expect(done.length).toBe(2);
  });

  it("routes malformed files in a batch to broken without failing the batch", async () => {
    const good = writeTasks(3);
    const badPath = path.join(vault, "tasks", "bad.md");
    fs.writeFileSync(badPath, `---\n: : bad yaml :\n---\nx`);
    const { applyChanges } = await import("../../src/lib/index/indexer");
    const res = await applyChanges([...good, badPath], []);
    expect(res.indexed).toBe(3);
    expect(res.broken).toBe(1);
  });
});
