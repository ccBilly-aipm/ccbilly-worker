import { NextResponse } from "next/server";
import { scanSkills } from "@/lib/skills/skill-service";
import { skillRoots } from "@/lib/skills/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List all Claude Code Skills across whitelisted roots (spec §6.5 Tab A). */
export async function GET() {
  try {
    return NextResponse.json({
      skills: scanSkills(),
      roots: skillRoots().map((r) => ({ level: r.level, label: r.label, dir: r.dir })),
    });
  } catch (e) {
    return NextResponse.json(
      { skills: [], roots: [], error: (e as Error).message },
      { status: 500 },
    );
  }
}
