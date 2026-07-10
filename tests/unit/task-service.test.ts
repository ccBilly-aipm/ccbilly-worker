import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Task service integration test over a throwaway vault + cache. Verifies the
 * core M2 invariant: mutations write .md, append 动态 log, and reindex.
 */
let tmp: string;
let cacheTmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-tasks-"));
  cacheTmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-cache-"));
  process.env.CCBILLY_VAULT_DIR = tmp;
  process.env.CCBILLY_CACHE_DIR = cacheTmp;
});

afterEach(async () => {
  const { closeDb } = await import("../../src/lib/index/db");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(cacheTmp, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
  delete process.env.CCBILLY_CACHE_DIR;
});

describe("task service", () => {
  it("creates a task with a 动态 creation entry", async () => {
    const { createTask } = await import("../../src/lib/vault/task-service");
    const { parseActivity } = await import("../../src/lib/markdown/sections");
    const t = await createTask({ title: "写测试", priority: "P1" });
    expect(t.data.title).toBe("写测试");
    expect(t.data.status).toBe("todo");
    const acts = parseActivity(t.content);
    expect(acts.some((a) => a.text.includes("创建任务"))).toBe(true);
  });

  it("status change appends a 状态 X → Y activity line and snaps done→100", async () => {
    const { createTask, updateTaskStatus } = await import(
      "../../src/lib/vault/task-service"
    );
    const { parseActivity } = await import("../../src/lib/markdown/sections");
    const created = await createTask({ title: "拖拽演示" });
    const updated = await updateTaskStatus(created.slug, "doing");
    expect(updated.data.status).toBe("doing");
    let acts = parseActivity(updated.content);
    expect(acts.some((a) => a.text.includes("→ 进行中"))).toBe(true);

    const done = await updateTaskStatus(created.slug, "done");
    expect(done.data.status).toBe("done");
    expect(done.data.progress).toBe(100);
    acts = parseActivity(done.content);
    expect(acts.some((a) => a.text.includes("→ 完成"))).toBe(true);
  });

  it("progress change logs and clamps", async () => {
    const { createTask, updateTaskProgress } = await import(
      "../../src/lib/vault/task-service"
    );
    const { parseActivity } = await import("../../src/lib/markdown/sections");
    const t = await createTask({ title: "进度演示" });
    const u = await updateTaskProgress(t.slug, 250); // clamp to 100
    expect(u.data.progress).toBe(100);
    const acts = parseActivity(u.content);
    expect(acts.some((a) => a.text.includes("进度 0 → 100"))).toBe(true);
  });

  it("toggling subtasks derives progress from checklist", async () => {
    const { createTask, updateTaskFields, toggleTaskSubtask } = await import(
      "../../src/lib/vault/task-service"
    );
    const created = await createTask({ title: "子任务演示" });
    // give it two subtasks
    const withSubs = await updateTaskFields(created.slug, {
      content:
        "描述\n\n## 子任务\n- [ ] A\n- [ ] B\n\n## 动态\n- 2026-07-10 10:00 · 创建任务",
    });
    const afterOne = await toggleTaskSubtask(withSubs.slug, 0, true);
    expect(afterOne.data.progress).toBe(50); // 1 of 2
  });

  it("re-indexes so queries see the mutation", async () => {
    const { createTask, updateTaskStatus } = await import(
      "../../src/lib/vault/task-service"
    );
    const { getBySlug } = await import("../../src/lib/index/queries");
    const t = await createTask({ title: "索引一致性" });
    await updateTaskStatus(t.slug, "blocked");
    const fromIndex = getBySlug("task", t.slug);
    expect(fromIndex?.data.status).toBe("blocked");
  });
});

describe("collection service", () => {
  it("computes progress from member tasks", async () => {
    const { createCollection, getCollectionWithTasks } = await import(
      "../../src/lib/vault/collection-service"
    );
    const { createTask, updateTaskStatus } = await import(
      "../../src/lib/vault/task-service"
    );
    const col = await createCollection({ title: "演示合集" });
    await createTask({ title: "任务1", collection: "演示合集" });
    const t2 = await createTask({ title: "任务2", collection: "演示合集" });
    await updateTaskStatus(t2.slug, "done");
    const data = getCollectionWithTasks(col.slug);
    expect(data?.stats.taskCount).toBe(2);
    expect(data?.stats.doneCount).toBe(1);
    // one done (100) + one todo (0) => 50
    expect(data?.stats.progress).toBe(50);
  });
});
