import { NextRequest, NextResponse } from "next/server";
import { ensureIndexReady } from "@/lib/index/bootstrap";
import {
  getSkillWithLinks,
  appendLearningLog,
  updateSkill,
} from "@/lib/vault/skill-tree-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  const data = getSkillWithLinks(decodeURIComponent(slug));
  if (!data) return NextResponse.json({ error: "技能不存在" }, { status: 404 });
  return NextResponse.json(data);
}

const PatchSchema = z.object({
  action: z.enum(["log", "update"]),
  note: z.string().optional(),
  level: z.number().int().min(1).max(5).optional(),
  target_level: z.number().int().min(1).max(5).optional(),
  status: z.enum(["learning", "using", "mastered", "paused"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  await ensureIndexReady();
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  try {
    const name = decodeURIComponent(slug);
    let skill;
    if (parsed.data.action === "log") {
      if (!parsed.data.note?.trim())
        return NextResponse.json({ error: "请填写学习内容" }, { status: 400 });
      skill = await appendLearningLog(name, parsed.data.note);
    } else {
      skill = await updateSkill(name, {
        level: parsed.data.level,
        target_level: parsed.data.target_level,
        status: parsed.data.status,
      });
    }
    return NextResponse.json({ skill });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
