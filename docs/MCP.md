# ccBilly 工作台 · MCP Server

把工作台变成 **Agent 可驱动的工具**。启动一个 [MCP](https://modelcontextprotocol.io/) server（stdio 传输），Claude Code 等 Agent 就能直接查询/创建任务、追加动态、记选题、生成日报草稿、读统计——不再只是「开发这个工作台」，而是**日常驱动**它。

> 设计见 [HANDBOOK ADR-023](HANDBOOK.md)。

## 启动

```bash
pnpm mcp
```

server 走 **stdio**，由 MCP 客户端（如 Claude Code）拉起，不监听端口。它读写的是你本地的 `vault/`（用 `CCBILLY_VAULT_DIR` 覆盖默认路径）。

## 工具集（7 个）

| 工具 | 读/写 | 说明 |
|---|---|---|
| `list_tasks` | 读 | 列任务，可按 `status` / `kind` 筛选 |
| `create_task` | 写 | 新建任务（title / priority / collection） |
| `update_task` | 写 | 改状态 / 标题 / 优先级 |
| `append_activity` | 写 | 给任务「动态」追加一条（日报数据源） |
| `create_idea` | 写 | 在选题库新建内容选题 |
| `generate_daily_draft` | 写 | 生成某天日报草稿并返回正文 |
| `get_stats` | 读 | 今日完成率、任务/需求/内容计数 |

## 鉴权约束（写工具）

与 HTTP 层的分层鉴权（[SECURITY.md](../SECURITY.md)）一致：

- `AUTH_MODE=none`（默认，本机单人）：写工具直接可用。
- `AUTH_MODE=passcode`：**写工具**必须携带凭据——MCP 客户端把 `CCBILLY_MCP_TOKEN` 设为你的 `ADMIN_PASSCODE`，或在工具入参里传 `token`。不匹配则拒绝；`AUTH_MODE=passcode` 但没设 `ADMIN_PASSCODE` 时 fail-closed 全拒。**读工具**（`list_tasks` / `get_stats`）不受此约束。

## 在 Claude Code 里连接

把工作台注册为一个本地 MCP server（在你的 Claude Code MCP 配置里）：

```json
{
  "mcpServers": {
    "ccbilly": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/path/to/ccbilly-worker",
      "env": {
        "CCBILLY_VAULT_DIR": "/path/to/ccbilly-worker/vault",
        "AUTH_MODE": "none"
      }
    }
  }
}
```

若开了 passcode 模式，加上：

```json
      "env": {
        "AUTH_MODE": "passcode",
        "ADMIN_PASSCODE": "你的强口令",
        "CCBILLY_MCP_TOKEN": "你的强口令"
      }
```

连上后，就能对 Agent 说：

- 「把这周的选题按 RICE 排个序」（Agent 用 `list_tasks kind=requirement` 读，再排序）
- 「给今天的公众号阅读数据录入并生成复盘」
- 「新建一个任务：调研 wewe-rss 的部署」（`create_task`）
- 「生成今天的日报草稿」（`generate_daily_draft`）

## 快速自测（不接客户端）

用裸 JSON-RPC 验证握手与工具列表：

```bash
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
  sleep 2
} | pnpm mcp
```

应看到 7 个工具的 schema。集成测试见 `tests/unit/v2-mcp.test.ts`（每个工具的读写往返 + 鉴权矩阵）。
