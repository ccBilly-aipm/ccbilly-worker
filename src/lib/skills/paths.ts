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

/** True if `p` equals `root` or is a strict descendant of it. */
function isInside(p: string, root: string): boolean {
  return p === root || p.startsWith(root + path.sep);
}

/**
 * Realpath of the nearest EXISTING ancestor of `candidate`, joined with the
 * remaining not-yet-existing tail. This is the crux of the S1-2 fix: it resolves
 * symlinks even when `candidate` itself does not exist yet (e.g. a file about to
 * be written), so a symlinked parent dir can't smuggle a write outside the root.
 */
function realpathOfNearestAncestor(candidate: string): string {
  let existing = candidate;
  const tail: string[] = [];
  // Walk up until we hit a path that exists (root "/" always exists).
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break; // reached filesystem root
    tail.unshift(path.basename(existing));
    existing = parent;
  }
  const realBase = realpathSafe(existing);
  return tail.length ? path.join(realBase, ...tail) : realBase;
}

/**
 * Resolve a candidate path and assert it lives inside one of the whitelisted
 * roots. Throws on any traversal attempt. Returns the safe absolute path
 * (realpath-normalized so callers operate on the true location).
 *
 * Defense layers (S1-2 / ADR-014):
 *  1. reject NUL bytes and absolute/backslash-traversal injection lexically;
 *  2. reject `../` escape via path.relative on the lexically-resolved candidate;
 *  3. resolve the realpath of the nearest existing ancestor + tail — even for
 *     not-yet-existing write targets — and assert it stays within an allowed
 *     root. This defeats symlinked parent dirs on write paths (the real hole).
 *
 * @param root  the SkillRoot the caller intends to operate within
 * @param relative  a path relative to root.dir (may be "" for the root itself)
 */
export function resolveWithinRoot(root: SkillRoot, relative: string): string {
  // reject NUL / control byte injection before it reaches any fs call
  if (relative.includes("\0")) {
    throw new SkillPathError("拒绝：路径包含非法字符");
  }
  // reject absolute or drive-letter injection outright
  if (path.isAbsolute(relative)) {
    throw new SkillPathError("拒绝：不允许绝对路径");
  }
  // treat backslashes as separators too, so `..\..\x` is caught as traversal
  // on POSIX (where path.relative would otherwise see one odd filename)
  const normalizedRel = relative.replace(/\\/g, "/");
  if (normalizedRel.split("/").some((seg) => seg === "..")) {
    throw new SkillPathError(`拒绝：检测到路径穿越（${relative}）`);
  }

  const base = realpathSafe(path.resolve(root.dir));
  const candidate = path.resolve(base, normalizedRel);
  // lexical descendant check
  const rel = path.relative(base, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new SkillPathError(`拒绝：检测到路径穿越（${relative}）`);
  }

  // realpath check that also covers not-yet-existing write targets: resolve the
  // nearest existing ancestor's real location and re-check containment against
  // the realpath of EVERY allowed root.
  const real = realpathOfNearestAncestor(candidate);
  const roots = allowedRoots();
  if (!roots.some((r) => isInside(real, r))) {
    throw new SkillPathError("拒绝：符号链接指向白名单之外");
  }
  return real;
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
