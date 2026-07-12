import path from "node:path";
import { vaultTypeDir } from "@/lib/config";
import { writeEntry, readEntry, trashEntry } from "@/lib/vault/repo";
import { indexFile, unindexFile } from "@/lib/index/indexer";
import { getBySlug, getByFilePath } from "@/lib/index/queries";
import { taskFilename } from "@/lib/utils/id";
import { localISO, localTimestamp } from "@/lib/utils/date";
import {
  appendActivity,
  toggleSubtask,
  parseSubtasks,
} from "@/lib/markdown/sections";
import { toWikiLink } from "@/lib/markdown/wikilink";
import type { EntryView } from "@/lib/index/queries";
import type { z } from "zod";
import type { TaskStatus, Priority } from "@/lib/schema";

/**
 * Task mutations (spec §6.2). Every mutation follows the same invariant:
 * update frontmatter/body → atomic write .md → append 动态 → reindex the file.
 * The 动态 log is the source of truth for daily report aggregation (spec §5).
 */

type TaskStatusValue = z.infer<typeof TaskStatus>;
type PriorityValue = z.infer<typeof Priority>;

const STATUS_LABEL: Record<string, string> = {
  todo: "待办",
  doing: "进行中",
  blocked: "受阻",
  done: "完成",
  archived: "归档",
};

export interface CreateTaskInput {
  title: string;
  status?: TaskStatusValue;
  priority?: PriorityValue;
  collection?: string | null; // bare collection title
  tags?: string[];
  due?: string | null;
  description?: string;
  // V2 (ADR-019): create a requirement or content item, reusing this pipeline.
  kind?: "task" | "requirement" | "content";
  stage?: string;
  rice?: Record<string, number>;
  platforms?: string[];
  publish_date?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<EntryView> {
  const now = new Date();
  const filename = taskFilename(input.title, now);
  const filePath = path.join(vaultTypeDir("task"), filename);
  const slug = path.basename(filename, ".md");
  const nowISO = localISO(now);

  const body = [
    input.description?.trim() || `${input.title}`,
    "",
    "## 子任务",
    "- [ ] （新增子任务）",
    "",
    "## 动态",
    `- ${localTimestamp(now)} · 创建任务`,
  ].join("\n");

  // V2 optional fields are only written when present, so a plain task file stays
  // identical to V1 (backward-compat).
  const v2: Record<string, unknown> = {};
  if (input.kind && input.kind !== "task") v2.kind = input.kind;
  if (input.stage) v2.stage = input.stage;
  if (input.rice) v2.rice = input.rice;
  if (input.platforms) v2.platforms = input.platforms;
  if (input.publish_date) v2.publish_date = input.publish_date;

  await writeEntry({
    type: "task",
    filePath,
    data: {
      id: `task-${slug}`,
      type: "task",
      title: input.title,
      status: input.status ?? "todo",
      priority: input.priority ?? "P2",
      collection: input.collection ? toWikiLink(input.collection) : null,
      tags: input.tags ?? [],
      progress: 0,
      due: input.due ?? null,
      created: nowISO,
      updated: nowISO,
      ...v2,
    },
    content: body,
  });
  await indexFile(filePath, "task");
  return getByFilePath(filePath)!;
}

/** Load the raw entry (data + content) for a task by slug. */
async function loadTask(slug: string) {
  const view = getBySlug("task", slug);
  if (!view) throw new Error(`任务不存在：${slug}`);
  // read fresh from disk to get the authoritative body (index content may lag on
  // a same-tick chain, but reading disk is always correct)
  const { entry } = await readEntry(view.filePath, "task");
  if (!entry) throw new Error(`任务读取失败：${slug}`);
  return entry;
}

async function persist(
  filePath: string,
  data: Record<string, unknown>,
  content: string,
): Promise<EntryView> {
  await writeEntry({
    type: "task",
    filePath,
    data: { ...data, updated: localISO() },
    content,
  });
  await indexFile(filePath, "task");
  return getByFilePath(filePath)!;
}

/** Change status; appends "状态 X → Y" to 动态 (spec §5/§6.2 kanban drag). */
export async function updateTaskStatus(
  slug: string,
  next: TaskStatusValue,
): Promise<EntryView> {
  const entry = await loadTask(slug);
  const prev = String(entry.data.status);
  if (prev === next) return getBySlug("task", slug)!;
  const content = appendActivity(
    entry.content,
    localTimestamp(),
    `状态 ${STATUS_LABEL[prev] ?? prev} → ${STATUS_LABEL[next] ?? next}`,
  );
  const data: Record<string, unknown> = { ...entry.data, status: next };
  // completing a task snaps progress to 100
  if (next === "done") data.progress = 100;
  return persist(entry.filePath, data, content);
}

export async function updateTaskProgress(
  slug: string,
  progress: number,
): Promise<EntryView> {
  const entry = await loadTask(slug);
  const prev = Number(entry.data.progress ?? 0);
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  if (prev === clamped) return getBySlug("task", slug)!;
  const content = appendActivity(
    entry.content,
    localTimestamp(),
    `进度 ${prev} → ${clamped}`,
  );
  return persist(entry.filePath, { ...entry.data, progress: clamped }, content);
}

export interface UpdateTaskFieldsInput {
  title?: string;
  priority?: PriorityValue;
  collection?: string | null;
  tags?: string[];
  due?: string | null;
  content?: string; // full body replacement (from editor)
}

export async function updateTaskFields(
  slug: string,
  input: UpdateTaskFieldsInput,
): Promise<EntryView> {
  const entry = await loadTask(slug);
  const data = { ...entry.data };
  if (input.title !== undefined) data.title = input.title;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.collection !== undefined)
    data.collection = input.collection ? toWikiLink(input.collection) : null;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.due !== undefined) data.due = input.due;
  const content = input.content ?? entry.content;
  return persist(entry.filePath, data, content);
}

/** Toggle a subtask checkbox; recomputes progress from checklist completion. */
export async function toggleTaskSubtask(
  slug: string,
  index: number,
  done: boolean,
): Promise<EntryView> {
  const entry = await loadTask(slug);
  const content = toggleSubtask(entry.content, index, done);
  // derive progress from subtask completion when subtasks exist
  const subs = parseSubtasks(content);
  const data = { ...entry.data };
  if (subs.length > 0 && data.status !== "done") {
    const pct = Math.round((subs.filter((s) => s.done).length / subs.length) * 100);
    data.progress = pct;
  }
  return persist(entry.filePath, data, content);
}

/** Append a manual activity line to a task's 动态 timeline (used by MCP). */
export async function appendTaskActivity(
  slug: string,
  text: string,
): Promise<EntryView> {
  const entry = await loadTask(slug);
  const content = appendActivity(entry.content, localTimestamp(), text.trim());
  return persist(entry.filePath, { ...entry.data, updated: localISO() }, content);
}

/** Archive = soft state change (keeps the file). Delete = move to vault trash. */
export async function archiveTask(slug: string): Promise<EntryView> {
  return updateTaskStatus(slug, "archived");
}

export async function deleteTask(slug: string): Promise<void> {
  const view = getBySlug("task", slug);
  if (!view) return;
  await trashEntry(view.filePath);
  unindexFile(view.filePath);
}
