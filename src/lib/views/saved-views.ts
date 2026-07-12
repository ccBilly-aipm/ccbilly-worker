import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";

/**
 * Saved views (blueprint B5.3): a named filter/sort/group combination, stored as
 * a URL query string so any page can restore it. Persisted to
 * vault/config/views.md (Git-syncable). Scoped by `page` (e.g. "tasks").
 */

export interface SavedView {
  id: string;
  page: string;
  name: string;
  query: string; // e.g. "status=doing&sort=priority"
}

function viewsPath(): string {
  return path.join(vaultV2Dir("config"), "views.md");
}

export function listViews(page?: string): SavedView[] {
  let all: SavedView[] = [];
  try {
    const { data } = parseDoc(fs.readFileSync(viewsPath(), "utf8"));
    const views = (data as Record<string, unknown>).views;
    if (Array.isArray(views)) all = views as SavedView[];
  } catch {
    all = [];
  }
  return page ? all.filter((v) => v.page === page) : all;
}

async function writeAll(views: SavedView[]): Promise<void> {
  fs.mkdirSync(vaultV2Dir("config"), { recursive: true });
  await atomicWriteFile(
    viewsPath(),
    stringifyDoc({ type: "config", config: "views", views }, "# 已保存视图\n"),
  );
}

export async function addView(
  page: string,
  name: string,
  query: string,
  idSuffix: string,
): Promise<SavedView> {
  const clean = name.trim();
  if (!clean) throw new Error("视图名称不能为空");
  const view: SavedView = {
    id: `view-${page}-${idSuffix}`,
    page,
    name: clean,
    query: query.replace(/^\?/, ""),
  };
  const all = listViews();
  await writeAll([...all.filter((v) => v.id !== view.id), view]);
  return view;
}

export async function removeView(id: string): Promise<void> {
  await writeAll(listViews().filter((v) => v.id !== id));
}
