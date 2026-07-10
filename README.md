# ccBilly 工作台

B哥（Billy）的本地优先个人工作台 —— 任务 / 合集 / 日报 / 周报 / Skill 管理 / 知识库 / 应用中心 / 后台管理，深空玻璃拟态视觉，明暗双主题。

> **数据即 Markdown**：所有业务数据都是 `vault/` 目录下的纯文本 `.md` 文件（YAML frontmatter + Markdown 正文）。Git 友好、Obsidian 可直接打开、可无损粘贴进飞书。SQLite（`cache/index.db`）只是可随时重建的索引缓存，从不作为事实来源。

---

## 快速开始

```bash
# 1. 启用 pnpm（首次）
corepack enable

# 2. 安装依赖
pnpm install

# 3.（可选）生成一套演示数据
pnpm seed

# 4. 启动开发服务器
pnpm dev            # 打开 http://localhost:3000
```

> Node 20+。首次装依赖若提示 better-sqlite3 需要编译原生模块，见下方「原生依赖」。

### 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地开发（http://localhost:3000） |
| `pnpm verify` | lint + typecheck + 单元测试 + 构建（提交前必须全绿） |
| `pnpm test` | 只跑单元测试（Vitest） |
| `pnpm test:e2e` | 端到端测试（Playwright / chromium） |
| `pnpm seed` | 生成演示数据到 `vault/` |
| `pnpm reindex` | 从 `vault/` 重建 SQLite 索引缓存 |

---

## GitHub 多设备同步工作流

1. 把整个项目（**含 `vault/`**）推到 GitHub。`vault/` 是数据载体，必须提交；`cache/`、`node_modules/`、`.next/`、`.env*` 已在 `.gitignore` 中排除。
2. 换设备后：`git pull` → `pnpm install` → `pnpm dev`，全部数据即刻恢复。
3. 日常同步用后台的 **Git 面板**（M5 上线）：一键「快速提交」+「同步（pull --rebase 后 push）」。检测到冲突时会列出冲突文件，请用 Obsidian / 编辑器手动解决——**本工具永不 force push**。

## 配合 Obsidian

- 把 `vault/` 作为一个 Obsidian 库打开（或软链进你现有库）。双向编辑互不冲突：你在 Obsidian 里改任一文件，工作台会在**数秒内自动感知并刷新**（chokidar 监听）。
- 支持 `[[wiki 双链]]`。`vault/.obsidian/` 默认被 gitignore；若你想同步 Obsidian 工作区配置，删掉 `.gitignore` 里对应那行即可。

## 配合飞书

- 日报 / 周报页面的「**复制为 Markdown**」按钮输出纯 Markdown（无 HTML），粘贴进飞书文档标题、列表、链接格式不乱（M3 上线）。

---

## 原生依赖（better-sqlite3）

better-sqlite3 是原生模块，需要在本机编译一次。pnpm 默认会拦截构建脚本，本仓库已在 `pnpm-workspace.yaml` 用 `onlyBuiltDependencies` 放行。若首次安装后 `cache/index.db` 无法创建，手动重建原生二进制：

```bash
pnpm rebuild better-sqlite3
```

## 后台口令

后台 `/admin` 用环境变量 `ADMIN_PASSCODE` + httpOnly cookie 做简单口令保护。复制 `.env.example` 为 `.env.local` 并设置：

```
ADMIN_PASSCODE=你的口令
```

> ⚠️ **此鉴权仅防本机误触**。若你把工作台部署到公网，必须另加真正的认证层（反向代理鉴权 / OAuth 等）。

## Docker 部署（可选）

```bash
docker compose up --build      # 构建并启动，访问 http://localhost:3000
```

`vault/` 通过卷挂载持久化。详见 `docker-compose.yml`。

---

## 项目文档

- `docs/HANDBOOK.md` —— 架构、ADR、数据 schema、里程碑、验收清单（单一事实来源）
- `docs/COLLABORATION.md` —— 协作协议与进度看板
- `CLAUDE.md` / `AGENTS.md` —— AI 协作入口
- `ccBilly工作台-ClaudeCode开发提示词.md` —— 需求规格原文

## 里程碑进度

- **M1 地基** ✅ —— 数据层、SQLite 索引、明暗主题壳、seed、验证基建
- M2 任务系统 · M3 报告系统 · M4 Skill 双模块 · M5 接入与后台 · M6 打磨（进行中）

详见 `docs/HANDBOOK.md` §5。
