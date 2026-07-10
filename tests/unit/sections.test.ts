import { describe, it, expect } from "vitest";
import {
  splitSections,
  getSection,
  setSection,
  appendActivity,
  parseActivity,
  parseSubtasks,
  toggleSubtask,
} from "../../src/lib/markdown/sections";

const BODY = `任务描述。

## 子任务
- [ ] 第一项
- [x] 第二项

## 动态
- 2026-07-10 10:00 · 创建任务
- 2026-07-10 11:00 · 状态 todo → doing`;

describe("section splitting", () => {
  it("splits preamble and H2 sections in order", () => {
    const { preamble, order, sections } = splitSections(BODY);
    expect(preamble).toContain("任务描述");
    expect(order).toEqual(["子任务", "动态"]);
    expect(sections["动态"]).toContain("创建任务");
  });

  it("getSection returns empty for missing section", () => {
    expect(getSection(BODY, "不存在")).toBe("");
  });

  it("setSection creates a new section when absent", () => {
    const out = setSection(BODY, "资源", "- 链接");
    expect(getSection(out, "资源")).toBe("- 链接");
    // existing sections preserved
    expect(getSection(out, "动态")).toContain("创建任务");
  });
});

describe("activity log", () => {
  it("parses activity entries", () => {
    const entries = parseActivity(BODY);
    expect(entries).toHaveLength(2);
    expect(entries[1].text).toBe("状态 todo → doing");
  });

  it("appends a new activity line (spec §5 format)", () => {
    const out = appendActivity(BODY, "2026-07-10 12:00", "状态 doing → done");
    const entries = parseActivity(out);
    expect(entries).toHaveLength(3);
    expect(entries[2].text).toBe("状态 doing → done");
  });
});

describe("subtasks", () => {
  it("parses checkbox state", () => {
    const subs = parseSubtasks(BODY);
    expect(subs).toHaveLength(2);
    expect(subs[0].done).toBe(false);
    expect(subs[1].done).toBe(true);
  });

  it("toggles a subtask and writes back", () => {
    const out = toggleSubtask(BODY, 0, true);
    const subs = parseSubtasks(out);
    expect(subs[0].done).toBe(true);
    expect(subs[1].done).toBe(true); // untouched
  });
});
