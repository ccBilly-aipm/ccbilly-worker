import { describe, it, expect } from "vitest";
import {
  parseWikiLinks,
  extractLinkTargets,
  unwrapWikiLink,
} from "../../src/lib/markdown/wikilink";

describe("wikilink parsing", () => {
  it("parses simple and aliased links", () => {
    const links = parseWikiLinks("见 [[目标A]] 和 [[目标B|别名]]。");
    expect(links).toHaveLength(2);
    expect(links[0].target).toBe("目标A");
    expect(links[1].target).toBe("目标B");
    expect(links[1].alias).toBe("别名");
  });

  it("dedupes targets", () => {
    const targets = extractLinkTargets("[[A]] [[A]] [[B]]");
    expect(targets.sort()).toEqual(["A", "B"]);
  });

  it("unwraps a frontmatter wikilink value", () => {
    expect(unwrapWikiLink("[[开源项目接入]]")).toBe("开源项目接入");
    expect(unwrapWikiLink("普通字符串")).toBe("普通字符串");
    expect(unwrapWikiLink(null)).toBeNull();
  });
});
