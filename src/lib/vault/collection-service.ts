import path from "node:path";
import { vaultTypeDir } from "@/lib/config";
import { writeEntry, readEntry } from "@/lib/vault/repo";
import { indexFile } from "@/lib/index/indexer";
import {
  getBySlug,
  getByFilePath,
  listByType,
  collectionProgress,
  tasksInCollection,
} from "@/lib/index/queries";
import { slugify } from "@/lib/utils/id";
import { localISO } from "@/lib/utils/date";
import type { EntryView } from "@/lib/index/queries";

/** Collection mutations + derived progress (spec §5/§6.2). Progress is never
 *  stored — it's computed from member tasks at read time. */

export interface CollectionWithStats extends EntryView {
  stats: { taskCount: number; doneCount: number; progress: number };
}

export function listCollectionsWithStats(): CollectionWithStats[] {
  return listByType("collection").map((c) => ({
    ...c,
    stats: collectionProgress(String(c.data.title)),
  }));
}

export function getCollectionWithTasks(slug: string) {
  const col = getBySlug("collection", slug);
  if (!col) return null;
  const title = String(col.data.title);
  return {
    collection: col,
    stats: collectionProgress(title),
    tasks: tasksInCollection(title),
  };
}

export async function createCollection(input: {
  title: string;
  description?: string;
}): Promise<EntryView> {
  const slug = slugify(input.title);
  const filePath = path.join(vaultTypeDir("collection"), `${slug}.md`);
  const nowISO = localISO();
  await writeEntry({
    type: "collection",
    filePath,
    data: {
      id: `col-${slug}`,
      type: "collection",
      title: input.title,
      status: "active",
      description: input.description ?? "",
      created: nowISO,
      updated: nowISO,
    },
    content: `${input.description ?? input.title}\n`,
  });
  await indexFile(filePath, "collection");
  return getByFilePath(filePath)!;
}

export async function setCollectionStatus(
  slug: string,
  status: "active" | "archived",
): Promise<EntryView> {
  const view = getBySlug("collection", slug);
  if (!view) throw new Error(`合集不存在：${slug}`);
  const { entry } = await readEntry(view.filePath, "collection");
  if (!entry) throw new Error(`合集读取失败：${slug}`);
  await writeEntry({
    type: "collection",
    filePath: view.filePath,
    data: { ...entry.data, status, updated: localISO() },
    content: entry.content,
  });
  await indexFile(view.filePath, "collection");
  return getByFilePath(view.filePath)!;
}
