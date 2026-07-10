import { test, expect, type Page } from "@playwright/test";

/**
 * M5 journey (spec §10): register an app via admin → it appears in the app
 * center; iframe mode degrades gracefully when embedding is refused; admin auth
 * gate + git panel render.
 */

async function login(page: Page) {
  await page.goto("/admin");
  const field = page.getByPlaceholder("ADMIN_PASSCODE");
  if (await field.isVisible().catch(() => false)) {
    await field.fill("e2e-pass");
    await page.getByRole("button", { name: "进入" }).click();
    await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible({
      timeout: 10_000,
    });
  }
}

test("register an app in admin and see it in the app center", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "应用管理" }).click();
  await page.getByRole("button", { name: "新建应用" }).click();

  await page.getByPlaceholder("🧩").fill("🗒️");
  // name field is the first input in the form card
  const nameInput = page.locator(".input").first();
  await nameInput.fill("演示笔记应用");
  await page.getByPlaceholder("https://…").fill("https://example.com");
  await page.getByRole("button", { name: "保存" }).click();

  // it appears in the admin list
  await expect(page.getByText("演示笔记应用").first()).toBeVisible({
    timeout: 10_000,
  });

  // and in the public app center
  await page.goto("/apps");
  await expect(page.getByText("演示笔记应用")).toBeVisible({ timeout: 10_000 });
});

test("iframe app degrades gracefully when embedding is refused", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "应用管理" }).click();
  await page.getByRole("button", { name: "新建应用" }).click();

  const nameInput = page.locator(".input").first();
  await nameInput.fill("被拒内嵌站点");
  // github.com sends X-Frame-Options: deny → must show the fallback card
  await page.getByRole("combobox").first().selectOption("iframe");
  await page.getByPlaceholder("https://…").fill("https://github.com");
  await page.getByRole("button", { name: "保存" }).click();

  await page.goto("/apps");
  await page.getByText("被拒内嵌站点").click();
  // fallback card with a "在新窗口打开" action
  await expect(page.getByText("无法内嵌此应用")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("link", { name: /在新窗口打开/ }).first(),
  ).toBeVisible();
});

test("git panel renders (repo present, or shows guidance)", async ({ page }) => {
  await login(page);
  await page.goto("/admin/git");
  // wait for the async git-status load to resolve past the loading state
  await expect(page.getByText("加载 Git 状态…")).toBeHidden({ timeout: 10_000 });
  // either the quick-commit action (repo present) or the no-repo guidance
  const commit = page.getByRole("button", { name: /快速提交/ });
  const noRepo = page.getByText(/未检测到 Git 仓库/);
  const ok =
    (await commit.count()) > 0 || (await noRepo.count()) > 0;
  expect(ok).toBe(true);
});
