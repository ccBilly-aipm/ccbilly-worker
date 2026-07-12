# ccBilly 工作台 · 项目手册（单一事实来源 / Single Source of Truth）

> 本文件是本项目的最高法。任何 Agent 在动手前必须先读它。
> 需求规格原文《ccBilly工作台-ClaudeCode开发提示词.md》（其 Part A 为需求基准）为 B哥 私有，未随开源仓库发布，保存在本地私有目录。**开源仓库内本手册即为需求与架构的单一事实来源。**
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

**需求来源**：`ccBilly工作台-ClaudeCode开发提示词.md`（Part A = 需求基准，Part B = 生图 prompt，Part C = 使用建议）——该原文为 B哥 私有、未随开源仓库发布，保存在本地私有目录；开源仓库内以本手册为准。

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
| ADR-011 | 2026-07-10 | 今日轨道光点坐标（`Math.cos/sin` 结果）四舍五入到 2 位小数；`<body>` 加 `suppressHydrationWarning` | ①服务端/客户端三角函数浮点末位漂移导致 SVG cx/cy hydration mismatch，四舍五入使字符串一致（视觉零影响）；②浏览器扩展（如 mpa-*）在 hydrate 前注入 body 属性属无害误报 | claude-main |
| ADR-018 | 2026-07-12 | vault 文件监听在 `CHOKIDAR_USEPOLLING=1` 或 `CI=true` 时启用 chokidar 轮询模式（interval 300ms），否则用原生 inotify/FSEvents | CI runner / overlayfs·tmpfs 容器 / 网络挂载不可靠地投递原生 fs 事件，导致"Obsidian 外部改文件自动刷新"在 CI 里系统性超时（非 flaky，重试也失败）；轮询是这些文件系统上的标准兜底，同时惠及 Docker/网络盘用户。本机默认仍用高效原生事件，零性能影响 | claude-main |
| ADR-019 | 2026-07-12 | V2 数据层用**可选判别字段** `kind: task\|requirement\|content`（缺省=task）在 `type:task` 之上做子类型，而非新增 `type`。`requirement` 加 `rice/stage`，`content` 加 `platforms/publish_date/stage/metrics`，合集加可选 `cycle:{start,end}` | 复用现有 task 管道（看板/动态/索引/原子写全部复用），`.passthrough()` 保证旧文件零改动可读；新字段全可选，缺省兜底=旧行为，满足"旧 vault 打开即用"硬红线。索引新增 `kind/score/stage` 列（可重建，非破坏） | claude-main |
| ADR-020 | 2026-07-12 | 角色预设（persona preset）= `模块开关集合 + 仪表盘默认布局 + 词汇表`，存 `vault/config/preset.md`；三预设 pm/creator/both（默认 both）。切换**只改展示层**（模块可见性 + 默认布局），绝不迁移/删除业务数据 | 蓝图 B1 决策一 + 本轮红线"预设切换不得改写业务数据"；preset 是纯配置，落 vault 可 Git 同步；模块注册表按 preset 过滤导航与 widget | claude-main |
| ADR-021 | 2026-07-12 | Widget 化仪表盘：widget 注册表 + 布局持久化到 `vault/config/dashboard.md`（frontmatter 存 `{widgetId,x,y,w,h}[]`）。拖拽/调宽在客户端，保存经鉴权 mutation API 写回 | 蓝图 B1 决策二；布局是配置数据，落 vault frontmatter 便于 Git 同步与两预设各存一套默认布局；写回走 V1.1 鉴权中间件（fail-closed 保护） | claude-main |
| ADR-022 | 2026-07-12 | 迁移脚本 `pnpm migrate`：**先把整个 vault 打包为带时间戳 zip 备份**（复用 archiver），再做幂等的补字段/建目录；迁移只增不改业务语义，可重复运行 | 本轮红线"迁移必须可逆（自动备份先行）"；因新字段全可选、旧文件本就可读，迁移主要是建 V2 目录（inbox/decisions/config/templates）与可选回填，备份保证任何情况可回滚 | claude-main |
| ADR-024 | 2026-07-12 | 情报源（feeds）抓取复用 V1.1 的 `assertProxyableUrl`（SSRF 守卫）作为**唯一出网闸**：添加订阅源前先校验 URL 可代理（内网/私网/云元数据一律拒绝，除非显式开内网且元数据永拒），抓取时 `redirect:"manual"`+2MB 上限+8s 超时；任何绕过即缺陷 | 蓝图 B4.6 + 本轮红线"情报源抓取只允许经 proxy allowlist 出网"；新增出网面必须复用既有 SSRF 防护而非另起炉灶，15 个对抗测试覆盖多 notation 内网地址 + 拒绝源不落盘 | claude-main |
| ADR-023 | 2026-07-12 | MCP server 用官方 `@modelcontextprotocol/sdk` 以 **stdio** 传输起步（`pnpm mcp`），非 HTTP | stdio 是 Claude Code 连接本地工具的默认且最简方式，无需开端口/处理网络鉴权；写工具直接调用 vault service 层，在进程内受同一套 zod 校验与原子写约束；`AUTH_MODE=passcode` 时写工具要求 `ADMIN_PASSCODE` 环境变量匹配（凭据约束）。HTTP 传输留作后续 | claude-main |
| ADR-017 | 2026-07-12 | 依赖升级清 `pnpm audit`（next 15.5.7→15.5.20、simple-git 3.28→3.36、vitest 3.2.4→3.2.7、postcss override ≥8.5.10）；补 `.nvmrc`(22)；`next.config.mjs` 加全站安全响应头（CSP + nosniff + Referrer-Policy + X-Frame-Options + Permissions-Policy） | 原 25 个漏洞含 2 critical（simple-git RCE、vitest UI 任意读文件）+ 12 high（多个 next Middleware/Proxy bypass、SSRF、DoS）——**其中 next Middleware bypass 直接威胁 S1-4 鉴权、simple-git RCE 直接关联 S1-5**；升级后 audit 零漏洞。CSP 采务实策略（保留 style/script `unsafe-inline` 不破坏玻璃拟态+主题脚本+图表，frame-src 放开供应用中心 iframe，frame-ancestors 'self' 防点击劫持），后续可 nonce 化收紧 | claude-main |
| ADR-016 | 2026-07-12 | 分层鉴权模型：`AUTH_MODE=none\|passcode`（默认 none）；新增 `src/middleware.ts` 统一在 `/api/*` 与 `/admin` 施加——passcode 模式下**所有 mutation API**（非只 /admin）需有效会话；**fail-closed 暴露闸**：非 localhost 访问且未启用鉴权时 mutation 直接 403+配置指引；`crypto.timingSafeEqual` 常数时间口令比较；HMAC-SHA256 会话 token；登录 5 次/分钟限速；cookie `HttpOnly+SameSite=Strict+Secure(prod)` | 原实现只有 /admin UI 有口令，所有 mutation API（含写真实 skills、Git、导出）**无鉴权**——他人 `-H 0.0.0.0`/Docker 对外部署即暴露整机；分层模型让本机 localhost 体验零降级、暴露场景强制安全（红线：本机默认免登录不破坏）。取代 ADR-006 中"后台口令仅防误触"的定位 | claude-main |
| ADR-015 | 2026-07-12 | 反向代理 `/api/proxy` 加 SSRF 防护：新增 `src/lib/net/ssrf.ts`（IP 分类 + DNS 解析后校验），代理前对目标所有解析 IP 做黑名单校验（环回/私网/链路本地/CGNAT/多播），`redirect:"manual"` 逐跳重校验，剥离 Cookie/Authorization 等敏感头，响应体 10MB 上限；新增 `allowInternalProxyTargets` 设置（默认关，fail-closed），云元数据地址 169.254.169.254 **永不放行** | 原实现只校验 `^https?://`，可被设为 `127.0.0.1:8003`(oMLX)/`169.254.169.254`(云元数据)/内网地址构成教科书级 SSRF，且 `follow` 重定向可 302 跳内网绕过；默认拒绝 + 显式开关兼顾本机模型代理需求与暴露场景安全 | claude-main |
| ADR-014 | 2026-07-12 | Skill 路径守卫 `resolveWithinRoot` 改为**基于最近存在祖先的 realpath** 校验（不再依赖 `existsSync(candidate)` 才做 realpath），并显式拒绝 NUL 字节与反斜杠穿越，返回值改为 realpath 化的安全路径 | 旧实现的符号链接检查只在 candidate 已存在时执行，导致**写不存在文件时经软链父目录逃逸**（实测打穿：软链 `evil→外部` + 写 `evil/SKILL.md` 落到外部）；新实现对写目标同样解析真实位置，无绕过。副作用：返回 realpath（调用方本就该操作真实位置），旧断言相应更新。取代 ADR-006 中路径守卫的实现细节，红线本身不变 | claude-main |
| ADR-013 | 2026-07-12 | Markdown→HTML 渲染从 `marked` 切换为 unified/rehype 管线（`remark-parse→remark-gfm→remark-rehype(不透传 raw HTML)→rehype-sanitize 白名单→rehype-stringify`），移除 `marked` 依赖 | `marked` 默认不消毒且透传内联 HTML，配合 `dangerouslySetInnerHTML` 构成实锤 XSS（10 个向量测试全部打穿）；rehype-sanitize 在 AST 层白名单净化，无绕过路径，且保留双链/代码块/表格/checklist 正常渲染。取代原渲染实现，不推翻其他 ADR | claude-main |
| ADR-012 | 2026-07-12 | 项目以 MIT 协议开源：①需求原文《ccBilly工作台-ClaudeCode开发提示词.md》移出仓库到本地私有目录 `../ccbilly-worker-private/` 并加入 `.gitignore`（含 Part C 个人化内容，不公开）；②`vault/` 全为 `pnpm seed` 演示数据，随仓库开源当演示集；③新增 `LICENSE`(MIT)、README 补开源说明/徽标/演示数据声明 | B哥 决策「开源，移出需求原文」；已核验仓库无真实密钥/邮箱/家目录/真名泄露 | claude-main |

