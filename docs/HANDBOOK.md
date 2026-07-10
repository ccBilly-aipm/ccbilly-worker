# ccBilly 工作台 · 项目手册（单一事实来源 / Single Source of Truth）

> 本文件是本项目的最高法。任何 Agent 在动手前必须先读它。
> 需求规格原文见仓库根目录《ccBilly工作台-ClaudeCode开发提示词.md》（其 Part A 为需求基准）。
> 当本手册的 ADR 与规格原文冲突时，**以本手册中更新的 ADR 为准**（ADR 是对规格的合法演进记录）。

---

## 1. 项目概述与需求来源

**ccBilly 工作台** 是为唯一用户 B哥（Billy）打造的、本地优先（local-first）的个人工作台 Web 应用，集成：

- 任务进度跟进（合集 / 任务 / 日报 / 周报）
- Skill 管理（Claude Code Skills 管理 + 个人技能树）
- 知识库（轻量浏览 + 双链）
- 开源应用接入（应用中心）
- 后台管理

视觉风格：**深空玻璃拟态科技感（Deep-Space Glassmorphism）**，支持明暗双主题。

**需求来源**：`ccBilly工作台-ClaudeCode开发提示词.md`（Part A = 需求基准，Part B = 生图 prompt，Part C = 使用建议）。

**核心约束（决定架构，不可违背）**：
1. 所有业务数据必须是 **Git 友好、Obsidian 可直接打开、可无损粘贴进飞书的纯文本 Markdown**。禁止把业务数据只存二进制数据库。
2. 单用户、本地运行为主（localhost），不做多租户；但为未来内网/容器部署留余地。
3. B哥 会定期把整个项目（含数据）push 到 GitHub 多设备同步；本地用 Obsidian 管理文档，重要内容转存飞书。

---

## 2. 架构决策记录（ADR）

| 编号 | 日期 | 决策 | 理由 | 提出者 |
|---|---|---|---|---|
| ADR-001 | 2026-07-10 | 项目直接建在当前目录 `ccbilly-worker/` 根，不再套一层 `ccbilly-workspace/` 子目录 | B哥 明确「就在当前目录建」；保留需求原文 md 于根目录 | claude-main |
| ADR-002 | 2026-07-10 | 技术栈锁定：Next.js 15 App Router + TS strict + Node 22 + pnpm(corepack) | 规格 §3 指定，取当前稳定版；corepack 免全局装 pnpm | claude-main |
| ADR-003 | 2026-07-10 | Markdown 为唯一事实来源；SQLite(better-sqlite3) 仅作可重建索引缓存(`cache/index.db`)，写入 .gitignore | 规格 §2 核心架构；索引损坏可一键重建不丢数据 | claude-main |
| ADR-004 | 2026-07-10 | 写操作顺序：zod 校验 → 写临时文件 → `rename` 原子替换 → 更新索引 → 触发刷新。写回保留未知 frontmatter 字段 | 规格 §2/§5；保证崩溃安全与字段不丢 | claude-main |
| ADR-005 | 2026-07-10 | frontmatter 解析失败的文件进入后台「待修复」列表 + 错误原因，绝不使应用崩溃/白屏 | 规格 §5/§8 | claude-main |
| ADR-006 | 2026-07-10 | Skill 管理 Tab A **首期只读 + 编辑（编辑前先备份到 `.trash/<ts>/`）**；新建/删除对真实 `~/.claude/skills/` 的写入先做禁用占位，待安全性验收后单独小迭代开启。所有 FS 操作限定白名单目录 + 防路径穿越（`../`）| B哥 决策「允许，但先只读+备份」；安全红线优先 | claude-main |
| ADR-007 | 2026-07-10 | `public/assets/` 视觉素材首期全部用纯 CSS/SVG 玻璃拟态占位图；预留资源位与替换说明，B哥 后续用 Codex+GPT Image 2 替换 | B哥 决策「先全部用占位图」 | claude-main |
| ADR-008 | 2026-07-10 | M1 即执行 `git init` + `.gitignore`，vault/ 从第一天纳入版本控制；远程关联留给 B哥 | B哥 决策「M1 就 git init」；Git 同步面板依赖 repo | claude-main |
| ADR-009 | 2026-07-10 | 自动化测试中的 Skills 目录一律指向临时目录（env `CCBILLY_SKILLS_TEST_ROOT` 或 fixture），**绝不触碰真实 `~/.claude/skills/`** | 规格 §3 验证标准 + 红线 | claude-main |
| ADR-010 | 2026-07-10 | 日期边界按系统本地时区计算；ISO 周用于周报文件名（`YYYY-Www`）；每周起始日=周一（后台可改） | 规格 §0/§5/§6.8 | claude-main |

