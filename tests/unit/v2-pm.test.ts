import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractActionItems, PM_TEMPLATES } from "../../src/lib/pm/templates";

/**
 * V2-M2 PM module pack: RICE ordering (covered in v2-schema), burndown math,
 * requirement stage moves, decision review-due, and meeting-notes action-item
 * extraction. See blueprint B3.
 */

describe("extractActionItems (meeting notes → tasks, B3.5)", () => {
  it("extracts unchecked checklist lines, ignores checked and prose", () => {
    const md = [
      "# 纪要",
      "## 行动项",
      "- [ ] @张三 跟进接口联调",
      "- [x] 已完成的不算",
      "- [ ] @李四 写 PRD",
      "普通文字 - [ ] 不在列表里也不算行内",
      "* [ ] 星号列表也支持",
    ].join("\n");
    expect(extractActionItems(md)).toEqual([
      "@张三 跟进接口联调",
      "@李四 写 PRD",
      "星号列表也支持",
    ]);
  });
  it("returns [] when there are no action items", () => {
    expect(extractActionItems("# 只有标题\n\n一些正文")).toEqual([]);
  });
  it("meeting template contains extractable action items", () => {
    const meeting = PM_TEMPLATES.find((t) => t.id === "meeting")!;
    expect(extractActionItems(meeting.body).length).toBeGreaterThanOrEqual(2);
  });
});

describe("PM services over a temp vault", () => {
  let vault: string;
  let cache: string;
  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-pm-"));
    cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-pmc-"));
    process.env.CCBILLY_VAULT_DIR = vault;
    process.env.CCBILLY_CACHE_DIR = cache;
    fs.mkdirSync(path.join(vault, "tasks"), { recursive: true });
    fs.mkdirSync(path.join(vault, "collections"), { recursive: true });
  });
  afterEach(async () => {
    const { closeDb } = await import("../../src/lib/index/db");
    closeDb();
    fs.rmSync(vault, { recursive: true, force: true });
    fs.rmSync(cache, { recursive: true, force: true });
    delete process.env.CCBILLY_VAULT_DIR;
    delete process.env.CCBILLY_CACHE_DIR;
  });

  it("requirement stage move updates the index", async () => {
    const { createTask } = await import("../../src/lib/vault/task-service");
    const { updateStage } = await import("../../src/lib/pm/requirement-service");
    const { getBySlug } = await import("../../src/lib/index/queries");
    const req = await createTask({
      title: "需求 X",
      kind: "requirement",
      stage: "inbox",
      rice: { reach: 10, impact: 2, confidence: 1, effort: 1 },
    });
    await updateStage(req.slug, "pool");
    expect(getBySlug("task", req.slug)!.data.stage).toBe("pool");
  });

  it("rejects an invalid requirement stage", async () => {
    const { createTask } = await import("../../src/lib/vault/task-service");
    const { updateStage } = await import("../../src/lib/pm/requirement-service");
    const req = await createTask({ title: "需求 Y", kind: "requirement", stage: "inbox" });
    await expect(updateStage(req.slug, "nonsense")).rejects.toThrow();
  });

  it("burndown: remaining decreases as tasks complete; ideal is monotone", async () => {
    const { writeEntry } = await import("../../src/lib/vault/repo");
    // a collection with a 3-day cycle
    await writeEntry({
      type: "collection",
      filePath: path.join(vault, "collections", "Sprint.md"),
      data: {
        id: "col-sprint",
        type: "collection",
        title: "Sprint",
        status: "active",
        cycle: { start: "2026-01-01", end: "2026-01-03" },
        created: "2026-01-01T00:00:00+08:00",
        updated: "2026-01-01T00:00:00+08:00",
      },
      content: "sprint\n",
    });
    // two tasks in it, one done on day 2
    await writeEntry({
      type: "task",
      filePath: path.join(vault, "tasks", "a.md"),
      data: {
        id: "t-a", type: "task", title: "A", status: "done",
        collection: "[[Sprint]]", priority: "P2", progress: 100,
        created: "2026-01-01T00:00:00+08:00", updated: "2026-01-02T00:00:00+08:00",
      },
      content: "a\n",
    });
    await writeEntry({
      type: "task",
      filePath: path.join(vault, "tasks", "b.md"),
      data: {
        id: "t-b", type: "task", title: "B", status: "todo",
        collection: "[[Sprint]]", priority: "P2", progress: 0,
        created: "2026-01-01T00:00:00+08:00", updated: "2026-01-01T00:00:00+08:00",
      },
      content: "b\n",
    });
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await rebuildIndex();
    const { cyclesWithBurndown } = await import("../../src/lib/pm/burndown");
    const [c] = cyclesWithBurndown();
    expect(c.total).toBe(2);
    expect(c.points.length).toBe(3); // 3 days
    // day1: both open (2); day2: A done → 1 remaining; day3: still 1
    expect(c.points[0].remaining).toBe(2);
    expect(c.points[1].remaining).toBe(1);
    // ideal goes total→0 across the span
    expect(c.points[0].ideal).toBe(2);
    expect(c.points[c.points.length - 1].ideal).toBe(0);
  });

  it("decision review-due surfaces past-due open decisions", async () => {
    const { createDecision, decisionsDueForReview } = await import(
      "../../src/lib/pm/decision-service"
    );
    await createDecision("过期决策", "20260101-000000", "2000-01-01");
    await createDecision("未来决策", "20260101-000001", "2999-01-01");
    const due = decisionsDueForReview();
    expect(due.map((d) => d.title)).toContain("过期决策");
    expect(due.map((d) => d.title)).not.toContain("未来决策");
  });
});
