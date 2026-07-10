# ccBilly 工作台 · Claude Code 开发提示词

> **本文档结构**
> - **Part A**：给 Claude Code 的正式提示词（整段复制粘贴即可开工）
> - **Part B**：给 Codex（GPT Image 2 / gpt-image-2）的生图提示词
> - **Part C**：B哥 的使用建议与后续迭代路线
>
> **推荐用法**：在一个空目录（如 `ccbilly-workspace`）中启动 `claude`，先按 `Shift+Tab` 进入 Plan Mode，把 Part A 全文粘贴进去，让 Claude Code 先输出实施计划、你确认后再动工。生图素材可并行让 Codex 产出，放入 `public/assets/` 后告知 Claude Code 引用。

---

# Part A · 正式提示词（复制以下全部内容给 Claude Code）

## 0. 角色与总体目标

你是一名资深全栈工程师 + 产品设计师。请为唯一用户 **B哥（Billy）** 从零构建一个本地优先的个人工作台 **「ccBilly 工作台」**：一个集任务进度跟进（合集/任务/日报/周报）、Skill 管理、知识库、开源应用接入、后台管理于一体的 Web 应用，视觉风格为**深空玻璃拟态科技感**，支持**明暗双主题**切换。

开发过程中的硬性要求：

1. **先规划后编码**：先输出架构方案与里程碑计划，经确认后再写代码。
2. **第一个交付物是 `CLAUDE.md`**：记录本项目的架构决策、目录结构、数据 schema、常用命令、里程碑进度，之后每完成一个里程碑就更新它，保证跨会话上下文一致。
3. **有歧义就问**：遇到本提示词未覆盖或相互冲突的细节，先向 B哥 提问确认，不要自行猜测后大规模实现。
4. **界面文案用中文**，代码、变量、注释用英文；日期边界按系统本地时区计算。

## 1. 背景与关键约束（这些约束决定了架构，必须遵守）

- B哥 会**定期将整个项目（含数据）push 到 GitHub**，在多台设备间同步。
- B哥 本地使用 **Obsidian** 管理文档，重要内容会转存到**飞书文档**。
- 因此：**所有业务数据必须是 Git 友好、Obsidian 可直接打开、可无损粘贴进飞书的纯文本 Markdown**。禁止把业务数据只存在二进制数据库里。
- 单用户、本地运行为主（`localhost`），不做多租户；但代码要为未来可能的内网/容器部署留余地。

## 2. 核心架构决策

**Markdown 优先（Markdown-first）的数据层：**

- 所有业务数据（任务、合集、日报、周报、个人技能、知识笔记、应用注册表）以「YAML frontmatter + Markdown 正文」的 `.md` 文件形式存储在项目内的 `vault/` 目录中。`vault/` 纳入 Git 版本控制，它就是同步与备份的载体。
- **SQLite 仅作为可随时重建的本地索引缓存**（`cache/index.db`，写入 `.gitignore`）：应用启动时全量扫描 `vault/` 建索引，运行期用 `chokidar` 监听文件变更做增量更新。任何写操作**先原子性落 Markdown 文件（写临时文件后 rename），再更新索引**。索引损坏或缺失时可一键重建，不丢任何数据。
- **兼容 Obsidian**：支持 `[[wiki 双链]]` 语法；不使用 Obsidian 无法渲染的私有语法；`vault/.obsidian/` 默认写入 `.gitignore`（README 中说明用户可自行调整）。B哥 用 Obsidian 直接改 `vault/` 里的文件后，工作台应在数秒内自动感知并刷新。
- **内置 Git 同步面板**（基于 `simple-git`）：展示分支、领先/落后、变更文件数；提供「快速提交」（自动生成 message 如 `chore(vault): sync 2026-07-10 21:30`）与「同步」（`pull --rebase` 后 `push`）按钮；检测到冲突时列出冲突文件并提示用外部工具解决，**永远不允许 force push**。

