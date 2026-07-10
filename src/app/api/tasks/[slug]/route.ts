import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { getBySlug } from "@/lib/index/queries";
import {
  updateTaskStatus,
  updateTaskProgress,
  updateTaskFields,
  toggleTaskSubtask,
  archiveTask,
  deleteTask,
} from "@/lib/vault/task-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  const task = getBySlug("task", slug);
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json({ task });
}

const PatchSchema = z.object({
  action: z.enum(["status", "progress", "fields", "subtask", "archive"]),
  status: z.enum(["todo", "doing", "blocked", "done", "archived"]).optional(),
  progress: z.number().optional(),
  index: z.number().optional(),
  done: z.boolean().optional(),
  fields: z
    .object({
      title: z.string().optional(),
      priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
      collection: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      due: z.string().nullable().optional(),
      content: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const p = parsed.data;
  try {
    let task;
    switch (p.action) {
      case "status":
        if (!p.status) throw new Error("缺少 status");
        task = await updateTaskStatus(slug, p.status);
        break;
      case "progress":
        if (p.progress === undefined) throw new Error("缺少 progress");
        task = await updateTaskProgress(slug, p.progress);
        break;
      case "subtask":
        if (p.index === undefined || p.done === undefined)
          throw new Error("缺少 index/done");
        task = await toggleTaskSubtask(slug, p.index, p.done);
        break;
      case "fields":
        task = await updateTaskFields(slug, p.fields ?? {});
        break;
      case "archive":
        task = await archiveTask(slug);
        break;
    }
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  try {
    await deleteTask(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
