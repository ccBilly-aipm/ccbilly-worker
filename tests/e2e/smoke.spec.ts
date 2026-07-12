import { test, expect } from "@playwright/test";

/**
 * M1 smoke E2E (spec §3): dashboard renders, theme toggles with no console
 * errors, admin shows indexed data. The full user-journey E2E (task→daily→
 * weekly, kanban drag, Obsidian auto-refresh, skills temp-dir) land alongside
 * their milestones. RED LINE: E2E never touches real ~/.claude/skills/.
 */

test("dashboard loads and greets the configured name", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  // default display name is the neutral 「朋友」 (S3 de-personalization); the
  // greeting embeds it (e.g. 「下午好，朋友」).
  await expect(page.getByText("朋友")).toBeVisible();
  // sidebar nav present (both desktop sidebar and mobile bottom nav have this
  // link; assert at least one is visible)
  await expect(page.getByRole("link", { name: "仪表盘" }).first()).toBeVisible();

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

test("admin requires passcode, then shows overview", async ({ page }) => {
  await page.goto("/admin");
  // gated by ADMIN_PASSCODE (set to e2e-pass in the test server)
  await expect(page.getByPlaceholder("ADMIN_PASSCODE")).toBeVisible();
  await page.getByPlaceholder("ADMIN_PASSCODE").fill("e2e-pass");
  await page.getByRole("button", { name: "进入" }).click();
  await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible({
    timeout: 10_000,
  });
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
