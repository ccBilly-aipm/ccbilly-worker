/**
 * Seed demo data (spec §8): 3 collections, 15 tasks, 7 daily reports, 1 weekly,
 * 8 skills, 3 apps. Writes real vault/*.md then rebuilds the index.
 *
 * Idempotent-ish: it writes fixed filenames so re-running overwrites the demo
 * set rather than piling up duplicates. Run: `pnpm seed`.
 */
import path from "node:path";
import { vaultDir, vaultTypeDir } from "../src/lib/config";
import { writeEntry } from "../src/lib/vault/repo";
import { rebuildIndex } from "../src/lib/index/indexer";
import { localISO, localDateKey, isoWeekKey, isoWeekRange } from "../src/lib/utils/date";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function ts(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${localDateKey(d)} ${hh}:${mm}`;
}

async function seedCollections() {
  const cols = [
    { slug: "开源项目接入", title: "开源项目接入", desc: "把 Excalidraw / Memos / Uptime Kuma 等开源应用接进应用中心。" },
    { slug: "工作台自建", title: "工作台自建", desc: "ccBilly 工作台本体的功能开发与打磨。" },
    { slug: "学习成长", title: "学习成长", desc: "AI 产品经理方法论与工程能力的持续精进。" },
  ];
  for (const c of cols) {
    await writeEntry({
      type: "collection",
      filePath: path.join(vaultTypeDir("collection"), `${c.slug}.md`),
      data: {
        id: `col-${c.slug}`,
        type: "collection",
        title: c.title,
        status: "active",
        description: c.desc,
        created: localISO(daysAgo(20)),
        updated: localISO(daysAgo(1)),
      },
      content: `${c.desc}\n`,
    });
  }
  return cols.map((c) => c.title);
}

interface TaskSpec {
  title: string;
  status: string;
  priority: string;
  collection: string;
  progress: number;
  createdAgo: number;
  activity: [number, string][]; // [daysAgo, text]
  subtasks: [string, boolean][];
}

async function seedTasks() {
  const specs: TaskSpec[] = [
    { title: "接入 Excalidraw 到应用中心", status: "doing", priority: "P1", collection: "开源项目接入", progress: 60, createdAgo: 6, activity: [[6, "创建任务"], [3, "状态 todo → doing"], [1, "进度 30 → 60"]], subtasks: [["调研 iframe 兼容性", true], ["编写注册表条目", false]] },
    { title: "接入 Memos 碎片笔记", status: "todo", priority: "P2", collection: "开源项目接入", progress: 0, createdAgo: 4, activity: [[4, "创建任务"]], subtasks: [["确认 REST API", false], ["登记应用", false]] },
    { title: "调研 Uptime Kuma 监控", status: "todo", priority: "P3", collection: "开源项目接入", progress: 0, createdAgo: 3, activity: [[3, "创建任务"]], subtasks: [] },
    { title: "实现 vault 数据层原子写", status: "done", priority: "P0", collection: "工作台自建", progress: 100, createdAgo: 7, activity: [[7, "创建任务"], [5, "状态 todo → doing"], [2, "状态 doing → done"]], subtasks: [["gray-matter round-trip", true], ["temp + rename", true]] },
    { title: "SQLite 索引与 chokidar 监听", status: "done", priority: "P0", collection: "工作台自建", progress: 100, createdAgo: 6, activity: [[6, "创建任务"], [2, "状态 doing → done"]], subtasks: [] },
    { title: "看板拖拽流转", status: "doing", priority: "P1", collection: "工作台自建", progress: 40, createdAgo: 5, activity: [[5, "创建任务"], [1, "状态 todo → doing"]], subtasks: [["dnd-kit 接入", true], ["拖拽写回 status", false]] },
    { title: "日报聚合生成", status: "todo", priority: "P1", collection: "工作台自建", progress: 0, createdAgo: 4, activity: [[4, "创建任务"]], subtasks: [] },
    { title: "周报图表与导出", status: "todo", priority: "P2", collection: "工作台自建", progress: 0, createdAgo: 4, activity: [[4, "创建任务"]], subtasks: [] },
    { title: "今日轨道签名动效", status: "todo", priority: "P2", collection: "工作台自建", progress: 0, createdAgo: 3, activity: [[3, "创建任务"]], subtasks: [] },
    { title: "命令面板 Cmd+K", status: "done", priority: "P2", collection: "工作台自建", progress: 100, createdAgo: 5, activity: [[5, "创建任务"], [1, "状态 doing → done"]], subtasks: [] },
    { title: "阻塞：iframe 被 CSP 拒绝的降级", status: "blocked", priority: "P1", collection: "工作台自建", progress: 20, createdAgo: 3, activity: [[3, "创建任务"], [1, "状态 doing → blocked · 等待确认演示站点"]], subtasks: [["检测 X-Frame-Options", false]] },
    { title: "精读《俞军产品方法论》交易模型", status: "doing", priority: "P2", collection: "学习成长", progress: 50, createdAgo: 8, activity: [[8, "创建任务"], [2, "进度 20 → 50"]], subtasks: [["用户模型笔记", true], ["交易模型笔记", false]] },
    { title: "复盘巴奴 AI PM 面试", status: "done", priority: "P3", collection: "学习成长", progress: 100, createdAgo: 10, activity: [[10, "创建任务"], [4, "状态 doing → done"]], subtasks: [] },
    { title: "整理横纵分析法模板", status: "todo", priority: "P2", collection: "学习成长", progress: 0, createdAgo: 2, activity: [[2, "创建任务"]], subtasks: [] },
    { title: "归档：旧版 OCR 扩展调研", status: "archived", priority: "P3", collection: "学习成长", progress: 100, createdAgo: 15, activity: [[15, "创建任务"], [12, "状态 done → archived"]], subtasks: [] },
  ];

  let i = 0;
  for (const s of specs) {
    i++;
    const created = daysAgo(s.createdAgo);
    const activityLines = s.activity
      .map(([ago, text]) => `- ${ts(daysAgo(ago))} · ${text}`)
      .join("\n");
    const subtaskLines = s.subtasks
      .map(([text, done]) => `- [${done ? "x" : " "}] ${text}`)
      .join("\n");
    const body = [
      `${s.title} —— 演示任务。`,
      "",
      "## 子任务",
      subtaskLines || "- [ ] （暂无子任务）",
      "",
      "## 动态",
      activityLines,
    ].join("\n");

    const slug = `${localDateKey(created).replace(/-/g, "")}-demo-${String(i).padStart(2, "0")}`;
    await writeEntry({
      type: "task",
      filePath: path.join(vaultTypeDir("task"), `${slug}.md`),
      data: {
        id: `task-${slug}`,
        type: "task",
        title: s.title,
        status: s.status,
        priority: s.priority,
        collection: `[[${s.collection}]]`,
        tags: ["演示"],
        progress: s.progress,
        created: localISO(created),
        updated: localISO(daysAgo(s.activity[s.activity.length - 1][0])),
      },
      content: body,
    });
  }
}

async function seedDailies() {
  for (let ago = 6; ago >= 0; ago--) {
    const d = daysAgo(ago);
    const key = localDateKey(d);
    const body = [
      "## 今日完成",
      ago % 2 === 0 ? "- 推进了工作台自建相关任务" : "- 完成一项开源接入调研",
      "",
      "## 进行中",
      "- 看板拖拽流转",
      "",
      "## 遇到的问题",
      ago === 1 ? "- iframe 被 CSP 拒绝，需确认演示站点" : "- 暂无",
      "",
      "## 明日计划",
      "- 继续推进 P1 任务",
      "",
      "## 随想",
      "- 保持节奏，Markdown-first 的架构让同步很省心。",
    ].join("\n");
    await writeEntry({
      type: "daily",
      filePath: path.join(vaultTypeDir("daily"), `${key}.md`),
      data: {
        date: key,
        type: "daily",
        status: ago === 0 ? "draft" : "final",
        generated_at: localISO(d),
      },
      content: body,
    });
  }
}

async function seedWeekly() {
  const wk = isoWeekKey();
  const { start, end } = isoWeekRange();
  const body = [
    "## 本周速览",
    "- 完成任务：5 · 新建任务：15 · 主要投入：工作台自建",
    "",
    "## 重点产出",
    "- vault 数据层、SQLite 索引、命令面板落地",
    "",
    "## 问题与风险",
    "- iframe 内嵌被拒的降级方案待确认",
    "",
    "## 下周计划",
    "- 完成日报/周报聚合与图表",
  ].join("\n");
  await writeEntry({
    type: "weekly",
    filePath: path.join(vaultTypeDir("weekly"), `${wk}.md`),
    data: {
      week: wk,
      type: "weekly",
      status: "draft",
      range: `${start} ~ ${end}`,
      generated_at: localISO(),
    },
    content: body,
  });
}

async function seedSkills() {
  const skills = [
    { name: "Next.js", category: "前端工程", level: 4, target: 5, status: "using" },
    { name: "TypeScript", category: "前端工程", level: 4, target: 5, status: "using" },
    { name: "玻璃拟态设计", category: "UI 设计", level: 3, target: 4, status: "learning" },
    { name: "俞军产品方法论", category: "产品方法论", level: 3, target: 5, status: "learning" },
    { name: "横纵分析法", category: "产品方法论", level: 4, target: 5, status: "using" },
    { name: "Prompt Engineering", category: "AI 应用", level: 4, target: 5, status: "using" },
    { name: "RAG 检索增强", category: "AI 应用", level: 2, target: 4, status: "learning" },
    { name: "SQLite / 数据建模", category: "后端工程", level: 3, target: 4, status: "mastered" },
  ];
  for (const s of skills) {
    const slug = s.name.replace(/[\s/]/g, "-");
    const body = [
      "## 学习记录",
      `- ${localDateKey(daysAgo(5))} · 开始系统学习 ${s.name}`,
      `- ${localDateKey(daysAgo(1))} · 完成一个实践小项目`,
      "",
      "## 资源",
      "- [[知识库·相关笔记]]",
    ].join("\n");
    await writeEntry({
      type: "skill",
      filePath: path.join(vaultTypeDir("skill"), `${slug}.md`),
      data: {
        id: `skill-${slug}`,
        type: "skill",
        name: s.name,
        category: s.category,
        level: s.level,
        target_level: s.target,
        status: s.status,
        tags: ["演示"],
        related: [],
        created: localISO(daysAgo(10)),
        updated: localISO(daysAgo(1)),
      },
      content: body,
    });
  }
}

async function seedApps() {
  const apps = [
    { name: "Excalidraw", mode: "iframe", url: "https://excalidraw.com", icon: "✏️", category: "白板", order: 1 },
    { name: "Memos", mode: "link", url: "https://usememos.com", icon: "📝", category: "笔记", order: 2 },
    { name: "本地 API 演示", mode: "proxy", url: "/api/proxy/demo", icon: "🔌", category: "演示", order: 3 },
  ];
  for (const a of apps) {
    const slug = a.name.replace(/[\s/]/g, "-");
    await writeEntry({
      type: "app",
      filePath: path.join(vaultTypeDir("app"), `${slug}.md`),
      data: {
        id: `app-${slug}`,
        type: "app",
        name: a.name,
        mode: a.mode,
        url: a.url,
        icon: a.icon,
        category: a.category,
        status: "enabled",
        order: a.order,
        notes: "演示应用，可在后台管理中修改。",
        ...(a.mode === "proxy" ? { proxyBaseUrl: "https://example.com" } : {}),
        created: localISO(daysAgo(3)),
        updated: localISO(),
      },
      content: `${a.name} —— 演示应用条目。\n`,
    });
  }
}

async function seedKnowledge() {
  const notes = [
    { slug: "Markdown-first 架构笔记", title: "Markdown-first 架构笔记", body: "本工作台把所有业务数据以 Markdown 存储，[[俞军产品方法论]] 里的交易模型也适合这样沉淀。\n\n关联任务见 [[接入 Excalidraw 到应用中心]]。" },
    { slug: "俞军产品方法论", title: "俞军产品方法论", body: "用户模型 + 交易模型 + 理性决策三要素。产品即交易。" },
  ];
  const dir = vaultTypeDir("knowledge" as never);
  for (const n of notes) {
    await writeEntry({
      type: "knowledge",
      filePath: path.join(dir, `${n.slug}.md`),
      data: {
        title: n.title,
        type: "knowledge",
        tags: ["演示"],
        created: localISO(daysAgo(9)),
        updated: localISO(daysAgo(2)),
      },
      content: n.body,
    });
  }
}

async function main() {
  console.log(`seeding demo data into ${vaultDir()} …`);
  const collections = await seedCollections();
  await seedTasks();
  await seedDailies();
  await seedWeekly();
  await seedSkills();
  await seedApps();
  await seedKnowledge();
  const { entries, broken } = await rebuildIndex();
  console.log(
    `done. collections=${collections.length}, index entries=${entries}, broken=${broken}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
