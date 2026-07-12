import { test, expect } from "@playwright/test";

/**
 * V2-M2 PM module pack: creating requirements + RICE scoring orders them
 * correctly; the burndown page renders for a cycle. See blueprint B3.
 */

test("requirement RICE scoring orders the pool correctly", async ({ page }) => {
  await page.goto("/requirements");
  await expect(
    page.getByRole("heading", { name: "需求池", exact: true }),
  ).toBeVisible();

  // create two requirements (wait for each POST to complete)
  for (const title of ["低价值需求", "高价值需求"]) {
    await page.getByRole("button", { name: "新建需求" }).click();
    await page.getByPlaceholder("需求标题…").fill(title);
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/requirements") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "添加" }).click(),
    ]);
    expect(resp.ok()).toBe(true);
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  }

  // score 高价值需求 high (RICE inputs R/I/C/E), 低价值需求 low
  const high = page.locator("li", { hasText: "高价值需求" });
  await high.getByLabel("R reach").fill("100");
  await high.getByLabel("R reach").blur();
  await high.getByLabel("I impact").fill("5");
  await high.getByLabel("I impact").blur();

  const low = page.locator("li", { hasText: "低价值需求" });
  await low.getByLabel("R reach").fill("5");
  await low.getByLabel("R reach").blur();

  // after refresh, within the 收集 stage column the high one sorts first
  await page.waitForTimeout(800);
  await page.reload();

  const titles = await page
    .locator("li", { has: page.locator("input[aria-label='R reach']") })
    .locator("span.truncate")
    .allInnerTexts();
  const hi = titles.indexOf("高价值需求");
  const lo = titles.indexOf("低价值需求");
  expect(hi).toBeGreaterThanOrEqual(0);
  expect(lo).toBeGreaterThanOrEqual(0);
  expect(hi).toBeLessThan(lo); // higher RICE listed first
});

test("cycle page renders a burndown for a collection with a cycle", async ({
  page,
  request,
}) => {
  // ensure at least one collection exists (E2E vault starts empty)
  const created = await request.post("/api/collections", {
    headers: { "x-ccbilly-admin": "1" },
    data: { title: "冲刺合集", description: "E2E" },
  });
  expect(created.ok()).toBe(true);

  await page.goto("/cycles");
  await expect(
    page.getByRole("heading", { name: "周期", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("开启一个周期")).toBeVisible();

  // start a cycle on the collection
  const start = page.locator("input[type='date']").first();
  const end = page.locator("input[type='date']").nth(1);
  await start.fill("2026-07-01");
  await end.fill("2026-07-14");
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/cycles") && r.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: "开启" }).click(),
  ]);

  // a burndown card appears with the cycle date range
  await expect(page.getByText(/2026-07-01 → 2026-07-14/)).toBeVisible({
    timeout: 8000,
  });
});
