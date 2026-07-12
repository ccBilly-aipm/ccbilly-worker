import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { localISO } from "@/lib/utils/date";

/**
 * Quick-capture inbox (blueprint B5.1). Captures a one-line note into
 * vault/inbox/ as a tiny markdown file, to be triaged later into a task /
 * requirement / content / knowledge note. Non-destructive, append-only.
 */

export interface InboxItem {
  slug: string;
  text: string;
  created: string;
  filePath: string;
}

function inboxDir(): string {
  return vaultV2Dir("inbox");
}

/** Slugify a capture into a filename-safe, collision-resistant base. */
function captureSlug(text: string, stamp: string): string {
  const head = text
    .slice(0, 24)
    .replace(/[\\/:*?"<>|#[\]]/g, "")
    .replace(/\s+/g, "-")
    .trim();
  return `${stamp}-${head || "note"}`;
}

/** Add a capture. `stamp` is passed in (deterministic/testable). */
export async function addCapture(text: string, stamp: string): Promise<InboxItem> {
  const clean = text.trim();
  if (!clean) throw new Error("捕捉内容不能为空");
  fs.mkdirSync(inboxDir(), { recursive: true });
  const slug = captureSlug(clean, stamp);
  const filePath = path.join(inboxDir(), `${slug}.md`);
  const created = localISO();
  await atomicWriteFile(
    filePath,
    stringifyDoc(
      { type: "inbox", status: "unsorted", created },
      `${clean}\n`,
    ),
  );
  return { slug, text: clean, created, filePath };
}

/** List unsorted captures, newest first. */
export function listCaptures(): InboxItem[] {
  let names: string[] = [];
  try {
    names = fs
      .readdirSync(inboxDir())
      .filter((n) => n.endsWith(".md") && !n.startsWith("."));
  } catch {
    return [];
  }
  const items: InboxItem[] = [];
  for (const name of names) {
    const filePath = path.join(inboxDir(), name);
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = parseDoc(raw);
      items.push({
        slug: name.replace(/\.md$/, ""),
        text: content.trim(),
        created: String((data as Record<string, unknown>).created ?? ""),
        filePath,
      });
    } catch {
      /* skip unreadable */
    }
  }
  return items.sort((a, b) => b.created.localeCompare(a.created));
}

/** Remove a capture (used after triaging it into a real entry). */
export function removeCapture(slug: string): void {
  const safe = path.basename(slug); // prevent traversal
  const filePath = path.join(inboxDir(), `${safe}.md`);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(inboxDir()) + path.sep)) return;
  try {
    fs.unlinkSync(resolved);
  } catch {
    /* already gone */
  }
}
