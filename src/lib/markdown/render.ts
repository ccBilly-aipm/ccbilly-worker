import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Schema } from "hast-util-sanitize";
import { parseWikiLinks } from "@/lib/markdown/wikilink";

/**
 * Render markdown → HTML for read-only display (knowledge base, previews).
 *
 * SECURITY (S1-1, ADR-013): output is injected via dangerouslySetInnerHTML, so
 * it MUST be sanitized. We use the unified/rehype pipeline with allowlist-based
 * rehype-sanitize instead of raw `marked` (which passes inline HTML through
 * unchanged). Raw HTML in the source is dropped because remark-rehype is NOT
 * given allowDangerousHtml, and hast-util-sanitize's default schema rejects
 * javascript:/vbscript:/data: URLs and event-handler attributes at the AST
 * layer — there is no bypass path. See tests/unit/markdown-xss.test.ts.
 *
 * [[wikilinks]] become internal <a> links so they're clickable (spec §6.6).
 */

// Extend the GitHub-flavored default schema to permit task-list checkboxes
// (remark-gfm emits <input type="checkbox" disabled>), which the default
// schema would otherwise strip.
const schema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
  attributes: {
    ...defaultSchema.attributes,
    input: ["type", "checked", "disabled"],
  },
  // Keep the default protocol allowlist (http, https, mailto, tel, relative,
  // and #fragments for href) — this is what neutralizes javascript:/data: URIs.
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype) // no allowDangerousHtml → raw inline HTML is dropped
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/** knowledge slug resolver: default maps target → /knowledge/<target>. */
export function renderMarkdown(
  md: string,
  linkResolver?: (target: string) => string,
): string {
  const withLinks = md.replace(/\[\[([^\]]+?)\]\]/g, (_m, inner: string) => {
    const [target, alias] = inner.split("|");
    const t = target.trim();
    const href = linkResolver
      ? linkResolver(t)
      : `/knowledge/${encodeURIComponent(t)}`;
    // Escape brackets/parens in the label so an alias can't break out of the
    // markdown link syntax; sanitize layer is the real guard, this is belt+braces.
    const label = (alias ?? t).trim().replace(/[[\]()]/g, "");
    return `[${label}](${href})`;
  });
  return String(processor.processSync(withLinks));
}

export { parseWikiLinks };
