import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../src/lib/markdown/render";

/**
 * S1-1 adversarial XSS suite. renderMarkdown() output is injected via
 * dangerouslySetInnerHTML, so its HTML MUST be sanitized. Every payload here
 * represents a real vector that would execute JS in the app origin if it
 * survived into the DOM. See docs/SECURITY_AUDIT.md §S1-1.
 */

// Vectors that must NEVER appear (case-insensitive) in sanitized output.
const FORBIDDEN = [
  /<script/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
];

function assertClean(html: string) {
  for (const re of FORBIDDEN) {
    expect(html, `must not contain ${re}`).not.toMatch(re);
  }
}

describe("renderMarkdown — XSS sanitization (adversarial)", () => {
  it("strips <script> tags", () => {
    assertClean(renderMarkdown("hi <script>alert(1)</script> there"));
  });

  it("strips img onerror handler", () => {
    assertClean(renderMarkdown('![x](x) <img src=x onerror="alert(1)">'));
  });

  it("strips svg onload handler", () => {
    assertClean(renderMarkdown("<svg onload=alert(1)></svg>"));
  });

  it("neutralizes javascript: protocol links", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    assertClean(html);
  });

  it("neutralizes vbscript: protocol links", () => {
    assertClean(renderMarkdown("[click](vbscript:msgbox(1))"));
  });

  it("neutralizes data:text/html URIs", () => {
    assertClean(
      renderMarkdown("[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)"),
    );
  });

  it("strips event-handler attributes on arbitrary tags", () => {
    assertClean(renderMarkdown('<a href="#" onclick="steal()">x</a>'));
    assertClean(renderMarkdown('<div onmouseover="x()">hover</div>'));
  });

  it("strips iframe / object / embed injections", () => {
    assertClean(renderMarkdown('<iframe src="javascript:alert(1)"></iframe>'));
    assertClean(renderMarkdown('<object data="x"></object>'));
    assertClean(renderMarkdown('<embed src="x">'));
  });

  it("sanitizes payload smuggled through a frontmatter string value", () => {
    // Simulates a title/description frontmatter value that reaches the renderer.
    const frontmatterValue = '<img src=x onerror="fetch(`/api/skills`)">';
    assertClean(renderMarkdown(`# ${frontmatterValue}`));
  });

  it("sanitizes payload hidden inside a [[wikilink]] alias", () => {
    assertClean(renderMarkdown('[[note|<img src=x onerror=alert(1)>]]'));
  });
});

describe("renderMarkdown — legitimate content must still render (regression)", () => {
  it("renders [[wikilinks]] as internal anchor links", () => {
    const html = renderMarkdown("see [[俞军产品方法论]] now");
    expect(html).toMatch(/<a\s+href="\/knowledge\/[^"]+"/i);
    expect(html).toContain("俞军产品方法论");
  });

  it("renders [[wikilink|alias]] with alias text", () => {
    const html = renderMarkdown("[[target-note|显示名]]");
    expect(html).toContain("显示名");
    expect(html).toMatch(/href="\/knowledge\//);
  });

  it("preserves fenced code blocks", () => {
    const html = renderMarkdown("```ts\nconst x = 1;\n```");
    expect(html).toMatch(/<code/i);
    expect(html).toContain("const x = 1;");
  });

  it("preserves GFM tables", () => {
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toMatch(/<table/i);
    expect(html).toMatch(/<td/i);
  });

  it("preserves task checklists", () => {
    const html = renderMarkdown("- [ ] todo\n- [x] done");
    expect(html).toMatch(/type="checkbox"/i);
  });

  it("keeps safe http/https/mailto and relative links", () => {
    const http = renderMarkdown("[a](https://example.com)");
    expect(http).toMatch(/href="https:\/\/example\.com"/);
    const mail = renderMarkdown("[m](mailto:x@y.z)");
    expect(mail).toMatch(/href="mailto:x@y\.z"/);
    const rel = renderMarkdown("[r](/tasks)");
    expect(rel).toMatch(/href="\/tasks"/);
  });

  it("renders headings, emphasis and lists normally", () => {
    const html = renderMarkdown("## Title\n\n**bold** and *italic*\n\n- one\n- two");
    expect(html).toMatch(/<h2/i);
    expect(html).toMatch(/<strong/i);
    expect(html).toMatch(/<em/i);
    expect(html).toMatch(/<li/i);
  });
});

describe("renderMarkdown — mtime/content cache (S2-3)", () => {
  it("returns identical output on repeated identical input (cache hit)", () => {
    const md = "# Cached\n\nsee [[note]] and `code`";
    const a = renderMarkdown(md);
    const b = renderMarkdown(md);
    expect(a).toBe(b);
    expect(a).toMatch(/<h1/i);
  });

  it("different content produces different output (natural mtime correctness)", () => {
    const a = renderMarkdown("version A");
    const b = renderMarkdown("version B");
    expect(a).not.toBe(b);
    expect(a).toContain("version A");
    expect(b).toContain("version B");
  });

  it("still sanitizes even when served from cache", async () => {
    const { clearRenderCache } = await import("../../src/lib/markdown/render");
    clearRenderCache();
    const evil = "<script>alert(1)</script>";
    const first = renderMarkdown(evil);
    const second = renderMarkdown(evil); // cache hit
    expect(first).toBe(second);
    expect(first).not.toMatch(/<script/i);
  });
});
