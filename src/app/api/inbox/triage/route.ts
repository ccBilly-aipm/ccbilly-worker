import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listCaptures, removeCapture } from "@/lib/inbox/inbox-service";
import { createTask } from "@/lib/vault/task-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  slug: z.string().min(1),
  target: z.enum(["task", "requirement", "content"]),
});

/**
 * Triage an inbox capture into a real entry (blueprint B5.1). Creates a task /
 * requirement / content item from the capture text, then removes the capture.
 * Mutation → auth-guarded.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const { slug, target } = parsed.data;

  const capture = listCaptures().find((c) => c.slug === slug);
  if (!capture) {
    return NextResponse.json({ error: "未找到该捕捉" }, { status: 404 });
  }

  const stageByKind: Record<string, string> = {
    requirement: "inbox",
    content: "idea",
    task: "",
  };

  const entry = await createTask({
    title: capture.text.slice(0, 80),
    description: capture.text,
    kind: target,
    stage: stageByKind[target] || undefined,
    ...(target === "requirement"
      ? { rice: { reach: 0, impact: 0, confidence: 1, effort: 1 } }
      : {}),
  });

  removeCapture(slug);
  return NextResponse.json({ ok: true, slug: entry.slug, kind: target });
}
