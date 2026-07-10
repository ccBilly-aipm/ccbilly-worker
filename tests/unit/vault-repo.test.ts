import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { atomicWriteFile, readFileUtf8 } from "../../src/lib/vault/atomic";

/**
 * The vault repo reads config paths at call time via process.env, so we point
 * CCBILLY_VAULT_DIR at a throwaway temp dir per test (never touches real vault).
 */
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-vault-"));
  process.env.CCBILLY_VAULT_DIR = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
});

describe("atomic write", () => {
  it("writes then reads back identical content", async () => {
    const f = path.join(tmp, "tasks", "a.md");
    await atomicWriteFile(f, "hello 世界");
    expect(await readFileUtf8(f)).toBe("hello 世界");
  });

  it("leaves no temp files behind", async () => {
    const f = path.join(tmp, "tasks", "b.md");
    await atomicWriteFile(f, "x");
    const files = fs.readdirSync(path.join(tmp, "tasks"));
    expect(files.some((n) => n.includes(".tmp-"))).toBe(false);
    expect(files).toContain("b.md");
  });

  it("overwrites atomically (no partial state on second write)", async () => {
    const f = path.join(tmp, "c.md");
    await atomicWriteFile(f, "first");
    await atomicWriteFile(f, "second-longer-content");
    expect(await readFileUtf8(f)).toBe("second-longer-content");
  });
});

describe("vault repo read/write via temp vault", () => {
  it("writes a task, reads it back, routes bad files to broken", async () => {
    // dynamic import so config reads the env set in beforeEach
    const { writeEntry, scanType } = await import("../../src/lib/vault/repo");
    await writeEntry({
      type: "task",
      filePath: path.join(tmp, "tasks", "20260710-x.md"),
      data: {
        id: "task-x",
        type: "task",
        title: "读写测试",
        status: "doing",
        priority: "P1",
        progress: 20,
        created: "2026-07-10T10:00:00+09:00",
        updated: "2026-07-10T10:00:00+09:00",
        keepme: "unknown-field",
      },
      content: "正文\n\n## 动态\n- 2026-07-10 10:00 · 创建任务",
    });

    // a deliberately broken file (bad status)
    fs.writeFileSync(
      path.join(tmp, "tasks", "broken.md"),
      `---\nid: bad\ntype: task\ntitle: 坏\nstatus: WRONG\ncreated: 2026-07-10T10:00:00+09:00\nupdated: 2026-07-10T10:00:00+09:00\n---\nbody`,
    );

    const { entries, broken } = await scanType("task");
    expect(entries).toHaveLength(1);
    expect(entries[0].data.title).toBe("读写测试");
    // unknown field preserved through the read path
    expect((entries[0].data as Record<string, unknown>).keepme).toBe(
      "unknown-field",
    );
    expect(broken).toHaveLength(1);
    expect(broken[0].error).toContain("status");
  });
});
