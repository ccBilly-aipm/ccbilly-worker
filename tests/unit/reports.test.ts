import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { localDateKey } from "../../src/lib/utils/date";

/**
 * Report aggregation over a throwaway vault. Verifies 动态 classification,
 * incremental merge (no overwrite of handwritten content), and copy-md.
 */
let tmp: string;
let cacheTmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-rep-"));
  cacheTmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-repcache-"));
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

async function makeTaskWithActivity(title: string, lines: string[]) {
  const { createTask, updateTaskFields } = await import(
    "../../src/lib/vault/task-service"
  );
  const t = await createTask({ title });
  const body = `${title}\n\n## 动态\n${lines.join("\n")}`;
  return updateTaskFields(t.slug, { content: body });
}

describe("daily aggregation", () => {
  it("classifies 动态 into buckets by keyword", async () => {
    const { aggregateDaily } = await import("../../src/lib/reports/aggregate");
    const today = localDateKey();
    await makeTaskWithActivity("任务A", [
      `- ${today} 09:00 · 创建任务`,
      `- ${today} 10:00 · 状态 待办 → 进行中`,
      `- ${today} 11:00 · 进度 30 → 60`,
      `- ${today} 12:00 · 状态 进行中 → 完成`,
    ]);
    await makeTaskWithActivity("任务B", [
      `- ${today} 13:00 · 状态 进行中 → 受阻 · 等待接口`,
    ]);

    const agg = aggregateDaily(today);
    expect(agg.byBucket["新建"].length).toBe(1);
    expect(agg.byBucket["完成"].length).toBe(1);
    expect(agg.byBucket["受阻"].length).toBe(1);
    // progress bump + status→doing = 推进
    expect(agg.byBucket["推进"].length).toBe(2);
  });

  it("only includes entries on the requested date", async () => {
    const { aggregateDaily } = await import("../../src/lib/reports/aggregate");
    const today = localDateKey();
    await makeTaskWithActivity("跨日任务", [
      `- 2020-01-01 09:00 · 创建任务`,
      `- ${today} 10:00 · 状态 待办 → 进行中`,
    ]);
    const agg = aggregateDaily(today);
    expect(agg.items).toHaveLength(1);
    expect(agg.items[0].bucket).toBe("推进");
  });
});

describe("daily report generate + incremental merge", () => {
  it("generates a draft with the fixed 5 sections", async () => {
    const { generateDaily } = await import("../../src/lib/reports/report-service");
    const today = localDateKey();
    await makeTaskWithActivity("任务C", [`- ${today} 09:00 · 创建任务`]);
    const report = await generateDaily(today);
    expect(report.data.status).toBe("draft");
    for (const h of ["今日完成", "进行中", "遇到的问题", "明日计划", "随想"]) {
      expect(report.content).toContain(`## ${h}`);
    }
  });

  it("re-aggregate merges new items without overwriting handwritten text", async () => {
    const { generateDaily, reaggregateDaily, saveDailyBody } = await import(
      "../../src/lib/reports/report-service"
    );
    const { getSection } = await import("../../src/lib/markdown/sections");
    const today = localDateKey();
    await makeTaskWithActivity("任务D", [`- ${today} 09:00 · 创建任务`]);
    await generateDaily(today);

    // user writes a personal reflection
    const edited = await saveDailyBody(
      today,
      `## 今日完成\n- （无）\n\n## 进行中\n- 手写的一条\n\n## 遇到的问题\n- （无）\n\n## 明日计划\n- \n\n## 随想\n- 今天状态不错`,
    );
    expect(getSection(edited.content, "随想")).toContain("今天状态不错");

    // a new task completion happens, then re-aggregate
    await makeTaskWithActivity("任务E", [
      `- ${today} 14:00 · 状态 进行中 → 完成`,
    ]);
    const merged = await reaggregateDaily(today);
    // handwritten reflection survives
    expect(getSection(merged.content, "随想")).toContain("今天状态不错");
    expect(getSection(merged.content, "进行中")).toContain("手写的一条");
    // new completion merged into 今日完成
    expect(getSection(merged.content, "今日完成")).toContain("任务E");
  });

  it("finalize flips status to final", async () => {
    const { generateDaily, finalizeDaily } = await import(
      "../../src/lib/reports/report-service"
    );
    const today = localDateKey();
    await makeTaskWithActivity("任务F", [`- ${today} 09:00 · 创建任务`]);
    await generateDaily(today);
    const done = await finalizeDaily(today);
    expect(done.data.status).toBe("final");
  });
});

describe("copy-as-markdown", () => {
  it("produces a titled pure-markdown string", async () => {
    const { dailyToMarkdown, weeklyToMarkdown } = await import(
      "../../src/lib/reports/export"
    );
    const md = dailyToMarkdown("2026-07-10", "## 今日完成\n- 做了 A");
    expect(md).toMatch(/^# 2026-07-10 日报/);
    expect(md).not.toContain("<");
    const wk = weeklyToMarkdown("2026-W28", "2026-07-06 ~ 2026-07-12", "## 本周速览\n- x");
    expect(wk).toContain("# 2026-W28 周报（2026-07-06 ~ 2026-07-12）");
  });
});

describe("weekly aggregation", () => {
  it("counts completed/created across the week and computes collection share", async () => {
    const { aggregateWeekly } = await import("../../src/lib/reports/aggregate");
    const { createTask, updateTaskStatus } = await import(
      "../../src/lib/vault/task-service"
    );
    const today = localDateKey();
    const a = await createTask({ title: "周任务1", collection: "合集X" });
    await updateTaskStatus(a.slug, "done"); // logs a 完成 today
    await createTask({ title: "周任务2", collection: "合集X" });

    const stats = aggregateWeekly([today]);
    expect(stats.completedCount).toBeGreaterThanOrEqual(1);
    expect(stats.collectionShare.some((s) => s.collection === "合集X")).toBe(true);
  });
});
