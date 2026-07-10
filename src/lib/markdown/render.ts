import { marked } from "marked";
import { parseWikiLinks } from "@/lib/markdown/wikilink";

/**
 * Render markdown → HTML for read-only display (drawer preview, knowledge base).
 * [[wikilinks]] become internal <a> links so they're clickable (spec §6.6).
 * marked is configured GFM; we do a light pass to convert wikilinks first.
 */

marked.setOptions({ gfm: true, breaks: false });

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
    return `[${(alias ?? t).trim()}](${href})`;
  });
  return marked.parse(withLinks) as string;
}

export { parseWikiLinks };
