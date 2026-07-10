import path from "node:path";
import { listByType, getBySlug, backlinks, getByFilePath } from "@/lib/index/queries";
import { vaultTypeDir } from "@/lib/config";
import type { EntryView } from "@/lib/index/queries";

/** Knowledge base (spec §6.6): lightweight browse + wikilinks + backlinks. */

export function listNotes(): { slug: string; title: string; updated: string | null }[] {
  return listByType("knowledge").map((n) => ({
    slug: n.slug,
    title: String(n.data.title ?? n.slug),
    updated: (n.data.updated as string) ?? null,
  }));
}

export function getNote(slug: string): {
  note: EntryView;
  backlinks: EntryView[];
} | null {
  // knowledge notes may be nested; match by slug (basename) or by file path
  let note = getBySlug("knowledge", slug);
  if (!note) {
    // try resolving as a title-based lookup used by wikilinks
    const byTitle = listByType("knowledge").find(
      (n) => String(n.data.title) === slug,
    );
    if (byTitle) note = byTitle;
  }
  if (!note) {
    // last resort: a file path directly under knowledge dir
    const p = path.join(vaultTypeDir("knowledge" as never), `${slug}.md`);
    note = getByFilePath(p);
  }
  if (!note) return null;
  const title = String(note.data.title ?? note.slug);
  // backlinks target either the title or the slug
  const links = [...backlinks(title), ...backlinks(note.slug)];
  const seen = new Set<string>();
  const deduped = links.filter((l) => {
    if (seen.has(l.filePath)) return false;
    seen.add(l.filePath);
    return true;
  });
  return { note, backlinks: deduped };
}
