# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 风格与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] — 2026-07-12 · 双角色版（PM + 创作者）+ MCP

从「B哥 的个人工作台」升级为「面向两类用户的产品」：同一内核、两套角色预设，并让工作台成为 Agent 可驱动的工具。

### Added — 架构底座（V2-M1）
- **角色预设层**：pm / creator / both 三预设，持久到 `vault/config/preset.md`；首启 Onboarding 选角色；nav 与 widget 按预设过滤。切换只改展示层，不迁移/删除数据（ADR-020）。
- **数据 schema 扩展**：task 加可选 `kind: task|requirement|content` 子类型（复用整条 task 管道），requirement 加 RICE + stage，content 加 platforms/publish_date/stage/metrics，合集加可选 cycle。全可选 + passthrough → **旧 vault 零改动可用**（ADR-019）。
- **Widget 化仪表盘**：可拖拽、可调宽度的玻璃 Bento 网格，布局按预设存 `vault/config/dashboard.md`（净化防注入，ADR-021）。
- **可逆迁移**：`pnpm migrate` 先 zip 备份再幂等非破坏迁移（ADR-022）。

### Added — PM 模块包（V2-M2）
需求池（RICE 打分排序 + 四段分诊）· 周期燃尽图 · 路线图时间线 · 决策日志（ADR 模板 + 到期复盘）· 会议纪要→行动项批量转任务 · 模板包（PRD/竞品/访谈/复盘/会议纪要）。

### Added — 创作者模块包（V2-M3）
选题库 · 内容管道五列拖拽看板 · 发布日历月视图拖拽改期 · 一稿多平台适配清单 · 数据复盘（快照录入 + 跨平台对比）· **情报源**（RSS/JSON 订阅，复用 V1.1 SSRF 守卫，仅白名单出网，ADR-024）。

### Added — 通用体验（V2-M4）
快速捕捉（命令面板 `!` 前缀入库）· 命令面板深化 + `?` 快捷键表 · 可保存视图 · 周复盘四步向导 · B6 视觉（PM 电光青 / 创作者星云紫 accent、widget 拖拽微动效）。

### Added — MCP server（V2-M5）
`pnpm mcp`（stdio）暴露 7 工具（list_tasks / create_task / update_task / append_activity / create_idea / generate_daily_draft / get_stats），让 Claude Code 等 Agent 直接驱动工作台。写工具受 `AUTH_MODE=passcode` 凭据约束（ADR-023）。见 `docs/MCP.md`。

### Security
- 新增出网面（情报源）与写入面（MCP）均复用 V1.1 的 SSRF / 分层鉴权防护；15 个 feed SSRF 对抗测试 + 10 个 MCP 鉴权测试。
- 新增 15 个 mutation API 全部落在 middleware 鉴权闸内；`pnpm audit` 仍 0 漏洞；V1.1 安全套件持续全绿。

### 测试与审核
- 单测 209 · E2E 33 全绿；大 vault（2935 条目）下所有 V2 路由 P95 ≤ 30ms。
- 上线前独立审核见 `docs/REVIEW_V2.md`（无 blocker）。

## [1.1.0] — 2026-07-12 · 安全加固与开源成熟度

面向开源发布的加固版：把项目从"自己能跑"提升到"陌生人敢用、敢部署、敢贡献"。

### Security（S1 · 攻击面分析 → 对抗性测试 → 修复，详见 `docs/SECURITY_AUDIT.md`）
- **XSS**：Markdown 渲染从 `marked` 切换为 `unified/rehype` 管线 + `rehype-sanitize` 白名单净化，封堵知识库笔记等处的脚本注入（ADR-013）。
- **路径穿越 / 符号链接逃逸**：修复 Skill 写操作经软链父目录逃逸白名单的真实漏洞，改为基于 `realpath` 最近存在祖先的校验（ADR-014）。
- **SSRF**：反向代理新增 IP 分类拒绝（环回/私网/链路本地/云元数据）、逐跳重定向重校验、敏感头剥离、响应体上限；新增 `allowInternalProxyTargets` 开关，默认关（ADR-015）。
- **鉴权模型**：新增 `AUTH_MODE=none|passcode` 分层模型 + `src/middleware.ts` 统一守卫**所有** mutation API；非 localhost 暴露且未启用鉴权时 fail-closed 拒绝；常数时间口令比较、HMAC 会话 token、strict cookie、登录限速（ADR-016）。
- **依赖 / 供应链**：`pnpm audit` 从 25 漏洞（2 critical + 12 high）清至 **0**；升级 next / simple-git / vitest / postcss；补 `.nvmrc`。
- **安全响应头**：全站 CSP + `X-Content-Type-Options` + `Referrer-Policy` + `X-Frame-Options` + `Permissions-Policy`（ADR-017）。

### Performance & Robustness（S2）
- 数据层边界：空文件 / 非法 YAML / 超大文件 / BOM / 特殊文件名统一走"待修复"或正确解析，绝不崩溃。
- chokidar 变更风暴：批量单事务索引 + 并发锁，一次 `git pull` 数百文件合并为一次提交。
- Markdown 渲染按内容（天然 mtime 正确）缓存，有界 FIFO。
- 压测（2935 条目）：关键路由 P95 ≤ 33ms，远低于 200ms 目标（`pnpm seed:stress` + `pnpm bench`）。
- 明暗主题无 FOUC、`prefers-reduced-motion` 全覆盖，均有 E2E 断言。

### Open-source maturity（S3）
- **CI**：GitHub Actions（`pnpm verify` + Playwright，含 S1 对抗性测试），README 加状态徽章。
- **社区文档**：`SECURITY.md`、`CONTRIBUTING.md`、bug / feature issue 模板。
- **README 截图**：`pnpm screenshots` 自动生成暗色仪表盘 / 看板 / 明暗对比，嵌入 README。
- **去个人化**：默认称呼改中性「朋友」，个人称呼由后台设置本地写入。
- **Docker**：`docker-compose.yml` 默认注入 `AUTH_MODE=passcode` 示例。

### 测试
- 单测 147 个、E2E 22 个全绿。

## [1.0.0] — 2026-07-10 · 首次交付（M1–M6）

- M1 地基（脚手架、明暗主题、Markdown-first 数据层、SQLite 索引、seed）。
- M2 任务系统（CRUD、列表+看板、详情抽屉、合集、动态日志）。
- M3 报告系统（日报/周报聚合、编辑定稿、图表、复制为 Markdown）。
- M4 Skill 双模块（Claude Code Skills 扫描/编辑 + 个人技能树 + 知识库）。
- M5 接入与后台（应用中心 link/iframe/proxy + 后台全面板 + Git 同步）。
- M6 打磨（今日轨道、命令面板、动效/空状态、无障碍、README）。
- 随后以 MIT 协议开源。

[2.0.0]: https://github.com/ccBilly-aipm/ccbilly-worker/releases/tag/v2.0.0
[1.1.0]: https://github.com/ccBilly-aipm/ccbilly-worker/releases/tag/v1.1.0
[1.0.0]: https://github.com/ccBilly-aipm/ccbilly-worker/releases/tag/v1.0.0
