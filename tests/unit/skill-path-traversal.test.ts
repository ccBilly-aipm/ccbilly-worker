import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * S1-2 adversarial path-traversal + symlink-escape suite for the Skill guard.
 * These write to the REAL ~/.claude/skills in production, so the guard is a red
 * line. Everything here runs against a temp root (ADR-009). See SECURITY_AUDIT §S1-2.
 *
 * The critical case (previously UNCOVERED): writing a NOT-yet-existing file
 * through a symlinked parent dir. The old guard only ran the realpath check when
 * the candidate already existed, so a write to `evil/SKILL.md` (evil → outside)
 * escaped the whitelist.
 */
let base: string;
let skillsRoot: string;
let outside: string;

beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-trav-"));
  skillsRoot = path.join(base, "skills");
  outside = path.join(base, "outside");
  fs.mkdirSync(skillsRoot, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET");
  process.env.CCBILLY_SKILLS_TEST_ROOT = skillsRoot;
});

afterEach(() => {
  fs.rmSync(base, { recursive: true, force: true });
  delete process.env.CCBILLY_SKILLS_TEST_ROOT;
});

function canSymlink(): boolean {
  const probe = path.join(base, "__probe_link");
  try {
    fs.symlinkSync(outside, probe, "dir");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

describe("S1-2 resolveWithinRoot — traversal vectors (RED LINE)", () => {
  it("rejects relative ../ traversal, URL-encoded, backslash and absolute forms", async () => {
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    const vectors = [
      "../outside/secret.txt",
      "../../etc/passwd",
      "foo/../../outside/secret.txt",
      "..",
      "../",
      "..\\..\\outside\\secret.txt", // windows-style backslash traversal
      path.join(outside, "secret.txt"), // absolute injection
      "/etc/passwd",
    ];
    for (const v of vectors) {
      expect(() => resolveWithinRoot(root, v), `vector: ${v}`).toThrow(
        SkillPathError,
      );
    }
  });

  it("treats a URL-encoded ../ that was NOT decoded as a literal in-root name (defense-in-depth: guard receives already-decoded input)", async () => {
    // %2e%2e%2f is not a real separator lexically, so path.resolve keeps it as a
    // literal filename inside root — safe. The guard must NOT itself decode it
    // into an escape. (API-layer double-decoding is separately prevented.)
    const { resolveWithinRoot, skillRoots } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    const p = resolveWithinRoot(root, "%2e%2e%2foutside");
    expect(p.startsWith(fs.realpathSync(skillsRoot))).toBe(true);
  });

  it("rejects NUL byte / control chars in the path", async () => {
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    expect(() => resolveWithinRoot(root, "a\0b/SKILL.md")).toThrow(SkillPathError);
  });

  it("allows legitimate in-root paths", async () => {
    const { resolveWithinRoot, skillRoots } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    const p = resolveWithinRoot(root, path.join("my-skill", "SKILL.md"));
    expect(p.startsWith(fs.realpathSync(skillsRoot))).toBe(true);
  });
});

describe("S1-2 symlink escape (RED LINE)", () => {
  it("rejects reading through a symlink whose target exists outside", async () => {
    if (!canSymlink()) return;
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    fs.symlinkSync(outside, path.join(skillsRoot, "escape"), "dir");
    expect(() =>
      resolveWithinRoot(root, path.join("escape", "secret.txt")),
    ).toThrow(SkillPathError);
  });

  it("rejects WRITING a not-yet-existing file through a symlinked parent dir", async () => {
    if (!canSymlink()) return;
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    // evil → outside (target dir exists, but the file we write does not yet exist)
    fs.symlinkSync(outside, path.join(skillsRoot, "evil"), "dir");
    // THE HOLE: candidate does not exist → old guard skipped realpath check.
    expect(() =>
      resolveWithinRoot(root, path.join("evil", "SKILL.md")),
    ).toThrow(SkillPathError);
  });

  it("saveSkill cannot escape the root via a symlinked skill dir", async () => {
    if (!canSymlink()) return;
    const { saveSkill } = await import("../../src/lib/skills/skill-service");
    fs.symlinkSync(outside, path.join(skillsRoot, "evil"), "dir");
    await expect(
      saveSkill({
        level: "personal",
        name: "evil",
        frontmatter: { name: "evil", description: "有效描述文本" },
        body: "payload",
      }),
    ).rejects.toThrow();
    // and nothing was written outside
    expect(fs.existsSync(path.join(outside, "SKILL.md"))).toBe(false);
  });

  it("backup (.trash) path cannot be redirected outside via a symlink", async () => {
    if (!canSymlink()) return;
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    // .trash itself is a symlink to outside
    fs.symlinkSync(outside, path.join(skillsRoot, ".trash"), "dir");
    expect(() =>
      resolveWithinRoot(root, path.join(".trash", "123", "x", "SKILL.md")),
    ).toThrow(SkillPathError);
  });
});
