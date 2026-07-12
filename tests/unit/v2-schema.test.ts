import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { riceScore } from "../../src/lib/pm/rice";
import { TaskFrontmatter, CollectionFrontmatter } from "../../src/lib/schema";

/**
 * V2-M1a: schema extension (kind/rice/stage/platforms/metrics/cycle) must be
 * backward compatible — old task/collection files without V2 fields stay valid —
 * and the index must expose kind/score/stage for filtering. See ADR-019.
 */

describe("riceScore", () => {
  it("computes (reach*impact*confidence)/effort, rounded to 1dp", () => {
    expect(riceScore({ reach: 100, impact: 2, confidence: 0.8, effort: 4 })).toBe(40);
    expect(riceScore({ reach: 10, impact: 3, confidence: 1, effort: 2 })).toBe(15);
  });
  it("guards effort against zero", () => {
    expect(riceScore({ reach: 10, impact: 1, confidence: 1, effort: 0 })).toBe(100);
  });
  it("returns 0 for missing rice", () => {
    expect(riceScore(null)).toBe(0);
    expect(riceScore(undefined)).toBe(0);
  });
});

describe("schema backward compatibility", () => {
  it("an old task without kind/V2 fields still validates", () => {
    const r = TaskFrontmatter.safeParse({
      id: "task-1",
      type: "task",
      title: "旧任务",
      status: "todo",
      priority: "P2",
      created: "2026-01-01T00:00:00+08:00",
      updated: "2026-01-01T00:00:00+08:00",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.kind).toBeUndefined();
  });

  it("a requirement task validates with rice + stage", () => {
    const r = TaskFrontmatter.safeParse({
      id: "req-1",
      type: "task",
      kind: "requirement",
      title: "需求 A",
      stage: "pool",
      rice: { reach: 100, impact: 2, confidence: 0.8, effort: 4 },
      created: "2026-01-01T00:00:00+08:00",
      updated: "2026-01-01T00:00:00+08:00",
    });
    expect(r.success).toBe(true);
  });

  it("a content task validates with platforms + metrics", () => {
    const r = TaskFrontmatter.safeParse({
      id: "c-1",
      type: "task",
      kind: "content",
      title: "选题 A",
      stage: "idea",
      platforms: ["公众号", "小红书"],
      publish_date: "2026-02-01",
      metrics: [{ date: "2026-02-02", platform: "公众号", views: 1000, likes: 50 }],
      created: "2026-01-01T00:00:00+08:00",
      updated: "2026-01-01T00:00:00+08:00",
    });
    expect(r.success).toBe(true);
  });

  it("an old collection without cycle still validates; cycle is optional", () => {
    const old = CollectionFrontmatter.safeParse({
      id: "col-1",
      type: "collection",
      title: "合集",
      created: "2026-01-01T00:00:00+08:00",
      updated: "2026-01-01T00:00:00+08:00",
    });
    expect(old.success).toBe(true);
    const withCycle = CollectionFrontmatter.safeParse({
      id: "col-2",
      type: "collection",
      title: "周期合集",
      cycle: { start: "2026-01-01", end: "2026-01-14" },
      created: "2026-01-01T00:00:00+08:00",
      updated: "2026-01-01T00:00:00+08:00",
    });
    expect(withCycle.success).toBe(true);
  });
});

describe("indexer populates kind/score/stage columns", () => {
  let vault: string;
  let cache: string;
  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-v2idx-"));
    cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-v2idxc-"));
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

  function writeTask(name: string, fm: string) {
    fs.writeFileSync(path.join(vault, "tasks", name), `---\n${fm}\n---\nbody\n`);
  }

  it("indexes requirements ordered by RICE score, plain tasks separate", async () => {
    writeTask(
      "req-low.md",
      "id: r1\ntype: task\nkind: requirement\ntitle: 低分需求\nstage: pool\nrice: {reach: 10, impact: 1, confidence: 1, effort: 5}\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    writeTask(
      "req-high.md",
      "id: r2\ntype: task\nkind: requirement\ntitle: 高分需求\nstage: pool\nrice: {reach: 100, impact: 3, confidence: 1, effort: 2}\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    writeTask(
      "plain.md",
      "id: t1\ntype: task\ntitle: 普通任务\nstatus: todo\npriority: P2\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await rebuildIndex();
    const { listRequirements, listPlainTasks } = await import(
      "../../src/lib/index/queries"
    );
    const reqs = listRequirements();
    expect(reqs.map((r) => r.data.title)).toEqual(["高分需求", "低分需求"]);
    const plain = listPlainTasks();
    expect(plain.map((p) => p.data.title)).toEqual(["普通任务"]);
  });

  it("indexSchemaCurrent detects a fresh V2 cache as current after rebuild", async () => {
    writeTask(
      "t.md",
      "id: t\ntype: task\ntitle: T\nstatus: todo\npriority: P2\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    const { indexSchemaCurrent } = await import("../../src/lib/index/db");
    await rebuildIndex();
    expect(indexSchemaCurrent()).toBe(true);
  });

  it("indexes content items filterable by stage", async () => {
    writeTask(
      "c-idea.md",
      "id: c1\ntype: task\nkind: content\ntitle: 灵感\nstage: idea\nplatforms: [公众号]\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    writeTask(
      "c-pub.md",
      "id: c2\ntype: task\nkind: content\ntitle: 已发\nstage: published\nplatforms: [公众号, 小红书]\ncreated: '2026-01-01T00:00:00+08:00'\nupdated: '2026-01-01T00:00:00+08:00'",
    );
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await rebuildIndex();
    const { listContent } = await import("../../src/lib/index/queries");
    expect(listContent("idea").map((c) => c.data.title)).toEqual(["灵感"]);
    expect(listContent().length).toBe(2);
  });
});