## 3. 技术栈（按此执行，具体版本取当前最新稳定版）

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js（App Router）+ TypeScript（strict） | 前后端一体，Route Handlers 提供 API |
| 样式 | Tailwind CSS + shadcn/ui（深度定制）| 玻璃拟态通过自定义 design tokens 实现 |
| 动效 | Framer Motion | 统一动效规范见 §7 |
| 数据 | gray-matter（frontmatter 解析）、chokidar（监听）、better-sqlite3（索引缓存）、zod（schema 校验）| Markdown 为唯一事实来源 |
| 主题 | next-themes（class 策略）| 明/暗/跟随系统，SSR 无闪烁 |
| 图表 | Recharts | 趋势、分布、热力图 |
| Git | simple-git | 同步面板 |
| 包管理 | pnpm；Node 20+ | 提供 Dockerfile + docker-compose（可选部署用）|

## 4. 目录结构（骨架）

```text
ccbilly-workspace/
├── CLAUDE.md                  # 项目约定与进度（第一个交付物）
├── README.md                  # 启动、同步、Obsidian/飞书 配合说明
├── vault/                     # ★ 全部业务数据（纳入 Git）
│   ├── tasks/                 # 任务：{yyyymmdd}-{slug}.md
│   ├── collections/           # 合集
│   ├── reports/
│   │   ├── daily/             # 日报：YYYY-MM-DD.md
│   │   └── weekly/            # 周报：YYYY-Www.md（ISO 周）
│   ├── skills/                # 个人技能树条目
│   ├── knowledge/             # 知识库笔记（Obsidian 主战场）
│   └── apps/                  # 外部应用注册表
├── cache/                     # SQLite 索引等（gitignore）
├── src/                       # Next.js 应用（app/、components/、lib/、features/ 按功能分域）
├── public/assets/             # Logo、背景、空状态插画（由 GPT Image 2 生成后放入）
└── scripts/seed.ts            # 示例数据生成脚本（pnpm seed）
```

## 5. vault 数据规范（frontmatter schema，全部用 zod 校验）

**通用规则**：`id` 全局唯一；`created` / `updated` 为 ISO 8601 时间；frontmatter 解析失败的文件不允许导致应用崩溃，而是进入后台的「待修复」列表并给出错误原因。写回文件时保留未知字段。

**任务 `vault/tasks/*.md`**

```yaml
---
id: task-20260710-a1b2
type: task
title: 接入 Excalidraw 到应用中心
status: todo            # todo | doing | blocked | done | archived
priority: P1            # P0 | P1 | P2 | P3
collection: "[[开源项目接入]]"   # 可空；用双链指向合集
tags: [工作台, 集成]
progress: 0             # 0-100
due: 2026-07-15
created: 2026-07-10T10:00:00+09:00
updated: 2026-07-10T10:00:00+09:00
---
任务描述正文……

## 子任务
- [ ] 调研 iframe 兼容性
- [ ] 编写注册表条目

## 动态
- 2026-07-10 10:00 · 创建任务
```

> `## 动态` 区块由系统自动追加：所有状态流转、进度变更、新建/归档动作都以 `- YYYY-MM-DD HH:mm · 状态 doing → done` 的格式落在这里。**它是日报自动生成的数据源**，同时人读机读两相宜。

**合集 `vault/collections/*.md`**：`id, type: collection, title, status(active|archived), description, created, updated`。合集进度 = 下属任务加权完成度（实时由索引计算，不落盘）。

**日报 `vault/reports/daily/YYYY-MM-DD.md`**：`date, type: daily, status(draft|final), generated_at`。正文模板固定五段：`## 今日完成`、`## 进行中`、`## 遇到的问题`、`## 明日计划`、`## 随想`。

**周报 `vault/reports/weekly/YYYY-Www.md`**：`week(如 2026-W28), type: weekly, status(draft|final), range(起止日期)`。正文模板：`## 本周速览`（自动统计数字）、`## 重点产出`、`## 问题与风险`、`## 下周计划`。

**个人技能 `vault/skills/*.md`**：`id, type: skill, name, category, level(1-5), target_level, status(learning|using|mastered|paused), tags, related([[双链]])`。正文含 `## 学习记录`（时间线，可从界面一键追加条目）与 `## 资源`。

**应用注册 `vault/apps/*.md`**：`id, type: app, name, mode(link|iframe|proxy), url, icon, category, status(enabled|disabled), order, notes`。

## 6. 功能模块需求

### 6.1 仪表盘（首页）
问候语（称呼「B哥」）+ 日期；今日待办与进行中任务卡片；本页签名元素「**今日轨道**」：一个环形轨道图，圆环表示今日完成率，任务以光点形式分布在轨道上（按状态着色），缓慢旋转，点击光点直达任务详情。下方两张图：近 14 天完成趋势（面积图）、按合集的任务分布；再加一块 GitHub 风格的年度活动热力图（数据来自任务动态）。顶栏常驻：全局搜索入口、Git 同步状态徽章、主题切换、快速新建按钮。

