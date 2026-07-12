import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listByType, listRequirements, listContent } from "@/lib/index/queries";
import {
  createTask,
  updateTaskStatus,
  updateTaskFields,
  appendTaskActivity,
} from "@/lib/vault/task-service";
import { generateDaily } from "@/lib/reports/report-service";
import { dashboardStats } from "@/lib/dashboard/stats";
import { localDateKey } from "@/lib/utils/date";
import { assertWriteAllowed } from "@/lib/mcp/auth";

/**
 * MCP tool implementations (blueprint decision three / ADR-023). Each is a plain
 * async function returning JSON-serializable data, so it can be unit-tested
 * without the transport. Write tools call assertWriteAllowed(token) first to
 * honor the AUTH_MODE=passcode constraint. The stdio server (scripts/mcp.ts)
 * wraps these with the SDK.
 */

const STATUSES = ["todo", "doing", "blocked", "done", "archived"] as const;

export async function listTasks(input: { status?: string; kind?: string }) {
  await ensureIndexReady();
  let tasks = listByType("task");
  if (input.kind) tasks = tasks.filter((t) => (t.data.kind ?? "task") === input.kind);
  else tasks = tasks.filter((t) => (t.data.kind ?? "task") === "task");
  if (input.status) tasks = tasks.filter((t) => t.data.status === input.status);
  return tasks.map((t) => ({
    slug: t.slug,
    title: String(t.data.title),
    status: String(t.data.status ?? "todo"),
    priority: String(t.data.priority ?? "P2"),
    collection: (t.data.collection as string | null) ?? null,
  }));
}

export async function createTaskTool(input: {
  title: string;
  priority?: string;
  collection?: string | null;
  token?: string;
}) {
  assertWriteAllowed(input.token);
  const entry = await createTask({
    title: input.title,
    priority: (input.priority as "P0" | "P1" | "P2" | "P3") ?? "P2",
    collection: input.collection ?? null,
  });
  return { slug: entry.slug, title: String(entry.data.title) };
}

export async function updateTaskTool(input: {
  slug: string;
  status?: string;
  title?: string;
  priority?: string;
  token?: string;
}) {
  assertWriteAllowed(input.token);
  let entry;
  if (input.status) {
    if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) {
      throw new Error(`未知的状态：${input.status}`);
    }
    entry = await updateTaskStatus(
      input.slug,
      input.status as (typeof STATUSES)[number],
    );
  }
  if (input.title !== undefined || input.priority !== undefined) {
    entry = await updateTaskFields(input.slug, {
      title: input.title,
      priority: input.priority as "P0" | "P1" | "P2" | "P3" | undefined,
    });
  }
  if (!entry) throw new Error("没有可更新的字段");
  return { slug: entry.slug, status: String(entry.data.status) };
}

export async function appendActivityTool(input: {
  slug: string;
  text: string;
  token?: string;
}) {
  assertWriteAllowed(input.token);
  const entry = await appendTaskActivity(input.slug, input.text);
  return { slug: entry.slug, ok: true };
}

export async function createIdeaTool(input: {
  title: string;
  angle?: string;
  token?: string;
}) {
  assertWriteAllowed(input.token);
  const description = input.angle
    ? `${input.title}\n\n**切入角度**：${input.angle}`
    : input.title;
  const entry = await createTask({
    title: input.title,
    kind: "content",
    stage: "idea",
    description,
  });
  return { slug: entry.slug, title: String(entry.data.title) };
}

export async function generateDailyDraftTool(input: {
  date?: string;
  token?: string;
}) {
  assertWriteAllowed(input.token);
  const date = input.date ?? localDateKey(new Date());
  const entry = await generateDaily(date);
  return { date, content: entry.content };
}

export async function getStatsTool() {
  await ensureIndexReady();
  const stats = dashboardStats();
  return {
    completionRate: stats.completionRate,
    counts: stats.counts,
    tasks: listByType("task").filter((t) => (t.data.kind ?? "task") === "task")
      .length,
    requirements: listRequirements().length,
    content: listContent().length,
  };
}
