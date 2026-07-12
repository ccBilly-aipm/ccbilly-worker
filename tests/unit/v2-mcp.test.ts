import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * V2-M5 MCP tools: read/write round-trip for each tool, plus the AUTH_MODE=
 * passcode write constraint (ADR-023). Tools are plain async functions, so we
 * test them directly (the stdio transport is exercised manually; see MCP.md).
 */
let vault: string;
let cache: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-mcp-"));
  cache = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-mcpc-"));
  process.env.CCBILLY_VAULT_DIR = vault;
  process.env.CCBILLY_CACHE_DIR = cache;
  process.env.CCBILLY_NO_WATCH = "1";
  fs.mkdirSync(path.join(vault, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(vault, "reports", "daily"), { recursive: true });
  delete process.env.AUTH_MODE;
});
afterEach(async () => {
  const { closeDb } = await import("../../src/lib/index/db");
  closeDb();
  fs.rmSync(vault, { recursive: true, force: true });
  fs.rmSync(cache, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
  delete process.env.CCBILLY_CACHE_DIR;
  delete process.env.AUTH_MODE;
  delete process.env.ADMIN_PASSCODE;
});

async function tools() {
  return import("../../src/lib/mcp/tools");
}

describe("MCP tools — read/write round-trip (AUTH_MODE=none)", () => {
  it("create_task → list_tasks sees it", async () => {
    const t = await tools();
    const { slug } = await t.createTaskTool({ title: "MCP 任务", priority: "P1" });
    const list = await t.listTasks({});
    expect(list.find((x) => x.slug === slug)?.title).toBe("MCP 任务");
  });

  it("update_task changes status; append_activity logs a line", async () => {
    const t = await tools();
    const { slug } = await t.createTaskTool({ title: "T" });
    const upd = await t.updateTaskTool({ slug, status: "doing" });
    expect(upd.status).toBe("doing");
    const act = await t.appendActivityTool({ slug, text: "MCP 追加的动态" });
    expect(act.ok).toBe(true);
  });

  it("update_task rejects an invalid status", async () => {
    const t = await tools();
    const { slug } = await t.createTaskTool({ title: "T" });
    await expect(t.updateTaskTool({ slug, status: "nonsense" })).rejects.toThrow();
  });

  it("create_idea creates a content idea; get_stats counts it", async () => {
    const t = await tools();
    await t.createIdeaTool({ title: "选题 A", angle: "从 X 切入" });
    const stats = await t.getStatsTool();
    expect(stats.content).toBe(1);
  });

  it("generate_daily_draft returns a daily body with the fixed sections", async () => {
    const t = await tools();
    const { content } = await t.generateDailyDraftTool({ date: "2026-07-10" });
    expect(content).toContain("## 今日完成");
    expect(content).toContain("## 明日计划");
  });

  it("list_tasks filters by status and excludes requirements/content by default", async () => {
    const t = await tools();
    await t.createTaskTool({ title: "普通任务" });
    await t.createIdeaTool({ title: "内容选题" }); // kind=content
    const tasksOnly = await t.listTasks({});
    expect(tasksOnly.map((x) => x.title)).toContain("普通任务");
    expect(tasksOnly.map((x) => x.title)).not.toContain("内容选题");
  });
});

describe("MCP write auth constraint (AUTH_MODE=passcode)", () => {
  beforeEach(() => {
    process.env.AUTH_MODE = "passcode";
    process.env.ADMIN_PASSCODE = "s3cret";
  });

  it("rejects a write tool without a valid token", async () => {
    const t = await tools();
    await expect(t.createTaskTool({ title: "X" })).rejects.toThrow(/凭据/);
  });

  it("allows a write tool with the matching token", async () => {
    const t = await tools();
    const r = await t.createTaskTool({ title: "X", token: "s3cret" });
    expect(r.slug).toBeTruthy();
  });

  it("read tools work without a token even in passcode mode", async () => {
    const t = await tools();
    const stats = await t.getStatsTool();
    expect(stats).toHaveProperty("completionRate");
  });

  it("fail-closed when passcode mode but ADMIN_PASSCODE unset", async () => {
    delete process.env.ADMIN_PASSCODE;
    const t = await tools();
    await expect(t.createTaskTool({ title: "X", token: "" })).rejects.toThrow();
  });
});
