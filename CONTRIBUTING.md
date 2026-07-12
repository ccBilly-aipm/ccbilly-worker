# 贡献指南 · Contributing

感谢你对 ccBilly 工作台的兴趣！这是一个本地优先的单用户个人工作台。欢迎参考、自用、提 Issue / PR。

> 这是一个个人项目，维护带宽有限，Issue / PR 随缘处理。但下面的约定能让协作更顺。

## 开发环境

- **Node**：见 `.nvmrc`（Node 22）。用 `nvm use` 切到对应版本。
- **包管理**：pnpm（通过 corepack，无需全局安装）。

```bash
corepack enable
pnpm install
pnpm rebuild better-sqlite3   # 首次若原生模块未编译
pnpm seed                     # 生成一套演示数据（可选）
pnpm dev                      # http://localhost:3000
```

## 提交前必须全绿

本项目的"功能没问题"有客观定义——提交前必须让下面这条全绿：

```bash
pnpm verify   # = next lint && tsc --noEmit && vitest run && next build
```

端到端测试（改动涉及 UI / 路由 / 安全时务必跑）：

```bash
pnpm test:e2e   # Playwright chromium headless
```

**禁止**为了让流水线变绿而注释掉失败的测试。CI 会在每个 PR 上跑 `pnpm verify` + Playwright（含 S1 安全对抗性测试）。

## 代码约定

- **语言**：界面文案用中文；代码 / 变量 / 注释用英文。
- **数据即 Markdown**：所有业务数据是 `vault/*.md`（frontmatter + 正文）。**禁止把业务数据只存进二进制数据库**——SQLite 只是可重建的索引缓存。
- **写操作顺序**：zod 校验 → 写临时文件 → 原子 `rename` → 更新索引。写回必须保留未知 frontmatter 字段。
- **安全红线**：任何涉及文件系统 / 网络 / 鉴权的改动，请先读 [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md)，遵循"先证明再修"的方式补对抗性测试。自动化测试**绝不触碰真实 `~/.claude/skills/`**（用临时目录，见 `ADR-009`）。

## 提交规范

- **Conventional Commits**，scope = 模块名，例如 `fix(security): ...`、`feat(tasks): ...`。
- 一个通过验证的改动 = 一个提交。
- PR 请说明：改了什么、为什么、怎么验证的。

## 架构上下文

单一事实来源是 [`docs/HANDBOOK.md`](docs/HANDBOOK.md)（架构、ADR、数据 schema、里程碑）。动手前先读它；有架构级决策请新增一条 ADR（只增不删，被推翻的标注"已被 ADR-NNN 取代"）。
