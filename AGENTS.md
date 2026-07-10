# ccBilly 工作台 · 通用 Agent 入口（Codex 及其他非 Claude Code 工具）

任何 Agent 在本仓库执行任何操作之前，必须先完整阅读：
1. `docs/HANDBOOK.md`（项目单一事实来源：架构、ADR、schema、里程碑、验收清单、红线）
2. `docs/COLLABORATION.md`（协作协议、任务看板、协作日志）

然后依次：
- 在 `docs/COLLABORATION.md` 的「在册 Agent」登记自己（标识 / 类型 / 角色 / 领地 / 加入时间）；
- 在任务看板认领任务（一次只认领一个，标记 `🔄 进行中@<你的标识>`）；
- 在自己的领地内工作；
- 完成后提交（commit 附 `Co-Agent: <你的标识>`）；
- 在协作日志追加记录（保留最近 15 条，更旧移入 `docs/logs/archive-YYYYMM.md`）。

## 默认领地
非 Claude Code 的 Agent 仅允许写入 `public/assets/` 及协作文档中属于自己的条目；任务看板明确分配了其他范围的除外。

## 红线与 Git 纪律（与 CLAUDE.md 一致）
- 不 force push；不改写 git 历史；不删除 `vault/` 真实数据；不提交 `.env*` 或任何密钥；自动化测试不触碰真实 `~/.claude/skills/`。
- Conventional Commits，scope=模块名；提交粒度=一个通过验证的任务。
- 验证标准：`pnpm verify` 必须全绿方可提交，禁止注释掉失败测试来变绿。

## 需求规格原文
《ccBilly工作台-ClaudeCode开发提示词.md》（Part A 为需求基准）。与 HANDBOOK 冲突时以 HANDBOOK 的 ADR 为准。
