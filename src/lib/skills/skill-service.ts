import fs from "node:fs";
import path from "node:path";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { atomicWriteFile } from "@/lib/vault/atomic";
import {
  skillRoots,
  resolveWithinRoot,
  rootForPath,
  SkillPathError,
  type SkillRoot,
  type SkillLevel,
} from "@/lib/skills/paths";

/**
 * Claude Code Skills management (spec §6.5 Tab A). Reads REAL SKILL.md files.
 * Per HANDBOOK ADR-006, first phase supports scan/view/edit(+backup); new/delete
 * writes to real ~/.claude/skills are intentionally deferred (UI disabled).
 * Every path goes through the whitelist guard (paths.ts) — the module's red line.
 */

export interface SkillSummary {
  name: string; // dir name = command name
  level: SkillLevel;
  rootLabel: string;
  description: string;
  skillPath: string; // absolute path to SKILL.md
  mtimeMs: number;
  /** true if this skill is shadowed by a same-name personal skill */
  overriddenBy?: SkillLevel;
}

export interface SkillDetail {
  name: string;
  level: SkillLevel;
  rootLabel: string;
  skillPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
  files: SkillFileNode[];
}

export interface SkillFileNode {
  name: string;
  relPath: string; // relative to the skill dir
  type: "file" | "dir";
  children?: SkillFileNode[];
}

function readSkillSummary(
  root: SkillRoot,
  name: string,
): SkillSummary | null {
  let skillPath: string;
  try {
    skillPath = resolveWithinRoot(root, path.join(name, "SKILL.md"));
  } catch {
    return null;
  }
  if (!fs.existsSync(skillPath)) return null;
  let raw = "";
  let description = "";
  try {
    raw = fs.readFileSync(skillPath, "utf8");
    const { data } = parseDoc(raw);
    description = String((data as Record<string, unknown>).description ?? "");
  } catch {
    description = "（无法解析 frontmatter）";
  }
  const mtimeMs = fs.existsSync(skillPath)
    ? fs.statSync(skillPath).mtimeMs
    : 0;
  return {
    name,
    level: root.level,
    rootLabel: root.label,
    description,
    skillPath,
    mtimeMs,
  };
}

/** Scan all whitelisted roots. Marks override relationships (personal wins). */
export function scanSkills(): SkillSummary[] {
  const all: SkillSummary[] = [];
  for (const root of skillRoots()) {
    let entries: string[] = [];
    try {
      entries = fs
        .readdirSync(root.dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => e.name);
    } catch {
      continue; // missing root dir is fine
    }
    for (const name of entries) {
      const s = readSkillSummary(root, name);
      if (s) all.push(s);
    }
  }

  // mark overrides: a project skill with the same name as a personal one is shadowed
  const personalNames = new Set(
    all.filter((s) => s.level === "personal").map((s) => s.name),
  );
  for (const s of all) {
    if (s.level === "project" && personalNames.has(s.name)) {
      s.overriddenBy = "personal";
    }
  }

  return all.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.level === "personal" ? -1 : 1;
  });
}

function buildFileTree(dir: string, base: string): SkillFileNode[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: SkillFileNode[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs);
    if (e.isDirectory()) {
      nodes.push({
        name: e.name,
        relPath: rel,
        type: "dir",
        children: buildFileTree(abs, base),
      });
    } else {
      nodes.push({ name: e.name, relPath: rel, type: "file" });
    }
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Load a skill's SKILL.md + attachment file tree. Path-guarded. */
export function getSkillDetail(
  level: SkillLevel,
  name: string,
): SkillDetail | null {
  const root = skillRoots().find((r) => r.level === level);
  if (!root) return null;
  const skillDir = resolveWithinRoot(root, name);
  const skillPath = resolveWithinRoot(root, path.join(name, "SKILL.md"));
  if (!fs.existsSync(skillPath)) return null;
  const raw = fs.readFileSync(skillPath, "utf8");
  const { data, content } = parseDoc(raw);
  return {
    name,
    level,
    rootLabel: root.label,
    skillPath,
    frontmatter: data as Record<string, unknown>,
    body: content,
    raw,
    files: buildFileTree(skillDir, skillDir),
  };
}

export interface SaveSkillInput {
  level: SkillLevel;
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Validation for skill frontmatter (spec §6.5). */
export function validateSkill(fm: Record<string, unknown>): string | null {
  const name = String(fm.name ?? "");
  if (!/^[a-z0-9-]{1,64}$/.test(name)) {
    return "name 只能包含小写字母、数字、连字符，且不超过 64 字符";
  }
  const desc = String(fm.description ?? "").trim();
  if (!desc) return "description 必填（请写清：能力 + 触发场景）";
  return null;
}

/**
 * Save an edited SKILL.md. Backs up the current file to a .trash/<ts>/ folder
 * INSIDE the same root first (never deletes), preserves unknown frontmatter
 * fields, then atomically writes. Path-guarded.
 */
export async function saveSkill(input: SaveSkillInput): Promise<SkillDetail> {
  const root = skillRoots().find((r) => r.level === input.level);
  if (!root) throw new SkillPathError("未知的 skill 层级");

  const err = validateSkill(input.frontmatter);
  if (err) throw new Error(err);

  const skillPath = resolveWithinRoot(
    root,
    path.join(input.name, "SKILL.md"),
  );

  // backup current content before overwriting
  if (fs.existsSync(skillPath)) {
    const trashDir = resolveWithinRoot(
      root,
      path.join(".trash", String(Date.now()), input.name),
    );
    fs.mkdirSync(trashDir, { recursive: true });
    fs.copyFileSync(skillPath, path.join(trashDir, "SKILL.md"));
  }

  const raw = stringifyDoc(input.frontmatter, input.body);
  await atomicWriteFile(skillPath, raw);

  return getSkillDetail(input.level, input.name)!;
}

/** Read one attachment file's content (path-guarded, text only). */
export function readSkillFile(
  level: SkillLevel,
  name: string,
  relPath: string,
): { content: string; tooLarge: boolean } {
  const root = skillRoots().find((r) => r.level === level);
  if (!root) throw new SkillPathError("未知的 skill 层级");
  const target = resolveWithinRoot(root, path.join(name, relPath));
  const stat = fs.statSync(target);
  if (stat.size > 200_000) return { content: "", tooLarge: true };
  return { content: fs.readFileSync(target, "utf8"), tooLarge: false };
}

export { rootForPath };
