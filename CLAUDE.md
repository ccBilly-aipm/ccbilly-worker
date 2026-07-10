# ccBilly 工作台 · Claude Code 项目指令

@docs/HANDBOOK.md
@docs/COLLABORATION.md

## 启动即生效的规则
1. 上面两行导入的是本项目的单一事实来源（HANDBOOK）与协作协议（COLLABORATION），视为每个会话开始前已强制阅读。
2. 本项目运行「自主交付模式」，循环：认领 → 实现 → `pnpm verify` 全绿 → commit → 更新文档 → 记日志 → push → 下一个。
3. 禁止向 B哥 提问；歧义自行决策并记入 HANDBOOK 的 ADR。允许停下的三种例外见 HANDBOOK §4.4。
4. 红线：不 force push；不改写 git 历史；不删除 vault/ 真实数据；不提交 .env*；测试不触碰真实 `~/.claude/skills/`。
5. 需求规格原文：《ccBilly工作台-ClaudeCode开发提示词.md》。与 HANDBOOK 冲突时，以 HANDBOOK 中更新的 ADR 为准。

## 常用命令
- `pnpm dev` — 本地开发（默认 http://localhost:3000）
- `pnpm verify` — lint + typecheck + 单元测试 + 构建（提交前必须全绿）
- `pnpm test:e2e` — Playwright E2E（chromium headless）
- `pnpm seed` — 生成演示数据到 vault/
- `pnpm reindex` — 从 vault/ 重建 SQLite 索引缓存

## 上下文自恢复
一切状态落文档。任何全新会话，仅凭读取本文件（及其自动导入的 HANDBOOK + COLLABORATION）即可无损接管工作。
