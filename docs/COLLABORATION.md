# 多 Agent 协作文档

> 本文件会被 CLAUDE.md 自动导入上下文，必须保持精简。日志保留最近 15 条，更旧的移入 `docs/logs/archive-YYYYMM.md`。

## 1. 在册 Agent

| 标识 | 类型 | 角色 | 领地 | 加入时间 |
|---|---|---|---|---|
| claude-main | Claude Code | 主开发 | 全仓库（public/assets/ 产出以任务分配为准） | 2026-07-10 |
| codex-image | Codex | 视觉素材 | public/assets/ | 2026-07-10 15:24 |

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
| M2-1 | 任务 CRUD + Route Handlers | M2 | ✅ 已完成 | task-service、collection-service、/api/tasks、/api/collections |
| M2-2 | 列表视图（筛选/排序/搜索） | M2 | ✅ 已完成 | task-list、tasks-client 筛选 |
| M2-3 | 看板视图（拖拽改 status + 追加动态） | M2 | ✅ 已完成 | kanban-board（dnd-kit）、task-card |
| M2-4 | 任务详情抽屉（编辑器/子任务/进度/时间线） | M2 | ✅ 已完成 | task-drawer |
| M2-5 | 合集页（进度环 + 归档） | M2 | ✅ 已完成 | collections-client、进度环、合集详情页 |
| M3-1 | 日报聚合/编辑/定稿/日历/复制 Markdown | M3 | ✅ 已完成 | aggregate、report-service、daily-client、report-calendar |
| M3-2 | 周报聚合/图表/编辑/定稿/导出 | M3 | ✅ 已完成 | weekly-client、weekly-charts（Recharts）、export |
| M4-1 | Claude Code Skills 扫描/查看/编辑（备份）+ 白名单防穿越 | M4 | ✅ 已完成 | skills/paths（红线守卫）、skill-service、claude-skills-tab、skill-editor |
| M4-2 | 个人技能树（矩阵/雷达图/学习记录） | M4 | ✅ 已完成 | skill-tree-service、skill-tree-tab、skill-radar、skill-detail-drawer |
| M4-3 | 知识库轻量浏览 + 双链 + 反链 | M4 | ✅ 已完成 | knowledge-service、知识库列表/详情页、render（wikilink→link） |
| M5-1 | 应用中心（link/iframe 降级/proxy 骨架 + 演示） | M5 | ✅ 已完成 | app-service、apps-client（iframe 预检+超时降级）、/api/proxy/[appId] |
| M5-2 | 后台管理全面板（概览/Git/应用 CRUD/Skill 目录/个性化/导出） | M5 | ✅ 已完成 | admin 布局+口令门、6 个面板、settings/export API |
| M5-3 | Git 同步面板（simple-git） | M5 | ✅ 已完成 | git-panel、/api/git/commit、/api/git/sync（永不 force push） |
| M6-1 | 仪表盘「今日轨道」签名元素 + 趋势/分布/热力图 | M6 | ✅ 已完成 | today-orbit、dashboard-charts、activity-heatmap、count-up、stats |
| M6-2 | 命令面板 Cmd+K | M6 | ✅ 已完成 | command-palette（M1 建成，M6 验收：全局搜索+快捷动作） |
| M6-3 | 动效 + 空状态三件套全量 + 无障碍 + Lighthouse | M6 | ✅ 已完成 | 全站；桌面 Lighthouse 99/96，reduced-motion+移动端 E2E |
| M6-4 | README + DELIVERY_REPORT 收尾 | M6 | ✅ 已完成 | README.md、docs/DELIVERY_REPORT.md |
| VIS-1 | Part B 正式视觉素材（Logo/主题背景/空状态/404） | Visual | ✅ 已完成@codex-image | `public/assets/` 9 张 GPT Image 素材 |
| VIS-2 | 素材接入到界面（favicon/logo/空状态/404） | Visual | ✅ 已完成@claude-main | icon.png、sidebar logo、EmptyState 真图；黑底包圆角玻璃容器；bg 保留 CSS |
| S1-1 | XSS/Markdown 渲染净化（rehype-sanitize 管线） | S1 | ✅ 已完成@claude-main | render.ts 换管线、17 对抗+回归测试、移除 marked、ADR-013、SECURITY_AUDIT |
| S1-2 | Skill 路径穿越/符号链接逃逸（realpath 校验） | S1 | ✅ 已完成@claude-main | paths.ts 最近祖先 realpath 校验、8 对抗测试、ADR-014 |
| S1-3 | SSRF /api/proxy allowlist + IP 校验 | S1 | ✅ 已完成@claude-main | net/ssrf.ts、29 对抗测试、逐跳重校验、fail-closed 开关、ADR-015 |
| S1-4 | 分层鉴权 AUTH_MODE + fail-closed 绑定 + 限速（ADR） | S1 | ✅ 已完成@claude-main | middleware.ts、exposure.ts、auth.ts 强化、19 单测+2 E2E、ADR-016 |
| S1-5 | Git 命令注入审计 + zip 导出根固定 | S1 | ✅ 已完成@claude-main | 审计确认无注入面、message 净化、7 不变量测试 |
| S1-6 | 依赖供应链 pnpm audit + .nvmrc + 安全响应头/CSP | S1 | ⬜ 待认领 | — |
| S2 | 健壮性与性能（边界/节流/渲染缓存/压测/FOUC） | S2 | ⬜ 待认领 | — |
| S3 | 开源成熟度（CI/SECURITY/CONTRIBUTING/截图/去个人化/CHANGELOG） | S3 | ⬜ 待认领 | — |
| S4 | 收尾交付（DELIVERY V1.1/tag v1.1.0） | S4 | ⬜ 待认领 | — |

