import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * S2-1 data-layer boundary tests. Malformed / edge-case .md files must degrade
 * into the "broken" (待修复) list, never crash the reader. A valid file that just
 * has a UTF-8 BOM (Windows editors) must still parse correctly. See HANDBOOK §7.
 */
let vault: string;
let cache: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-bnd-"));
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-bndc-"));
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

function writeTask(name: string, content: string) {
  fs.writeFileSync(path.join(vault, "tasks", name), content);
}

async function read(name: string) {
  const { readEntry } = await import("../../src/lib/vault/repo");
  return readEntry(path.join(vault, "tasks", name), "task");
}

const VALID = `---
id: task-1
type: task
title: 有效任务
status: todo
priority: P2
progress: 0
created: '2026-07-10T00:00:00+08:00'
updated: '2026-07-10T00:00:00+08:00'
---
正文
`;

describe("malformed files degrade to broken, never crash", () => {
  it("empty file → broken (missing required fields), no throw", async () => {
    writeTask("empty.md", "");
    const r = await read("empty.md");
    expect(r.broken).toBeTruthy();
    expect(r.entry).toBeUndefined();
  });

  it("frontmatter only, no body → parses (body empty) if schema valid", async () => {
    writeTask("fm-only.md", VALID.split("---\n")[0] + "---\n");
    // reconstruct a valid frontmatter-only doc
    writeTask(
      "fm-only.md",
      `---\nid: t\ntype: task\ntitle: 无正文\nstatus: todo\npriority: P1\nprogress: 0\ncreated: '2026-07-10T00:00:00+08:00'\nupdated: '2026-07-10T00:00:00+08:00'\n---\n`,
    );
    const r = await read("fm-only.md");
    expect(r.entry, JSON.stringify(r.broken)).toBeTruthy();
    expect(r.entry?.content.trim()).toBe("");
  });

  it("invalid YAML frontmatter → broken, no throw", async () => {
    writeTask("bad-yaml.md", `---\ntitle: "unterminated\n  : : :\n---\nbody`);
    const r = await read("bad-yaml.md");
    expect(r.broken).toBeTruthy();
    expect(r.broken?.error).toMatch(/frontmatter|解析/);
  });

  it("huge file (>1MB) still classified without crashing", async () => {
    const big = VALID + "\n" + "x".repeat(1_100_000);
    writeTask("huge.md", big);
    const r = await read("huge.md");
    // valid frontmatter → entry; the point is it doesn't throw / hang
    expect(r.entry || r.broken).toBeTruthy();
  });

  it("filename with spaces and Chinese is handled", async () => {
    writeTask("我的 任务 note.md", VALID);
    const r = await read("我的 任务 note.md");
    expect(r.entry, JSON.stringify(r.broken)).toBeTruthy();
    expect(r.entry?.slug).toBe("我的 任务 note");
  });
});

describe("UTF-8 BOM must not break a valid file", () => {
  it("a valid file prefixed with a BOM still parses to an entry", async () => {
    writeTask("bom.md", "﻿" + VALID);
    const r = await read("bom.md");
    expect(r.entry, `BOM broke parsing: ${JSON.stringify(r.broken)}`).toBeTruthy();
    expect(r.entry?.data.title).toBe("有效任务");
  });
});