### 6.2 任务与合集
- **列表视图**：筛选（状态/优先级/合集/标签）、排序、关键字搜索。
- **看板视图**：按 status 分列，支持拖拽换列；拖拽即更新 frontmatter 的 `status` 并向 `## 动态` 追加一条记录。
- **任务详情抽屉**：Markdown 编辑器（正文所见即所得或分栏预览均可），子任务 checklist 可勾选（勾选写回文件），进度滑杆，动态时间线展示。
- **合集页**：合集卡片墙（进度环 + 任务数），点进查看下属任务；支持归档。

### 6.3 日报
「生成今日日报」按钮 → 服务端聚合当日所有任务动态，按「完成 / 推进 / 新建 / 受阻」归类填入模板生成 `draft`，「明日计划」预填未完成的高优任务 → 用户编辑 → 「定稿」置为 `final`。历史日报以日历视图浏览；每篇日报提供「**复制为 Markdown**」按钮（纯 Markdown、无 HTML，保证粘贴进飞书文档格式不乱）。当天已有日报时按钮变为「重新聚合」，需二次确认且不覆盖手写内容（增量合并到对应小节末尾）。

### 6.4 周报
聚合本周 7 天日报 + 任务统计，生成 `draft`：「本周速览」自动填入完成任务数、新建数、各合集投入占比，并配两张图（每日完成柱状图、合集分布环图）。同样支持编辑、定稿、复制为 Markdown、导出 `.md` 文件。

### 6.5 Skill 管理（双模块，同页两个 Tab）

**Tab A · Claude Code Skills 管理**（管理的是真实生效的 Skill 文件，不是副本）：

- 扫描并列出两个层级：**个人级 `~/.claude/skills/*/SKILL.md`** 与 **项目级 `<项目根>/.claude/skills/*/SKILL.md`**（项目根路径列表在后台可配置多个）。列表展示：名称、description、来源层级、最近修改时间；同名 Skill 需标注覆盖关系（个人级覆盖项目级）。
- 查看：渲染 SKILL.md；展示 Skill 目录内的附属文件树（`scripts/`、`references/`、`assets/` 等）。
- 编辑：在线编辑 frontmatter 与正文并保存。**校验规则**：`name` 仅小写字母、数字、连字符且 ≤64 字符；`description` 必填并提示写清「能力 + 触发场景」；保存时保留所有未知 frontmatter 字段（如 `allowed-tools`、`argument-hint` 等），不得丢字段。
- 新建：表单式创建（目录名 = 命令名），生成规范的 SKILL.md 模板。
- 删除：移入 `~/.claude/skills/.trash/<时间戳>/` 回收站，二次确认。
- 界面提示一条事实：Claude Code 会监听 skills 目录，**SKILL.md 的改动对运行中的会话即时生效**（仅新建顶级 skills 目录需要重启 Claude Code）。
- **安全**：所有文件操作限定在配置的白名单目录内，严防路径穿越（`../`）；这是本模块的红线。

**Tab B · 个人技能树**（数据在 `vault/skills/`）：

- 技能矩阵：按 category 分组的卡片墙，展示等级（1–5 星/进度条）、状态徽章、目标等级差距。
- 分类雷达图：各分类平均等级一图总览。
- 技能详情：学习记录时间线（可一键追加「今天学了什么」）、资源链接、与知识库条目的 `[[双链]]` 及反链列表。

### 6.6 知识库（轻量）
浏览 `vault/knowledge/` 的笔记，渲染 Markdown 与 `[[双链]]`（可点击跳转），提供反链面板。定位是**浏览与关联**，深度编辑仍在 Obsidian 完成——不要造一个重型编辑器。

### 6.7 应用中心（开源项目接入）
- 卡片网格展示已注册应用（图标、名称、分类、状态）。三种模式：
  - `link`：新标签页打开；
  - `iframe`：在工作区内嵌打开（合理设置 `sandbox`）；加载失败或对方设置了 `X-Frame-Options`/`CSP frame-ancestors` 拒绝内嵌时，优雅降级为提示卡片 + 「新窗口打开」按钮；
  - `proxy`：预留 `/api/proxy/[appId]` Route Handler 反向代理骨架（可配置目标 baseUrl 与注入 header），为将来接入自托管开源服务的 API 做准备，本期只需打通框架 + 一个演示。