## 4. 协作日志

### 2026-07-12 14:35 [claude-main]
- 完成：**S1-5 Git 命令注入审计 + zip 导出根**。审计结论：Git 全部走 simple-git **参数数组 API**（不经 shell），全仓无 `.raw(`/`exec`/`spawn`/`--force`（仅注释与 `force-dynamic`）→ **无注入面、"永不 force push"是结构保证**；zip 导出 `archive.directory(vaultDir(), "vault")` 根**固定**无外部参数。加固：commit message 加 `sanitizeCommitMessage`（去控制字符/前导 `-`/截断 500）作纵深防御；写 7 个测试把"无 force/无 raw/无 child_process/导出根固定"三条**结构不变量**钉死防回归。
- 变更：`pnpm verify` 全绿（**135 单测**，+7）。不做橡皮图章：如实标注本面原实现已安全，本轮为加固+护栏而非修高危洞。
- 下一步：S1-6 依赖供应链（pnpm audit + .nvmrc + 安全响应头/CSP）。
- 阻塞：无。

### 2026-07-12 14:00 [claude-main]
- 完成：**S1-4 分层鉴权模型**（本轮最重架构决策）。实测确认原实现**只有 /admin UI 有口令，所有 mutation API 无鉴权**（写真实 skills、Git、导出 vault 全裸奔）——他人 `-H 0.0.0.0`/Docker 对外部署即把整机 skills 目录 + Git 凭据暴露给网络（Critical）。
- 设计（遵循「本机零降级、暴露强制安全」）：`AUTH_MODE=none|passcode`（默认 none）；新增 `src/middleware.ts` 统一在 `/api/*`+`/admin` 施加；`src/lib/admin/exposure.ts` 决策纯函数（可单测）。passcode 模式：所有 mutation 需会话；**fail-closed 暴露闸**：非 localhost 访问且未启用鉴权 → mutation 直接 403+配置指引；localhost 请求零影响。强化 `auth.ts`：`crypto.timingSafeEqual` 常数时间比较、HMAC-SHA256 token、cookie `HttpOnly+SameSite=Strict+Secure(prod)`；登录 5 次/分钟限速。
- 变更：`pnpm verify` 全绿（**128 单测**，+19）；**19 E2E 全通过**（新增 2 个暴露测试：localhost mutation 放行 vs 伪造公网 Host mutation 403、读请求永不拦截）；`.env.example` 补 `AUTH_MODE` 说明；ADR-016。
- 下一步：S1-5 Git 命令注入审计 + zip 导出根固定。
- 阻塞：无。

