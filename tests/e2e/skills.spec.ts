import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * M4 skill journey (spec §10 + red line): scan/view/edit a Claude Code Skill.
 * RED LINE: the E2E skills root is an isolated temp dir (CCBILLY_SKILLS_TEST_ROOT),
 * NEVER the real ~/.claude/skills. We create a fake SKILL.md there and drive the UI.
 */

function writeFakeSkill(skillsRoot: string, name: string, description: string) {
  const dir = path.join(skillsRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\nallowed-tools: [Read, Write]\n---\n# ${name}\n\n演示 skill 正文。\n`,
  );
  // an attachment to verify the file tree
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(dir, "scripts", "run.sh"), "echo hi\n");
}

test("scan lists a skill from the isolated skills root, view and edit it", async ({
  page,
}) => {
  const { skills } = e2ePaths();
  writeFakeSkill(skills, "demo-skill", "演示能力 + 触发场景说明");

  await page.goto("/skills");
  // Tab A is default
  await expect(page.getByText("Claude Code Skills").first()).toBeVisible();
  await expect(page.getByText("demo-skill")).toBeVisible({ timeout: 10_000 });

  // open the editor
  await page.getByText("demo-skill").click();
  await expect(page.getByRole("heading", { name: "编辑 Skill" })).toBeVisible();

  // the attachment tree shows scripts/
  await expect(page.getByText("scripts")).toBeVisible();

  // edit the description and save
  const descField = page.locator("textarea").first();
  await descField.fill("更新后的能力描述 + 触发场景");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible({ timeout: 10_000 });

  // the real (temp) SKILL.md reflects the edit and kept the unknown field
  const md = fs.readFileSync(
    path.join(skills, "demo-skill", "SKILL.md"),
    "utf8",
  );
  expect(md).toContain("更新后的能力描述");
  expect(md).toContain("allowed-tools"); // unknown field preserved
});

test("personal skill tree tab renders categories", async ({ page }) => {
  const { vault } = e2ePaths();
  // seed a vault skill so the tree has content
  const skillsDir = path.join(vault, "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, "e2e-skill.md"),
    `---\nid: skill-e2e\ntype: skill\nname: E2E技能\ncategory: 测试\nlevel: 3\ntarget_level: 5\nstatus: learning\n---\n## 学习记录\n- 2026-07-10 · 起步\n`,
  );
  // reindex so it's picked up
  await page.request.post("/api/admin/reindex");

  await page.goto("/skills");
  await page.getByRole("button", { name: /个人技能树/ }).click();
  await expect(page.getByText("E2E技能")).toBeVisible({ timeout: 10_000 });
});