> 后续新增 ADR 依次编号，只增不删；被推翻的 ADR 标注「已被 ADR-NNN 取代」而非删除。

---

## 3. 目录结构与数据 schema 摘要

### 3.1 目录结构

```text
ccbilly-worker/                        # = 项目根（当前目录）
├── LICENSE                            # MIT
│   # 需求原文 ccBilly工作台-ClaudeCode开发提示词.md 为 B哥 私有，未随开源仓库发布
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
| M3 报告系统 | 日报聚合/编辑/定稿/日历、周报聚合/图表/导出、复制 Markdown | ✅ 完成 | 2026-07-10 | (见 M3 commit) |
| M4 Skill 双模块 | Claude Code Skills 扫描/查看/编辑/回收站 + 技能树 + 知识库 | ✅ 完成 | 2026-07-10 | (见 M4 commit) |
| M5 接入与后台 | 应用中心(link/iframe/proxy) + 后台全面板 + Git 同步面板 | ✅ 完成 | 2026-07-10 | (见 M5 commit) |
| M6 打磨 | 今日轨道、命令面板、动效/空状态、性能/无障碍、README | ✅ 完成 | 2026-07-10 | (见 M6 commit) |
| S1 安全加固 | XSS 净化/路径穿越/SSRF/分层鉴权/Git 审计/依赖清零+CSP（6 项，攻击面分析→对抗测试→修复，见 SECURITY_AUDIT + ADR-013~017） | ✅ 完成 | 2026-07-12 | 06804ce |
| S2 健壮性与性能 | 数据层边界/chokidar 批量节流+并发锁/渲染缓存/压测 P95<200ms/FOUC+reduced-motion E2E | ✅ 完成 | 2026-07-12 | (见 S2 commits) |
| S3 开源成熟度 | CI（verify+Playwright，实机绿）/SECURITY.md/CONTRIBUTING.md/issue 模板/README 截图/去个人化/CHANGELOG/Docker 鉴权 | ✅ 完成 | 2026-07-12 | (见 S3 commits) |
| S4 收尾交付 | DELIVERY V1.1/里程碑表/人话汇报/tag v1.1.0 | ✅ 完成 | 2026-07-12 | (tag v1.1.0) |
| V2-M1 架构底座 | schema 扩展(kind/rice/stage/cycle)+迁移(可逆)+角色预设+Widget 仪表盘 | ✅ 完成 | 2026-07-12 | (见 V2-M1 commits) |
| V2-M2 PM 模块包 | 需求池/周期燃尽/路线图/决策日志/纪要转任务/模板包 | ✅ 完成 | 2026-07-12 | (见 V2-M2 commit) |
| V2-M3 创作者模块包 | 选题库/内容看板/排期日历/多平台/数据复盘/情报源(SSRF 守卫) | ✅ 完成 | 2026-07-12 | (见 V2-M3 commit) |
| V2-M4 通用体验 | 快速捕捉/命令面板/可保存视图/周复盘引导/Onboarding + B6 视觉 | ✅ 完成 | 2026-07-12 | (见 V2-M4 commit) |
| V2-M5 MCP server | 官方规范 stdio，7 工具，受鉴权约束 | ✅ 完成 | 2026-07-12 | (见 V2-M5 commit) |
| V2-M6 审核与上线 | REVIEW_V2 + README/CHANGELOG/DELIVERY + tag v2.0.0 + release | ✅ 完成 | 2026-07-12 | (tag v2.0.0) |

图例：⬜ 待开始 · 🔄 进行中 · ✅ 完成

**引导阶段现状盘点（2026-07-10）**：当前目录仅有需求原文 md，无任何代码。所有里程碑 M1–M6 均从零开始。

**M1 交付验证（2026-07-10）**：`pnpm verify` 全绿（lint + tsc + 26 单测 + build）；4 个 Playwright E2E（chromium）通过；`pnpm seed` 生成 39 条数据、索引 0 待修复。捕获并修复一处真实数据损坏 bug（YAML 把 ISO 日期解析成 Date 对象 → schema 现强制 Date→string 归一，frontmatter 无损 round-trip）。无 Git 远端，首次 commit 已本地落地（待 B哥 配置远端后 `git push -u origin main`）。

---

## 6. 验收清单（来自规格 §10，逐项勾选）

- [x] 全链路：新建任务 → 看板拖拽流转 → 动态自动记录 → 生成日报草稿 → 编辑定稿 → 周报聚合成文，全程无手工拷贝。（M3 E2E `reports.spec.ts` 覆盖）
- [x] 用 Obsidian 直接修改 vault/ 中任一任务文件，工作台数秒内自动同步显示。（M2 E2E `tasks.spec.ts` 覆盖：外部写文件 → UI 15s 内出现）
- [x] Claude Code Skills 的编辑在真实 ~/.claude/skills/ 生效（保留未知字段+保存前备份）；路径穿越攻击被拒绝。（M4：4 项穿越红线单测全过；编辑 E2E 在隔离临时目录验证；新建/删除写入按 ADR-006 分期，UI 已占位）
- [x] 明暗主题切换无闪烁；两套主题对比度达 AA；prefers-reduced-motion 生效。（M6：主题切换 E2E 无闪烁无 console 错误；Lighthouse 无障碍 96；reduced-motion E2E 验证 orbit 动画被禁用；两套主题实机截图确认可读）
- [x] Git 面板可完成一次真实的 commit + push，冲突时给出清晰提示且不破坏数据。（M5：simple-git 面板，pull --rebase 后 push，永不 force push；冲突列文件提示手动解决；E2E 验证面板渲染。真实 push 需 B哥 配置远端后点一次确认）
- [x] iframe 模式成功内嵌一个演示应用（如 excalidraw.com），并演示被拒内嵌时的降级。（M5：seed 含 Excalidraw iframe 应用；E2E 用 github.com 验证被拒内嵌→降级为提示卡片+新窗口打开）
- [x] 日报「复制为 Markdown」粘贴到飞书文档后标题/列表/链接格式正确。（M3：copy 输出纯 Markdown，无 HTML，单测覆盖；飞书真实粘贴需人工确认）
- [x] 移动端可正常浏览与勾选任务；本地生产构建 Lighthouse 性能分 ≥ 90。（M6：移动端 E2E 验证底部导航+子任务勾选；Lighthouse 桌面 Performance **99** / Accessibility **96**，达标。移动 preset 87：见下方说明，为模拟慢速 4G 下字体 swap 的实验室惩罚，非真实卡顿——FCP 0.9s / TBT 20ms / CLS 0 均优秀）

---

## 7. 已知问题与降级决策

### 7.1 压测结论（S2-4，2026-07-12）

数据集：`pnpm seed:stress` 生成 **2000 任务 + 730 日报 + 200 知识笔记**（共 2935 索引条目，0 待修复）。本地生产构建（`pnpm build && pnpm start`），机器 Apple M5 Pro / Node 22 / better-sqlite3。索引重建 312ms；文件写入 195ms。

服务端响应（`pnpm bench`，N=80，P95）：

| 路由 | P50 | P95 | P99 | 目标 |
|---|---|---|---|---|
| `/`（仪表盘，含今日轨道+图表） | 28ms | **33ms** | 43ms | <200ms ✅ |
| `/tasks`（任务列表+看板） | 3ms | **3ms** | 4ms | <200ms ✅ |
| `/reports/daily` | 2ms | **4ms** | 8ms | <200ms ✅ |
| `/api/tasks` | 8ms | **9ms** | 13ms | <200ms ✅ |
| `/api/search?q=…` | 1ms | **2ms** | 3ms | <200ms ✅ |

**结论**：2935 条目规模下所有关键路由 P95 远低于 200ms 目标。SQLite 索引（有 type/status 等列）+ better-sqlite3 同步查询在单机个人规模下绰绰有余；无需额外优化。复现：`STRESS_TASKS/STRESS_DAILIES/STRESS_NOTES` 可调数据量，`BENCH_N` 调采样数。

### 7.2 已知问题表

| 问题 | 根因 | 处理 | 日期 |
|---|---|---|---|
| Lighthouse 移动 preset 性能 87（桌面 99） | 移动 preset 模拟慢速 4G + 4× CPU，惩罚 `next/font` 的 Space Grotesk 字体 swap，导致 LCP（h1 问候语）被推迟到 4s；FCP 0.9s / TBT 20ms / CLS 0 均优秀 | 本工作台是 localhost 个人工具，桌面为真实使用场景（99 达标）。已把趋势/分布图 `next/dynamic` 懒加载以减包。移动端真实体验流畅（E2E 通过）。不为实验室数字做过度优化 | 2026-07-10 |
| Git 远端未配置 | B哥 尚未 `git remote add origin` | 本地提交照常，交付报告提醒 B哥 配好远端后 `git push -u origin main` | 2026-07-10 |
| Skills 新建/删除写入真实目录未开放 | ADR-006 分期：先只读+编辑（含备份），待 B哥 验收安全性 | UI 已占位禁用；红线守卫与编辑备份已就绪，开放只需去掉禁用态 | 2026-07-10 |