- 应用增删改在后台管理完成，数据落 `vault/apps/`。

### 6.8 后台管理 `/admin`
- 简单口令保护：环境变量 `ADMIN_PASSCODE` + httpOnly cookie 会话。README 中明确警告：**此鉴权仅防本机误触，若公网部署必须另加真正的认证层**。
- 面板：① 数据概览（各类条目数、索引状态、「重建索引」按钮、待修复文件列表）；② Git 同步面板（见 §2）；③ 应用管理 CRUD；④ Skill 扫描目录配置；⑤ 个性化（称呼、每周起始日=周一、默认主题）；⑥ 数据导出（一键打包 `vault/` 为 zip 下载）。

### 6.9 命令面板（Cmd/Ctrl + K）
全局模糊搜索任务/日报/周报/技能/知识/应用；快捷动作：新建任务、生成今日日报、打开本周周报、Git 同步、切换主题。

## 7. UI 设计规范：深空玻璃拟态（Deep-Space Glassmorphism）

> 视觉方向已由 B哥 拍板，请严格执行；把克制留给四周，把惊艳集中在签名元素（仪表盘「今日轨道」+ 全局星空氛围层）上。

**暗色主题（默认）「深空」：**

- 背景：`#060913` 底色，中心向边缘的径向渐变（`#0B1226 → #05070F`）；其上叠两层氛围：① 低密度星点 canvas 粒子层；② 两团缓慢漂移（约 40s 周期）的极光光斑——电光青 `#22D3EE` 与星云紫 `#8B5CF6`，透明度 10–14%，`blur ≥ 120px`。
- 玻璃卡片：背景 `rgba(255,255,255,0.055)`；`backdrop-blur: 24px`；边框 `1px rgba(255,255,255,0.10)`；卡片顶部 1px 内侧高光 `rgba(255,255,255,0.18)`；圆角 16–20px；阴影 `0 8px 40px rgba(2,6,23,0.5)`，hover 时附加品牌色辉光 `0 0 24px rgba(34,211,238,0.15)` 并轻微上浮。
- 品牌渐变：`#22D3EE → #818CF8 → #C084FC`（电光青→星际靛→星云紫），用于主按钮、进度环、选中态。
- 文字：主 `#EAF0FA`；次 `rgba(234,240,250,0.62)`；禁用 `0.38`。语义色：成功 `#34D399`、警告 `#FBBF24`、危险 `#FB7185`、信息 `#60A5FA`。

**亮色主题「云海晨光」（不是暗色的简单反转，要独立设计）：**

- 背景：`#F4F6FC → #E8EDFA` 柔和渐变，叠极淡的青紫极光晕染；玻璃卡片 `rgba(255,255,255,0.65)` + `blur 20px` + 边框 `rgba(15,23,42,0.08)`，阴影轻而弥散。
- 文字主色 `#0B1324`；品牌渐变加深为 `#0891B2 → #6D28D9` 以保证对比度。
- **两套主题的正文与关键控件必须通过 WCAG AA 对比度检查。**

**字体**：展示/数字用 Space Grotesk（贴合深空气质），正文用 Inter，中文回退 `"PingFang SC", "Noto Sans SC", "Microsoft YaHei"`，等宽用 JetBrains Mono；统计数字启用 `tabular-nums`。

**动效**：统一 150–300ms，缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；页面进入 fade + 8px 上移、子元素 40ms stagger；仪表盘数字 count-up；看板拖拽有拾起/落下反馈。**`prefers-reduced-motion` 时关闭粒子、光斑漂移与一切装饰动画。**

**布局**：左侧玻璃质感 Sidebar（图标+文字，可折叠为纯图标）；顶栏：面包屑、全局搜索、Git 徽章、主题切换（日/月图标，点击有一次流畅的天体交替微动画）；移动端切换为底部 Tab 导航，全站响应式。

**主题切换实现**：next-themes class 策略，支持 亮/暗/跟随系统 三态，偏好持久化，SSR 首屏无闪烁（FOUC 为验收硬指标）。

## 8. 工程规范与质量门槛

