# 多 Agent 协作文档

> 本文件会被 CLAUDE.md 自动导入上下文，必须保持精简。日志保留最近 15 条，更旧的移入 `docs/logs/archive-YYYYMM.md`。

## 1. 在册 Agent

| 标识 | 类型 | 角色 | 领地 | 加入时间 |
|---|---|---|---|---|
| claude-main | Claude Code | 主开发 | 全仓库（public/assets/ 产出以任务分配为准） | 2026-07-10 |
| codex-image | Codex | 视觉素材（预留，未启用） | public/assets/ | — |

## 2. 协作规则

- 开工前：`git pull --rebase`（若有远端）→ 读本文档最新日志 → 到看板认领（一次一个）。
- 不修改他人领地的文件；不碰他人「进行中」任务涉及的文件。
- 完成即写日志；commit 附 `Co-Agent: <标识>`。
- 冲突处理：后到者 rebase 并调整自己的改动去适配先合入者；vault/ 数据文件冲突一律先保留双方内容再人工式合并，**禁止整段覆盖**。

## 3. 任务看板

图例：⬜ 待认领 · 🔄 进行中@xx · ✅ 已完成

| ID | 任务 | 里程碑 | 状态 | 产出 |
|---|---|---|---|---|
| B0 | 引导：文档体系 + 脚手架 + 验证基建 + git init | Bootstrap | ✅ 已完成 | 四份文档、Next.js 项目、pnpm verify、首次 commit 4b62618 |
| M1-1 | design tokens + 明暗主题壳（无 FOUC） | M1 | ✅ 已完成 | globals.css、theme provider、layout shell、space-background |
| M1-2 | vault 数据层：zod schema + 原子读写 + gray-matter round-trip | M1 | ✅ 已完成 | src/lib/schema、src/lib/vault、markdown helpers |
| M1-3 | SQLite 索引 + chokidar 监听 + 重建 + 待修复机制 | M1 | ✅ 已完成 | src/lib/index（db/indexer/queries/watcher/bootstrap） |
| M1-4 | seed 脚本 + 数据层单元测试 | M1 | ✅ 已完成 | scripts/seed.ts、tests/unit（26）、tests/e2e（4） |
| M2-1 | 任务 CRUD + Route Handlers | M2 | 🔄 进行中@claude-main | /api/tasks、features/tasks |
| M2-2 | 列表视图（筛选/排序/搜索） | M2 | ⬜ 待认领 | features/tasks 列表 |
| M2-3 | 看板视图（拖拽改 status + 追加动态） | M2 | ⬜ 待认领 | features/tasks 看板 |
| M2-4 | 任务详情抽屉（编辑器/子任务/进度/时间线） | M2 | ⬜ 待认领 | features/tasks 抽屉 |
| M2-5 | 合集页（进度环 + 归档） | M2 | ⬜ 待认领 | features/collections |
| M3-1 | 日报聚合/编辑/定稿/日历/复制 Markdown | M3 | ⬜ 待认领 | features/reports 日报 |
| M3-2 | 周报聚合/图表/编辑/定稿/导出 | M3 | ⬜ 待认领 | features/reports 周报 |
| M4-1 | Claude Code Skills 扫描/查看/编辑（备份）+ 白名单防穿越 | M4 | ⬜ 待认领 | src/lib/skills、features/skills TabA |
| M4-2 | 个人技能树（矩阵/雷达图/学习记录） | M4 | ⬜ 待认领 | features/skills TabB |
| M4-3 | 知识库轻量浏览 + 双链 + 反链 | M4 | ⬜ 待认领 | features/knowledge |
| M5-1 | 应用中心（link/iframe 降级/proxy 骨架 + 演示） | M5 | ⬜ 待认领 | features/apps、/api/proxy |
| M5-2 | 后台管理全面板（概览/Git/应用 CRUD/Skill 目录/个性化/导出） | M5 | ⬜ 待认领 | features/admin |
| M5-3 | Git 同步面板（simple-git） | M5 | ⬜ 待认领 | src/lib/git、features/admin |
| M6-1 | 仪表盘「今日轨道」签名元素 + 趋势/分布/热力图 | M6 | ⬜ 待认领 | features/dashboard |
| M6-2 | 命令面板 Cmd+K | M6 | ⬜ 待认领 | components 命令面板 |
| M6-3 | 动效 + 空状态三件套全量 + 无障碍 + Lighthouse | M6 | ⬜ 待认领 | 全站 |
| M6-4 | README + DELIVERY_REPORT 收尾 | M6 | ⬜ 待认领 | README.md、docs/DELIVERY_REPORT.md |

## 4. 协作日志

### 2026-07-10 13:40 [claude-main]
- 完成：Bootstrap + **M1 地基全部交付**。脚手架、明暗主题壳（无 FOUC）、Markdown-first 数据层（zod/原子写/gray-matter round-trip/wikilink/section helpers/待修复机制）、SQLite 索引 + chokidar 监听 + 重建、命令面板与导航壳、seed（39 条）。
- 变更：`pnpm verify` 全绿；26 单测 + 4 E2E 通过；首次 commit `4b62618`（127 files）。修复真实 bug：YAML ISO 日期被解析成 Date，schema 现强制归一为 string。
- 下一步：M2-1 任务 CRUD + Route Handlers → 列表 → 看板拖拽 → 详情抽屉 → 合集。
- 阻塞：无 Git 远端（不阻塞，本地已提交；待 B哥 配置远端后 push）。

### 2026-07-10 13:06 [claude-main]
- 完成：现状盘点（当前目录仅需求原文，无代码，M1–M6 全部从零）；读毕规格全文。
- 变更：创建 docs/HANDBOOK.md、docs/COLLABORATION.md（本文件）；建立 ADR-001~010、任务看板 B0/M1–M6。
- 下一步：创建 CLAUDE.md + AGENTS.md → 脚手架 Next.js → 配置 pnpm verify → git init + 首次 commit。
- 阻塞：无。

## 5. 给 B哥 的人话进度

**M1（2026-07-10）**：工作台的地基搭好了，能跑起来了。现在打开就能看到深色/浅色两套界面、左边导航、一个带演示数据的仪表盘，右上角还能一键切主题。你在 Obsidian 里改 vault 文件夹里的任何一篇，工作台几秒内就会自动跟着变。真正的任务、日报这些功能从下一步开始逐个上线。
