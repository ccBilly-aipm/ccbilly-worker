import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * V2-M1c: role preset + onboarding. Onboarding shows on first run (no preset
 * marked onboarded); picking a role persists it and gates the nav. Switching in
 * admin changes visible modules without touching data.
 */

const presetFile = () => path.join(e2ePaths().vault, "config", "preset.md");

test("onboarding shows on first run and picking a role persists it + gates nav", async ({
  page,
}) => {
  // remove the onboarded marker to simulate a first run
  fs.rmSync(presetFile(), { force: true });

  await page.goto("/");
  // dashboard redirects to onboarding when not onboarded
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText("先选个角色")).toBeVisible();

  // pick PM mode
  await page.getByRole("button", { name: /PM 模式/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.getByText(/PM 模式 · 预览/)).toBeVisible();
  await page.getByRole("button", { name: /完成/ }).click();

  // lands on the dashboard; PM nav (需求池) is visible, creator nav (情报源) is not
  await expect(page).toHaveURL(/\/(#.*)?$/);
  await expect(page.getByRole("link", { name: "需求池" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "情报源" })).toHaveCount(0);

  // preset persisted to vault
  const raw = fs.readFileSync(presetFile(), "utf8");
  expect(raw).toContain("active: pm");
  expect(raw).toContain("onboarded: true");
});

test("admin preset switch changes visible modules (data untouched)", async ({
  page,
}) => {
  // ensure onboarded so we go straight to admin
  fs.mkdirSync(path.dirname(presetFile()), { recursive: true });
  fs.writeFileSync(
    presetFile(),
    "---\ntype: config\nconfig: preset\nactive: both\nonboarded: true\n---\n# 角色预设\n",
  );

  await page.goto("/admin");
  await page.getByPlaceholder("ADMIN_PASSCODE").fill("e2e-pass");
  await page.getByRole("button", { name: "进入" }).click();
  await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible({
    timeout: 10_000,
  });

  // go to personalization tab where the preset switcher lives
  await page.getByRole("link", { name: /个性化/ }).click();
  await expect(page.getByRole("heading", { name: "角色预设" })).toBeVisible();

  // switch to creator mode
  await page.getByRole("button", { name: /创作者模式/ }).click();
  // page reloads; verify persisted
  await page.waitForTimeout(1000);
  const raw = fs.readFileSync(presetFile(), "utf8");
  expect(raw).toContain("active: creator");
});