- TypeScript strict；所有 frontmatter 读写经 zod schema；关键路径（文件损坏、Git 冲突、iframe 被拒）都有兜底 UI，不白屏。
- 空状态、加载骨架屏（玻璃质感 shimmer）、错误态三件套每个页面齐全；空状态使用 `public/assets/` 下的插画位（素材由 GPT Image 2 生成，先用占位图实现，素材到位后替换）。
- 提供 `pnpm seed` 生成一套演示数据（3 个合集、15 个任务、7 天日报、1 篇周报、8 个技能、3 个应用）。
- `.gitignore`：`node_modules/`、`.next/`、`cache/`、`.env*`、`vault/.obsidian/`；**`vault/` 必须提交**。
- README 覆盖：启动方式、GitHub 同步工作流、Obsidian 打开 vault 的方法、飞书流转方法、Docker 可选部署、`ADMIN_PASSCODE` 配置。

## 9. 实施里程碑（每个里程碑结束：跑通 lint + build，对照验收清单自查，向 B哥 演示后再进入下一个）

1. **M1 地基**：项目脚手架、CLAUDE.md、design tokens 与明暗主题壳、vault 数据层（schema/读写/监听/索引/待修复机制）、seed 脚本。
2. **M2 任务系统**：任务 CRUD、列表 + 看板、任务详情抽屉、合集、动态日志。
3. **M3 报告系统**：日报聚合生成/编辑/定稿/日历、周报聚合/图表/导出、复制为 Markdown。
4. **M4 Skill 双模块**：Claude Code Skills 扫描/查看/编辑/新建/回收站 + 个人技能树 + 知识库轻量浏览与双链。
5. **M5 接入与后台**：应用中心（link/iframe/proxy 骨架）、后台管理全部面板、Git 同步面板。
6. **M6 打磨**：仪表盘「今日轨道」签名元素、命令面板、动效与空状态全量替换、性能与无障碍冲刺、README 收尾。

## 10. 验收清单（Definition of Done）

- [ ] 全链路：新建任务 → 看板拖拽流转 → 动态自动记录 → 生成日报草稿 → 编辑定稿 → 周报聚合成文，全程无手工拷贝。
- [ ] 用 Obsidian 直接修改 `vault/` 中任一任务文件，工作台数秒内自动同步显示。
- [ ] Claude Code Skills 的新建/编辑在真实 `~/.claude/skills/` 生效；路径穿越攻击被拒绝。
- [ ] 明暗主题切换无闪烁；两套主题对比度达 AA；`prefers-reduced-motion` 生效。
- [ ] Git 面板可完成一次真实的 commit + push，冲突时给出清晰提示且不破坏数据。
- [ ] iframe 模式成功内嵌一个演示应用（如 excalidraw.com），并演示被拒内嵌时的降级。
- [ ] 日报「复制为 Markdown」粘贴到飞书文档后标题/列表/链接格式正确。
- [ ] 移动端可正常浏览与勾选任务；本地生产构建 Lighthouse 性能分 ≥ 90。

---

# Part B · GPT Image 2 生图提示词（交给 Codex 执行）

**执行说明（先读）：**

- 模型用 `gpt-image-2`，质量选 high；它的文字渲染很强，Logo 中的「ccBilly」字样可以直接生成。
- **gpt-image-2 不支持透明背景**。需要透明 PNG（如导航栏 Logo 抠底）时，改用 `gpt-image-1.5` 并在提示词中加 `transparent background`；或直接使用深色底方图，由前端以圆角容器呈现。
- 提示词已内嵌品牌色 hex，请原样保留；每张建议生成 2–4 个候选再挑选。细节不满意优先用**图像编辑模式**修改（"change X to Y"），不要整图重来。
- 产出统一放入 `public/assets/`，命名见各条目。

### B1 · App 图标（`app-icon.png`，1:1，1024×1024）

```text
App icon for "ccBilly", a personal productivity workspace. A minimalist glowing monogram "cB" formed by two interlocking orbital rings, rendered as translucent frosted glass with an electric cyan (#22D3EE) to nebula violet (#8B5CF6) gradient rim light. Deep space background in very dark indigo (#060913) with a few tiny sharp stars. Glassmorphism, subtle inner glow, centered composition, clean modern vector aesthetic, no photographic elements, no extra text.
```

