import { NextRequest, NextResponse } from "next/server";
import {
  getSkillDetail,
  saveSkill,
  validateSkill,
} from "@/lib/skills/skill-service";
import { SkillPathError } from "@/lib/skills/paths";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ level: string; name: string }> };

const LevelSchema = z.enum(["personal", "project"]);

export async function GET(_req: NextRequest, { params }: Params) {
  const { level, name } = await params;
  const lv = LevelSchema.safeParse(level);
  if (!lv.success) return NextResponse.json({ error: "无效层级" }, { status: 400 });
  try {
    const detail = getSkillDetail(lv.data, decodeURIComponent(name));
    if (!detail) return NextResponse.json({ error: "Skill 不存在" }, { status: 404 });
    return NextResponse.json({ skill: detail });
  } catch (e) {
    const status = e instanceof SkillPathError ? 403 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

const SaveSchema = z.object({
  frontmatter: z.record(z.unknown()),
  body: z.string(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const { level, name } = await params;
  const lv = LevelSchema.safeParse(level);
  if (!lv.success) return NextResponse.json({ error: "无效层级" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const validationError = validateSkill(parsed.data.frontmatter);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  try {
    const skill = await saveSkill({
      level: lv.data,
      name: decodeURIComponent(name),
      frontmatter: parsed.data.frontmatter,
      body: parsed.data.body,
    });
    return NextResponse.json({ skill });
  } catch (e) {
    const status = e instanceof SkillPathError ? 403 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
