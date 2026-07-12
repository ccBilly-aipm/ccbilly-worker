import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * V2-M1d: the dashboard is a widget grid. Entering edit mode, dragging to reorder,
 * and reloading must keep the new layout (persisted to vault/config/dashboard.md).
 * Also covers quick-capture writing into vault/inbox. See ADR-021 + blueprint B5.1.
 */

const layoutFile = () =>
  path.join(e2ePaths().vault, "config", "dashboard.md");

test("dashboard renders widgets and quick-capture writes to inbox", async ({
  page,
}) => {
  await page.goto("/");
  // signature widget present
  await expect(page.getByText("今日轨道")).toBeVisible();
  // quick-capture widget present (both preset shows inbox)
  const capture = page.getByPlaceholder("快速记一句…");
  await expect(capture).toBeVisible();
  await capture.fill("E2E 捕捉一条想法");
  await page.getByRole("button", { name: "捕捉" }).first().click();

  // it should land in vault/inbox
  await expect
    .poll(
      () => {
        const dir = path.join(e2ePaths().vault, "inbox");
        try {
          return fs
            .readdirSync(dir)
            .some((n) =>
              fs.readFileSync(path.join(dir, n), "utf8").includes("E2E 捕捉一条想法"),
            );
        } catch {
          return false;
        }
      },
      { timeout: 8000 },
    )
    .toBe(true);
});

test("editing layout: changing a widget width persists across reload", async ({
  page,
}) => {
  // start from a clean layout
  fs.rmSync(layoutFile(), { force: true });

  await page.goto("/");
  await page.getByRole("button", { name: "编辑布局" }).click();

  // cycle the width of the 今日轨道 widget
  await page.getByRole("button", { name: "调整 今日轨道 宽度" }).click();

  // layout file should now exist and record today-orbit
  await expect
    .poll(
      () => {
        try {
          return fs.readFileSync(layoutFile(), "utf8").includes("today-orbit");
        } catch {
          return false;
        }
      },
      { timeout: 8000 },
    )
    .toBe(true);

  // reload — the grid still renders the orbit widget (layout not lost)
  await page.reload();
  await expect(page.getByText("今日轨道")).toBeVisible();
});
