import path from "node:path";
import fs from "node:fs";
import { personalSkillsRoot, projectSkillRoots } from "@/lib/config";

/**
 * Skill filesystem security (spec §6.5 red line). All skill file operations MUST
 * resolve through here. The whitelist = the personal skills root + configured
 * project skill roots. Any resolved path that escapes its root (via `../`,
 * symlinks, absolute injection) is rejected. This is the module's red line.
 */

export type SkillLevel = "personal" | "project";

export interface SkillRoot {
  level: SkillLevel;
  /** the .../.claude/skills directory that contains skill subfolders */
  dir: string;
  /** a human label for the source (e.g. the project path) */
  label: string;
}

/** All whitelisted skill roots, personal first (personal overrides project). */
export function skillRoots(): SkillRoot[] {
  const roots: SkillRoot[] = [
    { level: "personal", dir: personalSkillsRoot(), label: "个人级 ~/.claude/skills" },
  ];
  for (const projRoot of projectSkillRoots()) {
    roots.push({
      level: "project",
      dir: path.join(projRoot, ".claude", "skills"),
      label: `项目级 ${projRoot}`,
    });
  }
  return roots;
}

/** The set of allowed root dirs (normalized, real paths where they exist). */
function allowedRoots(): string[] {
  return skillRoots().map((r) => realpathSafe(path.resolve(r.dir)));
}

function realpathSafe(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * Resolve a candidate path and assert it lives inside one of the whitelisted
 * roots. Throws on any traversal attempt. Returns the safe absolute path.
 *
 * @param root  the SkillRoot the caller intends to operate within
 * @param relative  a path relative to root.dir (may be "" for the root itself)
 */
export function resolveWithinRoot(root: SkillRoot, relative: string): string {
  const base = path.resolve(root.dir);
  // reject absolute or drive-letter injection outright
  if (path.isAbsolute(relative)) {
    throw new SkillPathError("拒绝：不允许绝对路径");
  }
  const candidate = path.resolve(base, relative);
  // the resolved candidate must be base or a descendant of base
  const rel = path.relative(base, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new SkillPathError(`拒绝：检测到路径穿越（${relative}）`);
  }
  // if the candidate exists, its realpath must also stay within an allowed root
  // (defends against symlinks pointing outside)
  if (fs.existsSync(candidate)) {
    const real = realpathSafe(candidate);
    const roots = allowedRoots();
    const inside = roots.some(
      (r) => real === r || real.startsWith(r + path.sep),
    );
    if (!inside) {
      throw new SkillPathError("拒绝：符号链接指向白名单之外");
    }
  }
  return candidate;
}

/** Find which whitelisted root (if any) a given absolute path belongs to. */
export function rootForPath(absPath: string): SkillRoot | null {
  const real = realpathSafe(path.resolve(absPath));
  for (const root of skillRoots()) {
    const base = realpathSafe(path.resolve(root.dir));
    if (real === base || real.startsWith(base + path.sep)) return root;
  }
  return null;
}

export class SkillPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillPathError";
  }
}
