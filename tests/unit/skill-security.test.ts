import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Skill path-traversal red-line tests (spec §6.5). These are the most important
 * tests in the project: any way to read/write outside the whitelisted skills
 * root MUST be rejected. Everything runs against a temp skills root — the real
 * ~/.claude/skills is never touched (ADR-009).
 */
let skillsRoot: string;
let outside: string;

beforeEach(() => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-skill-"));
  skillsRoot = path.join(base, "skills");
  outside = path.join(base, "secret");
  fs.mkdirSync(skillsRoot, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET");
  process.env.CCBILLY_SKILLS_TEST_ROOT = skillsRoot;
});

afterEach(() => {
  fs.rmSync(path.dirname(skillsRoot), { recursive: true, force: true });
  delete process.env.CCBILLY_SKILLS_TEST_ROOT;
});

describe("path traversal guard (RED LINE)", () => {
  it("rejects ../ escape attempts", async () => {
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    for (const evil of [
      "../secret/secret.txt",
      "../../etc/passwd",
      "foo/../../secret/secret.txt",
      "..",
      "../",
    ]) {
      expect(() => resolveWithinRoot(root, evil)).toThrow(SkillPathError);
    }
  });

  it("rejects absolute path injection", async () => {
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    expect(() => resolveWithinRoot(root, path.join(outside, "secret.txt"))).toThrow(
      SkillPathError,
    );
    expect(() => resolveWithinRoot(root, "/etc/passwd")).toThrow(SkillPathError);
  });

  it("allows legitimate paths within the root", async () => {
    const { resolveWithinRoot, skillRoots } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    const p = resolveWithinRoot(root, path.join("my-skill", "SKILL.md"));
    expect(p.startsWith(skillsRoot)).toBe(true);
  });

  it("rejects a symlink pointing outside the root", async () => {
    const { resolveWithinRoot, skillRoots, SkillPathError } = await import(
      "../../src/lib/skills/paths"
    );
    const root = skillRoots()[0];
    const linkPath = path.join(skillsRoot, "escape");
    try {
      fs.symlinkSync(outside, linkPath, "dir");
    } catch {
      return; // symlink not permitted in this env; skip
    }
    expect(() =>
      resolveWithinRoot(root, path.join("escape", "secret.txt")),
    ).toThrow(SkillPathError);
  });
});

describe("skill scan + validate + save (temp root)", () => {
  function writeSkill(name: string, fm: string, body = "内容") {
    const dir = path.join(skillsRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n${body}\n`);
  }

  it("scans SKILL.md files across the root", async () => {
    writeSkill("alpha", "name: alpha\ndescription: 能力A 触发A");
    writeSkill("beta", "name: beta\ndescription: 能力B 触发B");
    const { scanSkills } = await import("../../src/lib/skills/skill-service");
    const skills = scanSkills();
    expect(skills.map((s) => s.name).sort()).toEqual(["alpha", "beta"]);
    expect(skills[0].description).toContain("能力");
  });

  it("validates name and description rules", async () => {
    const { validateSkill } = await import("../../src/lib/skills/skill-service");
    expect(validateSkill({ name: "Bad Name", description: "x" })).toContain("name");
    expect(validateSkill({ name: "ok-name", description: "" })).toContain(
      "description",
    );
    expect(validateSkill({ name: "ok-name", description: "有效描述" })).toBeNull();
  });

  it("saving preserves unknown frontmatter fields and backs up the old file", async () => {
    writeSkill(
      "gamma",
      "name: gamma\ndescription: 旧描述\nallowed-tools: [Read, Write]\nargument-hint: <x>",
    );
    const { saveSkill, getSkillDetail } = await import(
      "../../src/lib/skills/skill-service"
    );
    const detail = getSkillDetail("personal", "gamma")!;
    await saveSkill({
      level: "personal",
      name: "gamma",
      frontmatter: { ...detail.frontmatter, description: "新描述" },
      body: "新正文",
    });
    const updated = getSkillDetail("personal", "gamma")!;
    expect(updated.frontmatter.description).toBe("新描述");
    // unknown fields survived
    expect(updated.frontmatter["allowed-tools"]).toEqual(["Read", "Write"]);
    expect(updated.frontmatter["argument-hint"]).toBe("<x>");
    // a backup exists in .trash
    const trashExists = fs.existsSync(path.join(skillsRoot, ".trash"));
    expect(trashExists).toBe(true);
  });

  it("save rejects an invalid name (does not write)", async () => {
    writeSkill("delta", "name: delta\ndescription: 有效");
    const { saveSkill } = await import("../../src/lib/skills/skill-service");
    await expect(
      saveSkill({
        level: "personal",
        name: "delta",
        frontmatter: { name: "INVALID NAME", description: "x" },
        body: "y",
      }),
    ).rejects.toThrow(/name/);
  });
});
