import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listByType } from "@/lib/index/queries";
import { createTask } from "@/lib/vault/task-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureIndexReady();
  return NextResponse.json({ tasks: listByType("task") });
}

const CreateSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  status: z.enum(["todo", "doing", "blocked", "done", "archived"]).optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  collection: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  due: z.string().nullable().optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await ensureIndexReady();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  try {
    const task = await createTask(parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