### 2026-07-12 12:55 [claude-main]
- 完成：**S1-3 SSRF 反向代理加固**。攻击面：原 `/api/proxy` 只校验 `^https?://`，可把 `proxyBaseUrl` 设为 `127.0.0.1:8003`(oMLX)/`169.254.169.254`(云元数据)/内网地址 → 服务端替攻击者访问内网；`follow` 重定向还能 302 跳内网绕过。写 29 个对抗测试（多 notation IP：dotted/decimal/hex/IPv4-mapped-IPv6，环回/私网/链路本地/CGNAT/多播/元数据全覆盖）。
- 修复：新增 `src/lib/net/ssrf.ts`（IP 分类 + `dns.lookup(all)` 解析后逐个校验）；代理路由改 `redirect:"manual"` **逐跳重校验** Location、剥离 Cookie/Authorization 等敏感头、10MB 响应上限；新增 `allowInternalProxyTargets` 设置（默认关，fail-closed），后台面板加开关（带安全说明），**云元数据地址永不放行**（即使开内网开关）。
- 顺带（S3 预work）：`displayName` 默认从「B哥」改中性「朋友」、layout meta 去个人化。
- 变更：`pnpm verify` 全绿（**109 单测**，+29）；ADR-015 记录。
- 下一步：S1-4 分层鉴权模型（AUTH_MODE + fail-closed 绑定 + 常数时间比较 + 限速，写 ADR）。
- 阻塞：无。

### 2026-07-12 12:10 [claude-main]
- 完成：**S1-2 Skill 路径穿越/符号链接逃逸**。审计者视角发现 README 声称的"白名单防穿越"有**真实缺口**：`resolveWithinRoot` 的符号链接 realpath 检查**只在 candidate 已存在时执行**，而写操作（`saveSkill`、`.trash` 备份）创建的是不存在路径 → 经软链父目录（`evil→外部`）写 `evil/SKILL.md` 可逃逸到白名单外写真实文件。先写 8 个对抗测试证明（软链父写、saveSkill 逃逸、.trash 逃逸先全红）。
- 修复：改为**最近存在祖先 realpath + 尾段**校验——即使写目标不存在也解析真实位置，任何中间软链在祖先 realpath 步骤暴露；另显式拒绝 NUL 字节与反斜杠穿越；返回值改 realpath 化。8 对抗测试全绿，旧 skill-security 断言同步适配 realpath 语义。
- 变更：`pnpm verify` 全绿（**80 单测**，+8）；ADR-014 记录。区分了误报向量（未解码的 `%2e%2e` 是安全字面名，不该 throw）与真漏洞，不做橡皮图章。
- 下一步：S1-3 SSRF `/api/proxy`（allowlist + IP 校验 + 对抗测试）。
- 阻塞：无。

### 2026-07-12 11:30 [claude-main]
- 完成：**S1-1 XSS/Markdown 渲染净化**（本轮 S 系列首个）。Bootstrap：通读遗留文档，把 DELIVERY_REPORT「已知限制」与 HANDBOOK「已知问题」并入本轮看板（S1–S4 已登记）。攻击面分析写入新建 `docs/SECURITY_AUDIT.md`：全仓检索确认 HTML 注入面**收敛到单一** `renderMarkdown`（knowledge 详情页 `dangerouslySetInnerHTML`），任务/日报/skill 正文都是 `<textarea>` 纯文本天然免疫。
- 证明漏洞（先红）：10 个 XSS 向量（`<script>`/img onerror/svg onload/`javascript:`/`vbscript:`/`data:text/html`/事件属性/iframe·object·embed/frontmatter 走私/双链 alias 走私）**全部打穿**旧 `marked` 渲染器。
- 修复（转绿）：`marked` → unified/rehype 管线（remark-parse→gfm→rehype 不透传 raw HTML→rehype-sanitize 白名单→stringify），AST 层白名单净化无绕过；扩展 schema 放行 task-list checkbox。10 攻击全封 + 7 合法内容（双链/代码块/表格/checklist/安全链接/标题强调列表）回归全保。移除 `marked` 依赖。
- 变更：`pnpm verify` 全绿（**72 单测**，+17）；ADR-013 记录渲染管线切换。
- 下一步：S1-2 Skill 路径穿越/符号链接逃逸（realpath 校验 + 全套对抗测试）。
- 阻塞：无。

### 2026-07-10 16:55 [claude-main]
- 完成：**VIS-2 素材接入**。核验 codex-image 交付的 9 张素材质量（app-icon 玻璃霓虹 cB、logo-wordmark、bg-dark/light 极光、4 空状态 3D 玻璃、404 小卫星），全部符合深空玻璃拟态风格。接入：app-icon → `src/app/icon.png`（favicon）+ 侧边栏圆角图标；EmptyState 4 种空态 + 404 改用真图（`ART_SRC` 映射，knowledge 复用 apps 图）。**黑底处理**：按 B哥 决策把黑底插画包进圆角玻璃容器（border + 青色辉光），暗/亮双主题都自洽（实机双主题截图确认）。
- 决策（B哥 拍板）：背景大图 bg-dark/light **不接入**，保留现有动态 CSS 极光方案（性能优先、能随主题漂移）；logo-wordmark 保留备用（黑底整图不适合玻璃侧栏）。
- 变更：`pnpm verify` 全绿（55 单测）；17 E2E 全通过（未破坏 EmptyState 相关断言）。另修：devIndicators 移右下角、body suppressHydrationWarning、orbit 坐标四舍五入（hydration fix，已提交 56334df）。
- 阻塞：无。

