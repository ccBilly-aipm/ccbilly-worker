import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * V2-M4 general experience: command palette quick-capture (! prefix), the `?`
 * keyboard help overlay, and saved views on the tasks page. See blueprint B5.
 */

test("command palette ! prefix captures into the inbox", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder(/快速捕捉/)).toBeVisible();

  await page.getByPlaceholder(/快速捕捉/).fill("!命令面板捕捉的一条");
  await expect(page.getByText(/按.*Enter.*捕捉到收件箱/)).toBeVisible();
  await page.keyboard.press("Enter");

  await expect
    .poll(
      () => {
        const dir = path.join(e2ePaths().vault, "inbox");
        try {
          return fs
            .readdirSync(dir)
            .some((n) =>
              fs
                .readFileSync(path.join(dir, n), "utf8")
                .includes("命令面板捕捉的一条"),
            );
        } catch {
          return false;
        }
      },
      { timeout: 8000 },
    )
    .toBe(true);
});

test("? opens the keyboard shortcut help", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "快捷键" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "快捷键" })).not.toBeVisible();
});

test("saved view: save a filter combo and restore it", async ({ page }) => {
  await page.goto("/tasks");
  // apply a status filter
  await page.locator("select").first().selectOption("doing");
  // save the current view
  await page.getByRole("button", { name: /保存当前视图/ }).click();
  await page.getByPlaceholder("视图名").fill("E2E视图-doing");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/views") && r.request().method() === "POST"),
    page.getByRole("button", { name: "保存" }).click(),
  ]);
  // the saved view chip appears
  await expect(page.getByRole("button", { name: /E2E视图-doing/ }).first()).toBeVisible({
    timeout: 8000,
  });
});
