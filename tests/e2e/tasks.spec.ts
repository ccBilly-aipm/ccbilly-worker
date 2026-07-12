import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { e2ePaths } from "./paths";

/**
 * Opens the new-task dialog reliably. Prefers the empty-state "新建任务" button
 * (present on a fresh vault); falls back to the tasks-header "新建" button
 * (excludes the topbar quick-new which opens the command palette).
 */
async function openNewTaskDialog(page: Page): Promise<void> {
  const emptyBtn = page.getByRole("button", { name: "新建任务" });
  if (await emptyBtn.count()) {
    await emptyBtn.first().click();
  } else {
    // the tasks-header button; topbar's is aria-label "快速新建"
    await page
      .getByRole("button", { name: "新建", exact: true })
      .last()
      .click();
  }
  await expect(page.getByRole("heading", { name: "新建任务" })).toBeVisible();
}

/**
 * M2 core journey (spec §10 acceptance): create task → change status → 动态 log
 * updates → the .md on disk reflects it (Markdown-first). Also proves the
 * Obsidian-style external-edit auto-refresh.
 */

test("create a task and verify it is written to a .md file", async ({ page }) => {
  const { vault } = e2ePaths();

  await page.goto("/tasks");
  await openNewTaskDialog(page);

  const uniqueTitle = "E2E 任务 蓝图";
  await page.getByPlaceholder(/接入 Excalidraw/).fill(uniqueTitle);
  await page.getByRole("button", { name: "创建" }).click();

  // card shows up on the board
  await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });

  // a corresponding .md file exists in the isolated vault
  const tasksDir = path.join(vault, "tasks");
  await expect
    .poll(() => {
      const files = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir) : [];
      return files.some((f) => {
        const c = fs.readFileSync(path.join(tasksDir, f), "utf8");
        return c.includes(uniqueTitle) && c.includes("## 动态") && c.includes("创建任务");
      });
    }, { timeout: 10_000 })
    .toBe(true);
});

test("changing status appends a 动态 log entry (kanban invariant)", async ({
  page,
}) => {
  const { vault } = e2ePaths();
  const tasksDir = path.join(vault, "tasks");

  await page.goto("/tasks");
  await openNewTaskDialog(page);
  const title = "E2E 状态流转";
  await page.getByPlaceholder(/接入 Excalidraw/).fill(title);
  await page.getByRole("button", { name: "创建" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // open the drawer by clicking the card
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // click the 进行中 status chip inside the drawer
  await page.getByRole("button", { name: "进行中", exact: true }).click();

  // the drawer timeline should show a status transition
  await expect(page.getByText(/→ 进行中/)).toBeVisible({ timeout: 10_000 });

  // and the .md file on disk records it
  await expect
    .poll(() => {
      const files = fs.readdirSync(tasksDir);
      return files.some((f) => {
        const c = fs.readFileSync(path.join(tasksDir, f), "utf8");
        return c.includes(title) && c.includes("→ 进行中");
      });
    }, { timeout: 10_000 })
    .toBe(true);
});

test("external file edit (Obsidian) auto-refreshes the UI within seconds", async ({
  page,
}) => {
  const { vault } = e2ePaths();
  const tasksDir = path.join(vault, "tasks");
  fs.mkdirSync(tasksDir, { recursive: true });

  // simulate Obsidian writing a new task file directly
  const external = "Obsidian 外部写入任务";
  const md = `---
id: task-ext-obsidian
type: task
title: ${external}
status: todo
priority: P2
progress: 0
created: 2026-07-10T10:00:00+08:00
updated: 2026-07-10T10:00:00+08:00
---
外部创建

## 动态
- 2026-07-10 10:00 · 创建任务
`;
  fs.writeFileSync(path.join(tasksDir, "20260710-obsidian-ext.md"), md);

  await page.goto("/tasks");
  // The chokidar watcher indexes the new file, then the client polls every ~4s.
  // CI filesystems deliver fs events with more latency than local, so allow
  // generous headroom (the feature itself is fast locally: ~5s).
  await expect(page.getByText(external)).toBeVisible({ timeout: 25_000 });
});