### 2026-07-10 16:38 [codex-image]
- 完成：按需求文档 Part B 交付 9 张正式视觉素材：App 图标、横版字标、暗/亮主题背景、4 张空状态插画与 404 插画；全部使用 GPT Image 生成并按规定文件名保存到 `public/assets/`。
- 核验：9 个项目文件与 Codex 生成原件逐一 SHA-256 匹配；方图为 1:1，横图为 16:9；全部是不透明 PNG，因此本批无需切换 `gpt-image-1.5` 透明背景路径。
- 验证：`pnpm verify` 全绿（Lint、TypeScript、55 单测、Next.js 生产构建）。
- 阻塞：无；工作区另有不属于本任务的 `next.config.mjs` 并发改动，未修改、未暂存。

### 2026-07-10 15:10 [claude-main]
- 完成：**M6 打磨 + 全部里程碑交付**。仪表盘「今日轨道」签名环图（完成率弧 + 任务光点按状态着色 + 缓慢旋转 + 点击直达 + reduced-motion 暂停）、近 14 天趋势/合集分布（懒加载 Recharts）/年度活动热力图、数字 count-up；命令面板 Cmd+K 验收；空状态三件套全站；实机截图确认明暗双主题质感。Lighthouse：**桌面 Performance 99 / Accessibility 96**（移动 87 为字体 swap 实验室惩罚，已记 §7）。README 补功能一览、写 DELIVERY_REPORT。
- 变更：`pnpm verify` 全绿（55 单测）；**17 E2E 全通过**（新增 orbit 渲染、reduced-motion 禁用动画、移动端底部导航+子任务勾选）。真实截图零 console 错误。
- 交付状态：M1–M6 全部 ✅，验收清单 8 项全部处理完毕。收尾：DELIVERY_REPORT + 最终 commit。
- 阻塞：无（Git 远端待 B哥 配置后 push 一次）。

### 2026-07-10 14:50 [claude-main]
- 完成：**M5 接入与后台全部交付**。应用中心（link 新标签 / iframe 内嵌+服务端 X-Frame-Options/CSP 预检+8s 加载超时→优雅降级为提示卡片+新窗口打开 / proxy 反向代理骨架 + 演示）；后台管理（ADMIN_PASSCODE + httpOnly cookie 口令门 + 6 面板：数据概览/Git 同步/应用 CRUD/Skill 目录配置/个性化/导出 vault zip）；Git 同步面板（simple-git，快速提交 + pull --rebase 后 push，冲突列文件提示手动解决，**永不 force push**）。仪表盘问候改为可配置称呼 + 按时段。
- 变更：`pnpm verify` 全绿（55 单测）；14 E2E 全通过，含应用登记→上架、iframe 被 github.com 拒绝→降级、后台口令门、Git 面板。
- 下一步：M6 打磨 — 仪表盘「今日轨道」签名元素 + 趋势/分布/热力图、命令面板增强、动效与空状态全量、无障碍/Lighthouse、README/交付报告收尾。
- 阻塞：无。

### 2026-07-10 14:35 [claude-main]
- 完成：**M4 Skill 双模块 + 知识库全部交付**。Tab A（真实 SKILL.md 扫描/查看/编辑，编辑前备份到该 root 的 .trash，保留 allowed-tools 等未知字段，附属文件树，个人级覆盖项目级标注，新建/删除按 ADR-006 占位禁用）；Tab B 个人技能树（分类矩阵卡墙 + 雷达图 + 学习记录一键追加 + 反链）；知识库（列表/详情、Markdown 渲染、[[双链]]→可点链接、反链面板）。**红线守卫**：所有 skill FS 操作过白名单 + 防 ../ / 绝对路径 / 符号链接穿越。
- 变更：`pnpm verify` 全绿（50 单测，含 4 项穿越红线测试）；11 E2E 全通过，含在隔离临时 skills 目录扫描/编辑真实 SKILL.md（保留未知字段）。确认真实 ~/.claude/skills（39 个）与真实 vault 全程零改动。
- 下一步：M5-1 应用中心（link/iframe 降级/proxy 骨架）→ M5 后台全面板 + Git 同步面板。
- 阻塞：无。

