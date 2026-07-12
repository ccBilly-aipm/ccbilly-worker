/**
 * README screenshots (S3-3). Drives a running production server with seeded demo
 * data and captures the signature views (dark dashboard, kanban, daily report,
 * plus a light/dark pair) into docs/screenshots/. Re-runnable after UI changes.
 *
 * Usage (the pnpm script wires this up):
 *   pnpm screenshots
 * which: seeds an isolated vault → builds → starts a server → shoots → tears down.
 *
 * If a server is already running, pass SHOT_BASE=http://localhost:PORT and only
 * the capture step runs.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "docs", "screenshots");

async function shoot(page: Page, route: string, file: string, opts?: { full?: boolean }) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  // let entrance animations settle
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage: opts?.full ?? false,
  });
  console.log(`  ✓ ${file}`);
}

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
}

async function setPreset(active: "pm" | "creator" | "both") {
  await fetch(`${BASE}/api/preset`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
    body: JSON.stringify({ active, onboarded: true }),
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina-crisp
    colorScheme: "dark",
  });
  const page = await context.newPage();

  console.log(`shooting ${BASE} → ${OUT}`);

  // Dark theme signature shots (default 双修 preset)
  await setPreset("both");
  await setTheme(page, "dark");
  await shoot(page, "/", "dashboard-dark.png");
  await shoot(page, "/tasks", "kanban-dark.png");
  await shoot(page, "/reports/daily", "daily-dark.png");

  // Two-preset dashboard comparison (V2 dual-role)
  await setPreset("pm");
  await shoot(page, "/", "dashboard-pm.png");
  await setPreset("creator");
  await shoot(page, "/", "dashboard-creator.png");

  // Light theme dashboard (for the light/dark pair)
  await setPreset("both");
  await setTheme(page, "light");
  await shoot(page, "/", "dashboard-light.png");

  await browser.close();
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
