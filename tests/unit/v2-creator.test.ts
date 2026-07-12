import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { aggregateByPlatform, PLATFORMS } from "../../src/lib/creator/platforms";

/** V2-M3 creator helpers: platform checklist + metric aggregation. */

describe("platform definitions", () => {
  it("every platform def has a non-empty adaptation checklist", () => {
    for (const p of PLATFORMS) expect(p.checklist.length).toBeGreaterThan(0);
  });
});

describe("metric aggregation", () => {
  it("sums views/likes per platform across snapshots", () => {
    const rows = [
      { date: "2026-01-01", platform: "公众号", views: 100, likes: 10, comments: 0, shares: 0, followers_gained: 0 },
      { date: "2026-01-02", platform: "公众号", views: 50, likes: 5, comments: 0, shares: 0, followers_gained: 0 },
      { date: "2026-01-01", platform: "小红书", views: 200, likes: 30, comments: 0, shares: 0, followers_gained: 0 },
    ];
    const agg = aggregateByPlatform(rows);
    const wx = agg.find((a) => a.platform === "公众号")!;
    expect(wx.views).toBe(150);
    expect(wx.likes).toBe(15);
    const xhs = agg.find((a) => a.platform === "小红书")!;
    expect(xhs.views).toBe(200);
  });
});

describe("content creation via createTask (kind=content)", () => {
  let vault: string;
  let cache: string;
  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-cr-"));
    cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-crc-"));
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

  it("creates a content idea that lists under listContent('idea')", async () => {
    const { createTask } = await import("../../src/lib/vault/task-service");
    const { listContent } = await import("../../src/lib/index/queries");
    await createTask({ title: "选题 A", kind: "content", stage: "idea" });
    const ideas = listContent("idea");
    expect(ideas.map((c) => c.data.title)).toContain("选题 A");
  });
});
