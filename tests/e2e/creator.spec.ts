import { test, expect } from "@playwright/test";

/**
 * V2-M3 creator module pack: idea → content pipeline → detail (platforms +
 * metrics); and the feed source SSRF guard (legal source accepted, private
 * address rejected). See blueprint B4.
 */

test("idea creation surfaces in the content pipeline; detail records metrics", async ({
  page,
}) => {
  // create an idea
  await page.goto("/ideas");
  await page.getByRole("button", { name: "记个选题" }).click();
  await page.getByPlaceholder("选题标题…").fill("E2E 内容选题");
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/ideas") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "添加" }).click(),
  ]);
  await expect(page.getByText("E2E 内容选题")).toBeVisible({ timeout: 10_000 });

  // it appears in the content pipeline's 选题 column
  await page.goto("/content");
  await expect(page.getByText("E2E 内容选题")).toBeVisible({ timeout: 10_000 });

  // open its detail, pick a platform, record a metric snapshot
  await page.getByRole("link", { name: /打开 E2E 内容选题/ }).click();
  await expect(page.getByRole("heading", { name: "E2E 内容选题" })).toBeVisible();

  await page.getByRole("button", { name: "公众号" }).click();
  await expect(page.getByText("一稿多平台适配清单")).toBeVisible();

  await page.getByLabel("阅读/播放").fill("1234");
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/metrics") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "录入快照" }).click(),
  ]);
  await expect(page.getByText(/已录入 1 条快照/)).toBeVisible({ timeout: 8000 });
});

test("feed: a legal public source is accepted, a private address is rejected", async ({
  page,
}) => {
  await page.goto("/feeds");
  await expect(page.getByRole("heading", { name: "情报源" })).toBeVisible();

  // private address → rejected with a security message (no source added)
  await page.getByPlaceholder("https://example.com/feed.xml").fill("http://127.0.0.1:8003/rss");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/feeds") && r.request().method() === "POST"),
    page.getByRole("button", { name: "添加" }).click(),
  ]);
  // the rejection message renders (SSRF guard blocked the internal target)
  await expect(page.getByText(/受限地址|被安全策略拒绝/)).toBeVisible({
    timeout: 5000,
  });

  // public IP literal → accepted (no DNS needed; guard passes)
  await page.getByPlaceholder("https://example.com/feed.xml").fill("https://1.1.1.1/feed.xml");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/feeds") && r.request().method() === "POST"),
    page.getByRole("button", { name: "添加" }).click(),
  ]);
  await expect(page.getByRole("button", { name: /删除/ }).first()).toBeVisible({
    timeout: 8000,
  });
});
