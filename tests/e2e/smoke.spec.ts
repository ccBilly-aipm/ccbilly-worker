import { test, expect } from "@playwright/test";

/**
 * M1 smoke E2E (spec §3): dashboard renders, theme toggles with no console
 * errors, admin shows indexed data. The full user-journey E2E (task→daily→
 * weekly, kanban drag, Obsidian auto-refresh, skills temp-dir) land alongside
 * their milestones. RED LINE: E2E never touches real ~/.claude/skills/.
 */

test("dashboard loads and greets B哥", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await expect(page.getByText("B哥")).toBeVisible();
  // sidebar nav present
  await expect(page.getByRole("link", { name: "仪表盘" })).toBeVisible();

  // no console errors on first paint
  expect(errors, `console errors: ${errors.join("\n")}`).toHaveLength(0);
});

test("theme toggle switches html class without console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  const html = page.locator("html");
  // default theme is dark
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "切换主题" }).click();
  await expect(html).toHaveClass(/light/);

  await page.getByRole("button", { name: "切换主题" }).click();
  await expect(html).toHaveClass(/dark/);

  expect(errors, `console errors: ${errors.join("\n")}`).toHaveLength(0);
});

test("admin overview shows indexed entries and no repair items", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "数据概览" }),
  ).toBeVisible();
  // repair list should be empty for a clean seed
  await expect(page.getByText("待修复文件 · 0")).toBeVisible();
});

test("command palette opens with Cmd/Ctrl+K", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder(/搜索任务/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder(/搜索任务/)).not.toBeVisible();
});
