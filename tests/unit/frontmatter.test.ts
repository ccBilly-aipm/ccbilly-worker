import { describe, it, expect } from "vitest";
import { parseDoc, stringifyDoc } from "../../src/lib/markdown/frontmatter";
import { TaskFrontmatter } from "../../src/lib/schema";

describe("frontmatter round-trip", () => {
  it("parses frontmatter and body", () => {
    const raw = `---\nid: task-1\ntype: task\ntitle: 测试\n---\n正文内容\n`;
    const { data, content } = parseDoc(raw);
    expect(data.id).toBe("task-1");
    expect(content.trim()).toBe("正文内容");
  });

  it("preserves unknown frontmatter fields on write-back (spec §5)", () => {
    const raw = `---\nid: task-1\ntype: task\ntitle: 测试\nstatus: doing\npriority: P1\nprogress: 30\ncreated: 2026-07-10T10:00:00+09:00\nupdated: 2026-07-10T10:00:00+09:00\ncustomField: 保留我\nallowedTools: [Read, Write]\n---\n正文\n`;
    const { data, content } = parseDoc(raw);
    // validate through the schema (passthrough keeps unknown fields)
    const validated = TaskFrontmatter.parse(data);
    expect((validated as Record<string, unknown>).customField).toBe("保留我");
    const out = stringifyDoc(validated as Record<string, unknown>, content);
    expect(out).toContain("customField: 保留我");
    expect(out).toContain("allowedTools");
  });

  it("does not throw on missing frontmatter", () => {
    const { data, content } = parseDoc("just a body, no frontmatter");
    expect(data).toEqual({});
    expect(content).toContain("just a body");
  });
});

describe("task schema validation", () => {
  const base = {
    id: "task-1",
    type: "task",
    title: "t",
    created: "2026-07-10T10:00:00+09:00",
    updated: "2026-07-10T10:00:00+09:00",
  };

  it("applies defaults", () => {
    const t = TaskFrontmatter.parse(base);
    expect(t.status).toBe("todo");
    expect(t.priority).toBe("P2");
    expect(t.progress).toBe(0);
    expect(t.tags).toEqual([]);
  });

  it("rejects invalid status", () => {
    const r = TaskFrontmatter.safeParse({ ...base, status: "nonsense" });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range progress", () => {
    const r = TaskFrontmatter.safeParse({ ...base, progress: 150 });
    expect(r.success).toBe(false);
  });
});
