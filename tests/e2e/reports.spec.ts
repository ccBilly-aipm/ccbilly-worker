import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * M3 report journey (spec §10 full-chain): create a task → generate today's
 * daily (aggregated from the task's 动态) → edit → finalize → the .md reflects
 * status:final. This exercises the no-manual-copy pipeline end to end.
 */

async function createTask(page: Page, title: string) {
  await page.goto("/tasks");
  const emptyBtn = page.getByRole("button", { name: "新建任务" });
  if (await emptyBtn.count()) await emptyBtn.first().click();
  else await page.getByRole("button", { name: "新建", exact: true }).last().click();
  await page.getByPlaceholder(/接入 Excalidraw/).fill(title);
  await page.getByRole("button", { name: "创建" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
}

test("generate → edit → finalize a daily report from task activity", async ({
  page,
}) => {
  const { vault } = e2ePaths();
  await createTask(page, "报告链路任务");

  await page.goto("/reports/daily");
  await page.getByRole("button", { name: "生成日报" }).click();

  // the aggregated draft shows the fixed sections and the created task
  const editor = page.locator("textarea");
  await expect(editor).toBeVisible({ timeout: 10_000 });
  await expect(editor).toHaveValue(/今日完成/);
  await expect(editor).toHaveValue(/报告链路任务/);

  // edit: append a reflection
  await editor.fill(
    (await editor.inputValue()) + "\n- 今天完成了报告链路的联调",
  );
  await editor.blur();

  // finalize
  await page.getByRole("button", { name: "定稿" }).click();
  await expect(page.getByText("已定稿")).toBeVisible({ timeout: 10_000 });

  // the .md on disk is status:final and contains the reflection
  const dailyDir = path.join(vault, "reports", "daily");
  await expect
    .poll(() => {
      const files = fs.existsSync(dailyDir) ? fs.readdirSync(dailyDir) : [];
      return files.some((f) => {
        const c = fs.readFileSync(path.join(dailyDir, f), "utf8");
        return c.includes("status: final") && c.includes("报告链路的联调");
      });
    }, { timeout: 10_000 })
    .toBe(true);
});

test("weekly report generates with stats and charts", async ({ page }) => {
  await page.goto("/reports/weekly");
  // charts render (svg present) even before generating
  await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "生成周报" }).click();
  await expect(page.locator("textarea")).toHaveValue(/本周速览/, {
    timeout: 10_000,
  });
});
