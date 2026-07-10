import matter from "gray-matter";

/**
 * Frontmatter read/write helpers built on gray-matter.
 * The round-trip preserves unknown fields (spec §5) because we merge parsed
 * data back and re-stringify the whole object — gray-matter keeps key order
 * reasonably and never silently drops keys.
 */

export interface ParsedDoc<T = Record<string, unknown>> {
  data: T;
  content: string; // body without frontmatter
}

/** Parse a raw markdown string into { data, content }. Never throws on missing FM. */
export function parseDoc<T = Record<string, unknown>>(raw: string): ParsedDoc<T> {
  const parsed = matter(raw);
  return { data: parsed.data as T, content: parsed.content };
}

/** Stringify frontmatter + body back to a markdown string. */
export function stringifyDoc(
  data: Record<string, unknown>,
  content: string,
): string {
  // gray-matter's stringify puts a trailing newline; normalize body spacing.
  const body = content.startsWith("\n") ? content : `\n${content}`;
  return matter.stringify(body.replace(/^\n/, ""), data);
}