> 后续新增 ADR 依次编号，只增不删；被推翻的 ADR 标注「已被 ADR-NNN 取代」而非删除。

---

## 3. 目录结构与数据 schema 摘要

### 3.1 目录结构

```text
ccbilly-worker/                        # = 项目根（当前目录）
├── ccBilly工作台-ClaudeCode开发提示词.md  # 需求原文（保留）
├── CLAUDE.md                          # Claude Code 入口（导入两份共同文档）
├── AGENTS.md                          # 其他 Agent 入口（Codex/Cursor 等）
├── README.md
├── docs/
│   ├── HANDBOOK.md                    # 本文件·单一事实来源
│   ├── COLLABORATION.md               # 协作协议 + 看板 + 日志
│   ├── DELIVERY_REPORT.md             # 交付报告（收尾时生成）
│   └── logs/archive-YYYYMM.md         # 归档的旧协作日志
├── vault/                             # ★ 全部业务数据（纳入 Git）
│   ├── tasks/                         # {yyyymmdd}-{slug}.md
│   ├── collections/
│   ├── reports/{daily,weekly}/        # daily: YYYY-MM-DD.md · weekly: YYYY-Www.md
│   ├── skills/  knowledge/  apps/
│   └── .obsidian/                     # gitignore（README 说明可自行调整）
├── cache/                             # SQLite 索引（gitignore，可重建）
├── src/
│   ├── app/                           # Next.js 路由 + Route Handlers(/api/*)
│   ├── components/{ui,glass,charts}/
│   ├── features/{tasks,reports,skills,apps,dashboard,admin,knowledge}/
│   └── lib/{vault,index,git,skills,schema,markdown,utils}/
├── public/assets/                     # 占位图（CSS/SVG）
├── scripts/seed.ts                    # pnpm seed 演示数据
├── tests/{unit,e2e}/                  # Vitest 单测 + Playwright E2E
├── Dockerfile · docker-compose.yml
└── .gitignore · .env.example
```

### 3.2 数据 schema（zod 校验，写回保留未知字段）

通用规则：`id` 全局唯一；`created`/`updated` 为 ISO 8601；解析失败进「待修复」列表。

| 类型 | 路径 | 关键 frontmatter 字段 |
|---|---|---|
| task | `vault/tasks/*.md` | id, type:task, title, status(todo\|doing\|blocked\|done\|archived), priority(P0-P3), collection([[双链]]可空), tags[], progress(0-100), due, created, updated |
| collection | `vault/collections/*.md` | id, type:collection, title, status(active\|archived), description, created, updated（进度实时算不落盘） |
| daily | `vault/reports/daily/YYYY-MM-DD.md` | date, type:daily, status(draft\|final), generated_at |
| weekly | `vault/reports/weekly/YYYY-Www.md` | week, type:weekly, status(draft\|final), range |
| skill | `vault/skills/*.md` | id, type:skill, name, category, level(1-5), target_level, status(learning\|using\|mastered\|paused), tags[], related([[双链]]) |
| app | `vault/apps/*.md` | id, type:app, name, mode(link\|iframe\|proxy), url, icon, category, status(enabled\|disabled), order, notes |

**正文约定**：
- 任务：`## 子任务`（`- [ ]` checklist）、`## 动态`（系统追加 `- YYYY-MM-DD HH:mm · <事件>`，日报数据源）。
- 日报固定五段：`## 今日完成`、`## 进行中`、`## 遇到的问题`、`## 明日计划`、`## 随想`。
- 周报：`## 本周速览`、`## 重点产出`、`## 问题与风险`、`## 下周计划`。
- 技能：`## 学习记录`（时间线）、`## 资源`。

---

## 4. 工作协议

### 4.1 自主循环
认领任务 → 实现 → `pnpm verify` 全绿 → commit → 更新文档（里程碑表/验收清单/ADR）→ 记协作日志 → push（失败不阻塞）→ 认领下一个。

### 4.2 验证标准（"功能没问题"的客观定义）
- `pnpm verify` = `next lint && tsc --noEmit && vitest run && next build`，任何一步红 = 任务未完成，**禁止注释掉失败测试来变绿**。
- 数据层必须有单测：vault 原子读写、frontmatter zod 校验与容错、日报/周报聚合、双链解析。
- 核心用户旅程有 Playwright E2E（chromium headless）：见规格 §3。
- Lighthouse ≥90 为尽力项，能跑则跑并记录，跑不了如实说明不造假。

