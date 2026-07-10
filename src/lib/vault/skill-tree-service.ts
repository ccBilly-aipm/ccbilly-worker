import { readEntry, writeEntry } from "@/lib/vault/repo";
import { indexFile } from "@/lib/index/indexer";
import { listByType, getBySlug, getByFilePath, backlinks } from "@/lib/index/queries";
import { appendToSection } from "@/lib/markdown/sections";
import { localDateKey, localISO } from "@/lib/utils/date";
import type { EntryView } from "@/lib/index/queries";

/** Personal skill tree (spec §6.5 Tab B, data in vault/skills/). */

export function listSkills(): EntryView[] {
  return listByType("skill");
}

/** Group skills by category and compute per-category average level (radar). */
export function skillMatrix() {
  const skills = listSkills();
  const byCategory = new Map<string, EntryView[]>();
  for (const s of skills) {
    const cat = String(s.data.category ?? "未分类");
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(s);
  }
  const radar = [...byCategory.entries()].map(([category, items]) => ({
    category,
    avgLevel:
      Math.round(
        (items.reduce((sum, s) => sum + Number(s.data.level ?? 1), 0) /
          items.length) *
          10,
      ) / 10,
    count: items.length,
  }));
  return {
    categories: [...byCategory.entries()].map(([category, items]) => ({
      category,
      skills: items,
    })),
    radar,
  };
}

export function getSkillWithLinks(slug: string) {
  const skill = getBySlug("skill", slug);
  if (!skill) return null;
  const name = String(skill.data.name ?? slug);
  return {
    skill,
    backlinks: backlinks(name),
  };
}

/** Append a "今天学了什么" entry to a skill's 学习记录 timeline (one-click). */
export async function appendLearningLog(
  slug: string,
  note: string,
): Promise<EntryView> {
  const view = getBySlug("skill", slug);
  if (!view) throw new Error(`技能不存在：${slug}`);
  const { entry } = await readEntry(view.filePath, "skill");
  if (!entry) throw new Error(`技能读取失败：${slug}`);
  const content = appendToSection(
    entry.content,
    "学习记录",
    `- ${localDateKey()} · ${note.trim()}`,
  );
  await writeEntry({
    type: "skill",
    filePath: entry.filePath,
    data: { ...entry.data, updated: localISO() },
    content,
  });
  await indexFile(entry.filePath, "skill");
  return getByFilePath(entry.filePath)!;
}

export interface UpdateSkillInput {
  level?: number;
  target_level?: number;
  status?: string;
}

export async function updateSkill(
  slug: string,
  input: UpdateSkillInput,
): Promise<EntryView> {
  const view = getBySlug("skill", slug);
  if (!view) throw new Error(`技能不存在：${slug}`);
  const { entry } = await readEntry(view.filePath, "skill");
  if (!entry) throw new Error(`技能读取失败：${slug}`);
  const data: Record<string, unknown> = { ...entry.data, updated: localISO() };
  if (input.level !== undefined) data.level = input.level;
  if (input.target_level !== undefined) data.target_level = input.target_level;
  if (input.status !== undefined) data.status = input.status;
  await writeEntry({
    type: "skill",
    filePath: entry.filePath,
    data,
    content: entry.content,
  });
  await indexFile(entry.filePath, "skill");
  return getByFilePath(entry.filePath)!;
}
