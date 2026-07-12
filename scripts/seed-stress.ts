/**
 * Stress dataset (S2-4): 2000 tasks + 730 daily reports + 200 knowledge notes
 * + a handful of collections, to measure dashboard / task-list server response
 * under load. Writes real vault/*.md then rebuilds the index once.
 *
 * Run: `pnpm seed:stress` — WARNING: overwrites vault/ demo data with a large set.
 * Intended for benchmarking on a throwaway/CI vault, not your real data.
 */
import fs from "node:fs";
import path from "node:path";
import { vaultTypeDir, vaultDir } from "../src/lib/config";
import { stringifyDoc } from "../src/lib/markdown/frontmatter";
import { rebuildIndex } from "../src/lib/index/indexer";

const TASKS = Number(process.env.STRESS_TASKS ?? 2000);
const DAILIES = Number(process.env.STRESS_DAILIES ?? 730);
const NOTES = Number(process.env.STRESS_NOTES ?? 200);

const STATUSES = ["todo", "doing", "blocked", "done", "archived"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const COLLECTIONS = ["开源项目接入", "工作台自建", "学习成长", "调研归档", "运维杂项"];

function iso(daysAgo: number): string {
  const d = new Date(2026, 6, 10);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function dateKey(daysAgo: number): string {
  const d = new Date(2026, 6, 10);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function writeFile(dir: string, name: string, data: Record<string, unknown>, body: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), stringifyDoc(data, body));
}

function seedCollections() {
  const dir = vaultTypeDir("collection");
  for (const title of COLLECTIONS) {
    writeFile(dir, `${title}.md`, {
      id: `col-${title}`, type: "collection", title, status: "active",
      description: `${title}（压测数据）`, created: iso(60), updated: iso(1),
    }, `${title} 压测合集\n`);
  }
}

function seedTasks() {
  const dir = vaultTypeDir("task");
  for (let i = 0; i < TASKS; i++) {
    const status = STATUSES[i % STATUSES.length];
    const col = COLLECTIONS[i % COLLECTIONS.length];
    const createdAgo = i % 200;
    const body =
      `压测任务 ${i}\n\n## 子任务\n- [ ] 子任务 A\n- [x] 子任务 B\n\n## 动态\n` +
      `- ${dateKey(createdAgo)} 09:00 · 创建任务\n- ${dateKey(Math.max(0, createdAgo - 1))} 15:00 · 推进\n`;
    writeFile(dir, `stress-${String(i).padStart(5, "0")}.md`, {
      id: `task-stress-${i}`, type: "task", title: `压测任务 ${i}`, status,
      priority: PRIORITIES[i % PRIORITIES.length], collection: `[[${col}]]`,
      tags: ["压测", status], progress: status === "done" ? 100 : (i % 10) * 10,
      created: iso(createdAgo), updated: iso(Math.max(0, createdAgo - 1)),
    }, body);
  }
}

function seedDailies() {
  const dir = vaultTypeDir("daily");
  for (let ago = 0; ago < DAILIES; ago++) {
    const key = dateKey(ago);
    const body = `## 今日完成\n- 压测项 ${ago}\n\n## 进行中\n- 项 ${ago}\n\n## 遇到的问题\n- 暂无\n\n## 明日计划\n- 继续\n\n## 随想\n- ok\n`;
    writeFile(dir, `${key}.md`, {
      date: key, type: "daily", status: "final", generated_at: iso(ago),
    }, body);
  }
}

function seedKnowledge() {
  const dir = path.join(vaultDir(), "knowledge");
  for (let i = 0; i < NOTES; i++) {
    const body = `# 压测笔记 ${i}\n\n关联 [[压测笔记 ${(i + 1) % NOTES}]] 与 [[工作台自建]]。\n\n- 要点一\n- 要点二\n\n\`\`\`ts\nconst n = ${i};\n\`\`\`\n`;
    writeFile(dir, `压测笔记 ${i}.md`, {
      id: `kn-stress-${i}`, type: "knowledge", title: `压测笔记 ${i}`,
      created: iso(i % 100), updated: iso(0),
    }, body);
  }
}

async function main() {
  const t0 = Date.now();
  seedCollections();
  seedTasks();
  seedDailies();
  seedKnowledge();
  const written = Date.now() - t0;
  const { entries, broken } = await rebuildIndex();
  const indexed = Date.now() - t0 - written;
  console.log(
    `stress seed done: ${TASKS} tasks + ${DAILIES} dailies + ${NOTES} notes\n` +
    `  files written in ${written}ms; index rebuilt in ${indexed}ms; ` +
    `entries=${entries}, broken=${broken}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
