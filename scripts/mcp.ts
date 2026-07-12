/**
 * ccBilly 工作台 MCP server (blueprint decision three / ADR-023).
 *
 * Exposes the workbench as tools an Agent (Claude Code, etc.) can drive over
 * stdio. Write tools honor the AUTH_MODE=passcode credential constraint
 * (CCBILLY_MCP_TOKEN must equal ADMIN_PASSCODE). Run: `pnpm mcp`.
 *
 * Tools: list_tasks / create_task / update_task / append_activity /
 *        create_idea / generate_daily_draft / get_stats
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listTasks,
  createTaskTool,
  updateTaskTool,
  appendActivityTool,
  createIdeaTool,
  generateDailyDraftTool,
  getStatsTool,
} from "../src/lib/mcp/tools";

// Watching would keep the process alive and spam stdout; disable it for the CLI.
process.env.CCBILLY_NO_WATCH = "1";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

async function main() {
  const server = new McpServer({
    name: "ccbilly-worker",
    version: "2.0.0",
  });

  server.registerTool(
    "list_tasks",
    {
      description:
        "列出任务。可选按 status（todo/doing/blocked/done/archived）与 kind（task/requirement/content）筛选。",
      inputSchema: {
        status: z.string().optional(),
        kind: z.string().optional(),
      },
    },
    async (args) => json(await listTasks(args)),
  );

  server.registerTool(
    "create_task",
    {
      description: "新建一个任务。写操作：AUTH_MODE=passcode 时需 token。",
      inputSchema: {
        title: z.string(),
        priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
        collection: z.string().nullable().optional(),
        token: z.string().optional(),
      },
    },
    async (args) => json(await createTaskTool(args)),
  );

  server.registerTool(
    "update_task",
    {
      description: "更新任务的状态 / 标题 / 优先级。写操作。",
      inputSchema: {
        slug: z.string(),
        status: z.string().optional(),
        title: z.string().optional(),
        priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
        token: z.string().optional(),
      },
    },
    async (args) => json(await updateTaskTool(args)),
  );

  server.registerTool(
    "append_activity",
    {
      description: "给任务的「动态」时间线追加一条记录。写操作。",
      inputSchema: {
        slug: z.string(),
        text: z.string(),
        token: z.string().optional(),
      },
    },
    async (args) => json(await appendActivityTool(args)),
  );

  server.registerTool(
    "create_idea",
    {
      description: "在选题库新建一个内容选题（kind=content, stage=idea）。写操作。",
      inputSchema: {
        title: z.string(),
        angle: z.string().optional(),
        token: z.string().optional(),
      },
    },
    async (args) => json(await createIdeaTool(args)),
  );

  server.registerTool(
    "generate_daily_draft",
    {
      description:
        "生成某天（默认今天，YYYY-MM-DD）的日报草稿并返回其正文。写操作（会写入日报文件）。",
      inputSchema: {
        date: z.string().optional(),
        token: z.string().optional(),
      },
    },
    async (args) => json(await generateDailyDraftTool(args)),
  );

  server.registerTool(
    "get_stats",
    {
      description: "读取工作台统计：今日完成率、任务/需求/内容计数等。",
      inputSchema: {},
    },
    async () => json(await getStatsTool()),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers stay connected until the client closes the pipe.
}

main().catch((e) => {
  // MCP servers must not write logs to stdout (it's the protocol channel).
  process.stderr.write(`MCP server failed: ${(e as Error).message}\n`);
  process.exit(1);
});
