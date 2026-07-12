/**
 * PM template pack (blueprint B3.6). Built-in templates for PRD / competitive
 * analysis / user interview / retro / meeting notes. Kept in code (not vault) so
 * they're always available; a "use this template" action can materialize one
 * into a knowledge note or decision. Meeting-notes template uses `- [ ] @行动项`
 * lines that the notes→tasks converter (B3.5) can batch-extract.
 */

export interface TemplateDef {
  id: string;
  title: string;
  description: string;
  body: string;
}

export const PM_TEMPLATES: TemplateDef[] = [
  {
    id: "prd",
    title: "PRD · 产品需求文档",
    description: "背景 / 目标 / 用户与场景 / 需求范围 / 指标 / 里程碑",
    body: [
      "# PRD：<产品/功能名>",
      "",
      "## 背景与问题",
      "## 目标与非目标",
      "## 目标用户与核心场景",
      "## 需求范围（MVP / 后续）",
      "## 成功指标",
      "## 里程碑与排期",
      "## 风险与依赖",
      "",
    ].join("\n"),
  },
  {
    id: "competitive",
    title: "竞品分析",
    description: "对象 / 定位 / 功能矩阵 / 差异化 / 结论",
    body: [
      "# 竞品分析：<赛道/对象>",
      "",
      "## 分析对象",
      "## 各家定位",
      "## 功能矩阵",
      "| 维度 | 我们 | 竞品A | 竞品B |",
      "|---|---|---|---|",
      "| | | | |",
      "## 差异化机会",
      "## 结论",
      "",
    ].join("\n"),
  },
  {
    id: "interview",
    title: "用户访谈记录",
    description: "背景 / 问题清单 / 原话摘录 / 洞察",
    body: [
      "# 用户访谈：<受访者/群体>",
      "",
      "## 访谈背景",
      "## 问题清单",
      "## 原话摘录（逐字）",
      "> ",
      "## 洞察与假设",
      "",
    ].join("\n"),
  },
  {
    id: "retro",
    title: "复盘",
    description: "目标回顾 / 做得好 / 待改进 / 行动项",
    body: [
      "# 复盘：<项目/周期>",
      "",
      "## 目标回顾",
      "## 做得好的",
      "## 待改进的",
      "## 行动项",
      "- [ ] @负责人 具体行动",
      "",
    ].join("\n"),
  },
  {
    id: "meeting",
    title: "会议纪要",
    description: "议题 / 讨论 / 决议 / 行动项（可一键转任务）",
    body: [
      "# 会议纪要：<主题>",
      "",
      "## 议题",
      "## 讨论要点",
      "## 决议",
      "## 行动项",
      "- [ ] @某人 待办事项 1",
      "- [ ] @某人 待办事项 2",
      "",
    ].join("\n"),
  },
];

export function getTemplate(id: string): TemplateDef | undefined {
  return PM_TEMPLATES.find((t) => t.id === id);
}

/**
 * Extract action items from meeting-notes markdown (blueprint B3.5): unchecked
 * `- [ ] ...` lines. Returns the trimmed action text for each (the leading
 * `@owner` is kept as part of the title).
 */
export function extractActionItems(markdown: string): string[] {
  const out: string[] = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^\s*[-*]\s*\[\s\]\s+(.+?)\s*$/);
    if (m && m[1].trim()) out.push(m[1].trim());
  }
  return out;
}
