import path from "node:path";
import { vaultTypeDir } from "@/lib/config";
import { writeEntry, readEntry, trashEntry } from "@/lib/vault/repo";
import { indexFile, unindexFile } from "@/lib/index/indexer";
import { listByType, getBySlug, getByFilePath } from "@/lib/index/queries";
import { slugify } from "@/lib/utils/id";
import { localISO } from "@/lib/utils/date";
import type { EntryView } from "@/lib/index/queries";

/** App registry (spec §6.7): link/iframe/proxy apps, data in vault/apps/. */

export function listApps(): EntryView[] {
  return listByType("app").sort(
    (a, b) => Number(a.data.order ?? 0) - Number(b.data.order ?? 0),
  );
}

export interface AppInput {
  name: string;
  mode: "link" | "iframe" | "proxy";
  url: string;
  icon?: string;
  category?: string;
  status?: "enabled" | "disabled";
  order?: number;
  notes?: string;
  proxyBaseUrl?: string;
}

export async function createApp(input: AppInput): Promise<EntryView> {
  const slug = slugify(input.name);
  const filePath = path.join(vaultTypeDir("app"), `${slug}.md`);
  const nowISO = localISO();
  await writeEntry({
    type: "app",
    filePath,
    data: {
      id: `app-${slug}`,
      type: "app",
      name: input.name,
      mode: input.mode,
      url: input.url,
      icon: input.icon ?? "",
      category: input.category ?? "其他",
      status: input.status ?? "enabled",
      order: input.order ?? listApps().length + 1,
      notes: input.notes ?? "",
      ...(input.proxyBaseUrl ? { proxyBaseUrl: input.proxyBaseUrl } : {}),
      created: nowISO,
      updated: nowISO,
    },
    content: `${input.notes ?? input.name}\n`,
  });
  await indexFile(filePath, "app");
  return getByFilePath(filePath)!;
}

export async function updateApp(
  slug: string,
  input: Partial<AppInput>,
): Promise<EntryView> {
  const view = getBySlug("app", slug);
  if (!view) throw new Error(`应用不存在：${slug}`);
  const { entry } = await readEntry(view.filePath, "app");
  if (!entry) throw new Error(`应用读取失败：${slug}`);
  const data: Record<string, unknown> = { ...entry.data, updated: localISO() };
  for (const key of [
    "name",
    "mode",
    "url",
    "icon",
    "category",
    "status",
    "order",
    "notes",
    "proxyBaseUrl",
  ] as const) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  await writeEntry({
    type: "app",
    filePath: entry.filePath,
    data,
    content: entry.content,
  });
  await indexFile(entry.filePath, "app");
  return getByFilePath(entry.filePath)!;
}

export async function deleteApp(slug: string): Promise<void> {
  const view = getBySlug("app", slug);
  if (!view) return;
  await trashEntry(view.filePath);
  unindexFile(view.filePath);
}

export function getApp(slug: string): EntryView | null {
  return getBySlug("app", slug);
}

/** Find an app by its id (used by the proxy route). */
export function getAppById(appId: string): EntryView | null {
  return listApps().find((a) => a.data.id === appId) ?? null;
}