> 中文说明：双轨道环交叠成「cB」字母组合的玻璃图标，深空底。若需透明底版本，换 gpt-image-1.5 并追加 `transparent background, isolated icon`。

### B2 · 横版品牌字标（`logo-wordmark.png`，16:9 生成后按需裁切）

```text
Horizontal logo lockup for "ccBilly" personal workspace. The word "ccBilly" set in a clean geometric sans-serif similar to Space Grotesk, white letterforms with a subtle cyan-to-violet gradient sheen, preceded by a small glass orbital-ring monogram icon. Solid very dark indigo background (#060913) with faint star specks. Minimal, high contrast, precise evenly-spaced letterforms, professional tech branding, no slogan, no extra elements.
```

### B3 · 暗色主题 Hero / 登录页背景（`bg-dark.png`，16:9，尽量 4K）

```text
Ultra-wide deep space wallpaper for a dark UI background. A vast dark indigo nebula fading from #0B1226 near the center to #05070F at the edges, two soft aurora ribbons in electric cyan and nebula violet drifting diagonally, sparse tiny stars of varying brightness. Extremely dark and low-contrast overall so that white UI text remains readable on top. Cinematic depth, smooth gradients, no planets, no lens flare, no text, minimal noise.
```

### B4 · 亮色主题背景（`bg-light.png`，16:9）

```text
Soft light-theme wallpaper: an ethereal sky above a sea of clouds at dawn, pale periwinkle and lavender gradient with faint hints of cyan, gentle diffused light and a few soft bokeh light orbs. Airy, minimal, very low contrast and low saturation so that dark UI text remains readable on top. Dreamy but professional, no sun disk, no birds, no text.
```

### B5 · 空状态插画 ×4（1:1 或 3:2，各 1024）

统一风格后缀（每条 prompt 末尾拼接同一段，保证系列一致性）：

```text
, 3D glassmorphism illustration, translucent frosted-glass objects floating in dark indigo space (#0B1226 background), electric cyan and nebula violet rim lighting, soft volumetric glow, minimal centered composition with generous empty margins, clean studio render, no text
```

| 文件名 | 场景 | 主体描述（+ 上方统一后缀） |
|---|---|---|
| `empty-tasks.png` | 任务为空 | `A tiny cute astronaut relaxing in zero gravity beside an empty translucent glass checklist card with three unchecked round checkboxes` |
| `empty-reports.png` | 日报为空 | `An open translucent glass journal with blank softly-glowing pages, a small pen made of light orbiting above it leaving a thin trail` |
| `empty-skills.png` | 技能为空 | `A small crystal tree growing from a hexagonal glass pod, its branches ending in faint constellation nodes connected by thin lines of light` |
| `empty-apps.png` | 应用为空 | `Three empty translucent glass app cubes docked on a floating glass shelf, one empty slot glowing softly as if inviting a new module` |

### B6 · 404 / 错误页插画（`illustration-404.png`，1:1）

```text
A tiny lost satellite with a blinking cyan light drifting past a translucent glass planetary ring, its dotted light trail curving behind it into the gentle shape of a question mark
```

（末尾同样拼接 B5 的统一风格后缀。）

---

# Part C · 给 B哥 的使用建议

1. **启动顺序**：空目录跑 `claude` → Plan Mode 粘贴 Part A → 审阅它输出的实施计划 → 按里程碑逐个推进验收，不要让它一口气写完全部（质量和可控性都会差）。
2. **Obsidian 配合**：项目建好后，把 `vault/` 作为 Obsidian 的一个库（或软链进你现有库），双向编辑互不冲突——工作台会自动感知文件变化。
3. **飞书流转**：日报/周报页面的「复制为 Markdown」按钮是专门为飞书粘贴设计的，定稿后一键复制即可。
4. **多设备同步**：换设备后 `git pull` → `pnpm i` → `pnpm dev` 即恢复全部数据；日常用后台的 Git 面板一键同步。
5. **开源项目接入优先级**：先挑对 iframe 友好或有干净 REST API 的项目练手，例如 Excalidraw（白板）、Memos（碎片笔记）、Uptime Kuma（服务监控）；在后台「应用管理」登记即可上架到应用中心。
6. **生图顺序**：先出 B1 图标 + B3 暗色背景（界面立刻有质感），空状态插画等 M6 打磨阶段再按需生成，避免返工。