### 2026-07-10 14:20 [claude-main]
- 完成：**M3 报告系统全部交付**。日报聚合（读全量任务 动态、按 完成/推进/新建/受阻 归类、填固定五段模板、明日计划预填高优未完成）、重新聚合的增量合并（不覆盖手写内容）、编辑/失焦保存/定稿、月历浏览、复制为纯 Markdown（飞书友好）；周报聚合（完成/新建数 + 各合集投入占比）、两张 Recharts 图（每日完成柱状 + 合集分布环）、编辑/定稿/导出 .md。
- 变更：`pnpm verify` 全绿（39 单测，含增量合并不覆盖手写的验证）；9 个 E2E 全通过，覆盖「新建任务→生成日报→编辑→定稿→磁盘 status:final」完整无手工拷贝链路 + 周报生成。
- 下一步：M4-1 Claude Code Skills 扫描/查看/编辑（编辑前备份到 .trash）+ 白名单防路径穿越（红线）。
- 阻塞：无（Git 远端未配置，本地提交照常）。

### 2026-07-10 14:05 [claude-main]
- 完成：**M2 任务系统全部交付**。任务/合集 service（写 .md→追加动态→重建索引）、Route Handlers、列表视图（筛选/排序/搜索）、看板（dnd-kit 拖拽改 status 并自动记动态）、详情抽屉（状态切换/进度滑杆/子任务勾选/正文编辑/动态时间线）、合集墙（进度环+归档）+ 合集详情页。
- 变更：`pnpm verify` 全绿（32 单测 + build）；7 个 E2E 全通过，覆盖「新建→改状态→动态日志→磁盘 .md 一致」与「Obsidian 外部写文件→UI 自动刷新」两大验收项。修复 tsbuildinfo 误提交（已 gitignore）。
- 下一步：M3-1 日报聚合（完成/推进/新建/受阻分类，复制为 Markdown）。
- 阻塞：无（Git 远端仍未配置，本地提交照常）。

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

**M2（2026-07-10）**：任务管理能用了。你可以新建任务、在看板上拖着卡片换状态、点开任务改进度和勾子任务，每一步系统都会自动记一条「动态」——这些动态以后就是自动生成日报的素材。相关任务还能归到「合集」里，合集会自动算总进度。所有改动都实时写进 vault 里的 Markdown 文件，随时能用 Obsidian 打开或粘进飞书。

**M3（2026-07-10）**：日报周报能一键生成了。点「生成日报」，系统就把你当天所有任务动态自动分成"完成/推进/受阻"填进日报，明日计划还会帮你预填没做完的重点任务；你改两笔、点定稿，再点「复制为 Markdown」就能直接粘进飞书。周报会自动统计本周完成数和各合集的投入占比，还配了两张图。全程不用手动抄一个字。

**M4（2026-07-10）**：能在工作台里直接管理你的 Claude Code Skill 了。它会扫出你 ~/.claude/skills 里所有 skill，点开能看能改，改之前自动备份、绝不会丢你的 allowed-tools 这些配置，改完对 Claude Code 立刻生效。另外「个人技能树」能看你各领域的等级雷达图、一键记录"今天学了什么"；知识库能浏览你 Obsidian 笔记并点双链跳转。安全上做了最严的防护，任何想跳出目录读别的文件的操作都会被挡下。

**M5（2026-07-10）**：能接开源应用、后台也齐活了。在后台「应用管理」登记一个开源应用（比如 Excalidraw 白板），它就出现在应用中心，能新标签打开或直接内嵌在工作台里用；碰上不让内嵌的网站会自动给你一个"新窗口打开"的按钮，不会白屏。后台还能一键 Git 提交/同步（绝不会强推坏你数据）、改称呼和默认主题、把整个 vault 打包成 zip 下载备份。后台用口令保护，防止误点。

**M6（2026-07-10）· 全部完工**：最后把仪表盘做惊艳了——正中一个缓慢旋转的「今日轨道」环，中间是今日完成率，任务变成轨道上按状态着色的光点，点一下直接跳到那个任务；下面还有近两周完成趋势、合集分布和一整年的活动热力图。全站动效、空状态、无障碍都打磨到位，桌面性能跑分 99、无障碍 96。到这里 6 个阶段全部交付，你可以正式开始用了。详见 docs/DELIVERY_REPORT.md。
