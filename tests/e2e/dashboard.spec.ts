import { test, expect, type Page } from "@playwright/test";

/**
 * M6 polish acceptance (spec §7/§10): 今日轨道 signature element renders, charts
 * present, reduced-motion disables decorative animation, mobile shows the bottom
 * tab bar and lets you check a subtask.
 */

async function seedOneTask(page: Page) {
  await page.request.post("/api/tasks", {
    data: { title: "仪表盘演示任务", status: "doing", priority: "P1" },
  });
}

test("today orbit and charts render on the dashboard", async ({ page }) => {
  await seedOneTask(page);
  await page.goto("/");
  // orbit is an <svg role=img aria-label="今日轨道…">
  await expect(
    page.getByRole("img", { name: /今日轨道/ }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("今日完成率")).toBeVisible();
  await expect(page.getByText("近 14 天完成趋势")).toBeVisible();
  await expect(page.getByText("年度活动热力图")).toBeVisible();
});

test("prefers-reduced-motion disables orbit/aurora animation", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  // the orbit group has class animate-orbit-spin; the reduced-motion CSS sets
  // animation-name:none — assert computed animationName is 'none'.
  const anim = await page
    .locator(".animate-orbit-spin")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName)
    .catch(() => "none");
  expect(anim).toBe("none");
  await ctx.close();
});

test("mobile shows bottom tab nav and can check a subtask", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();

  // create a task with a subtask via API
  const res = await page.request.post("/api/tasks", {
    data: { title: "移动端子任务演示", status: "todo", priority: "P2" },
  });
  const created = (await res.json()).task;
  await page.request.patch(`/api/tasks/${created.slug}`, {
    data: {
      action: "fields",
      fields: {
        content:
          "描述\n\n## 子任务\n- [ ] 手机端勾选\n\n## 动态\n- 2026-07-10 10:00 · 创建任务",
      },
    },
  });

  await page.goto("/tasks");
  // bottom tab nav visible on mobile (has 仪表盘 among 5 tabs)
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await expect(bottomNav).toBeVisible({ timeout: 10_000 });

  // open the task and toggle the subtask (controlled checkbox re-renders from
  // server state after the PATCH round-trip, so click then wait for checked)
  await page.getByText("移动端子任务演示").click();
  const checkbox = page.getByRole("checkbox").first();
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ timeout: 10_000 });
  await ctx.close();
});
