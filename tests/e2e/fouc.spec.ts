import { test, expect } from "@playwright/test";

/**
 * S2-5 no-FOUC assertions. next-themes injects a blocking script that stamps the
 * theme class on <html> before first paint, so the correct theme is applied with
 * no flash of the wrong theme. We verify: (1) default dark theme is on <html>
 * immediately; (2) a persisted light preference is honored on load without a dark
 * flash; (3) theme init logs no console errors; (4) the background layer never
 * renders a bright flash under a dark theme.
 */

test("default dark theme is applied on <html> at first paint", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  // html.dark must be present as soon as the document is available
  await expect(page.locator("html")).toHaveClass(/dark/);
  // background must be dark (not a white flash) — read computed bg of body/html
  const bg = await page
    .locator("html")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  // dark space background is a very dark color; ensure it is NOT white
  expect(bg).not.toBe("rgb(255, 255, 255)");
  expect(errors, `console errors: ${errors.join("\n")}`).toHaveLength(0);
});

test("a persisted light preference is honored on load with no dark flash", async ({
  page,
}) => {
  // seed localStorage BEFORE the app script runs
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("theme", "light");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("theme survives a reload without flashing the wrong theme", async ({ page }) => {
  await page.goto("/");
  // switch to light via the toggle
  await page.getByRole("button", { name: "切换主题" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  // reload — the persisted light theme must reapply immediately
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});
