/**
 * Obsidian-compatible [[wikilink]] parsing (spec §2/§6.6).
 * Supports [[Target]] and [[Target|Alias]]. We only read links; we never emit
 * Obsidian-private syntax that Obsidian itself can't render.
 */

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;

export interface WikiLink {
  target: string; // the linked note title/slug (before the pipe)
  alias?: string; // display text (after the pipe)
  raw: string; // full "[[...]]"
}

export function parseWikiLinks(text: string): WikiLink[] {
  const out: WikiLink[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const inner = m[1];
    const [target, alias] = inner.split("|");
    out.push({
      target: target.trim(),
      alias: alias?.trim(),
      raw: m[0],
    });
  }
  return out;
}

/** Extract just the target titles (deduped), useful for backlink indexing. */
export function extractLinkTargets(text: string): string[] {
  const seen = new Set<string>();
  for (const l of parseWikiLinks(text)) {
    if (l.target) seen.add(l.target);
  }
  return [...seen];
}

/**
 * A single [[link]] value stored in frontmatter (e.g. collection: "[[开源项目接入]]").
 * Returns the bare target, or the string unchanged if it's not a wikilink.
 */
export function unwrapWikiLink(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^\[\[([^\]]+?)\]\]$/);
  if (!m) return value;
  return m[1].split("|")[0].trim();
}

export function toWikiLink(target: string): string {
  return `[[${target}]]`;
}