### 4.3 Git 纪律
- Conventional Commits，scope=模块名；提交粒度=一个通过验证的任务；commit 末尾附 `Co-Agent: claude-main`。
- 开工前若有远端：`git pull --rebase`；push 失败（无远端/无凭据）不阻塞，记日志。

### 4.4 允许停下的三种例外（除此一律不停）
1. 需求出现根本性矛盾，任何解释都要推翻已有架构；
2. 环境硬缺失且无法绕过（磁盘满、依赖源完全不可用）；
3. 唯一可行路径需执行红线操作（先找替代，实在没有才停）。

### 4.5 红线（任何情况禁止）
force push；改写 git 历史；删除 vault/ 真实数据；提交 .env* 或任何密钥；自动化测试触碰真实 `~/.claude/skills/`。

### 4.6 降级规则
同一问题连续 3 次修复失败 → 做降级决策（简化实现或标记推迟），写入 §7，继续下一任务，绝不停机空等。

---

## 5. 里程碑状态表

| 里程碑 | 内容 | 状态 | 完成时间 | 关键 commit |
|---|---|---|---|---|
| M1 地基 | 脚手架、CLAUDE.md、design tokens+明暗主题壳、vault 数据层、seed | ✅ 完成 | 2026-07-10 | 4b62618 |
| M2 任务系统 | 任务 CRUD、列表+看板、详情抽屉、合集、动态日志 | ✅ 完成 | 2026-07-10 | (见 M2 commit) |
| M3 报告系统 | 日报聚合/编辑/定稿/日历、周报聚合/图表/导出、复制 Markdown | ⬜ 待开始 | — | — |
| M4 Skill 双模块 | Claude Code Skills 扫描/查看/编辑/回收站 + 技能树 + 知识库 | ⬜ 待开始 | — | — |
| M5 接入与后台 | 应用中心(link/iframe/proxy) + 后台全面板 + Git 同步面板 | ⬜ 待开始 | — | — |
| M6 打磨 | 今日轨道、命令面板、动效/空状态、性能/无障碍、README | ⬜ 待开始 | — | — |

图例：⬜ 待开始 · 🔄 进行中 · ✅ 完成

**引导阶段现状盘点（2026-07-10）**：当前目录仅有需求原文 md，无任何代码。所有里程碑 M1–M6 均从零开始。

**M1 交付验证（2026-07-10）**：`pnpm verify` 全绿（lint + tsc + 26 单测 + build）；4 个 Playwright E2E（chromium）通过；`pnpm seed` 生成 39 条数据、索引 0 待修复。捕获并修复一处真实数据损坏 bug（YAML 把 ISO 日期解析成 Date 对象 → schema 现强制 Date→string 归一，frontmatter 无损 round-trip）。无 Git 远端，首次 commit 已本地落地（待 B哥 配置远端后 `git push -u origin main`）。

---

## 6. 验收清单（来自规格 §10，逐项勾选）

- [ ] 全链路：新建任务 → 看板拖拽流转 → 动态自动记录 → 生成日报草稿 → 编辑定稿 → 周报聚合成文，全程无手工拷贝。
- [x] 用 Obsidian 直接修改 vault/ 中任一任务文件，工作台数秒内自动同步显示。（M2 E2E `tasks.spec.ts` 覆盖：外部写文件 → UI 15s 内出现）
- [ ] Claude Code Skills 的新建/编辑在真实 ~/.claude/skills/ 生效；路径穿越攻击被拒绝。（首期：编辑生效 + 穿越被拒；新建/删除写入按 ADR-006 分期）
- [ ] 明暗主题切换无闪烁；两套主题对比度达 AA；prefers-reduced-motion 生效。
- [ ] Git 面板可完成一次真实的 commit + push，冲突时给出清晰提示且不破坏数据。
- [ ] iframe 模式成功内嵌一个演示应用（如 excalidraw.com），并演示被拒内嵌时的降级。
- [ ] 日报「复制为 Markdown」粘贴到飞书文档后标题/列表/链接格式正确。
- [ ] 移动端可正常浏览与勾选任务；本地生产构建 Lighthouse 性能分 ≥ 90。

---

## 7. 已知问题与降级决策

_（暂无。降级决策在此追加：问题 | 根因 | 降级方案 | 日期）_
