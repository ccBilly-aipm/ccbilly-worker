/**
 * Per-platform adaptation checklists (blueprint B4.4) and metric aggregation
 * (B4.5). Each platform has a small checklist of things to prepare before
 * publishing there. The checklist is rendered from these definitions; ticking is
 * stored in the content body as a `## 平台适配` checklist section.
 */

export interface PlatformDef {
  id: string;
  label: string;
  checklist: string[];
}

export const PLATFORMS: PlatformDef[] = [
  {
    id: "公众号",
    label: "公众号",
    checklist: ["封面图 900×383", "摘要 ≤120 字", "原创声明", "引导关注语"],
  },
  {
    id: "小红书",
    label: "小红书",
    checklist: ["首图 3:4", "话题标签 ≥3", "正文分段带 emoji", "@相关话题"],
  },
  {
    id: "抖音",
    label: "抖音",
    checklist: ["竖版封面", "前 3 秒钩子", "话题标签", "字幕"],
  },
  {
    id: "B站",
    label: "B站",
    checklist: ["横版封面 16:9", "简介带时间轴", "分区/标签", "三连引导"],
  },
  {
    id: "X",
    label: "X",
    checklist: ["首条钩子", "配图/视频", "话题标签 ≤2", "thread 结构"],
  },
];

export function platformDef(id: string): PlatformDef | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

/** Build the `## 平台适配` checklist markdown for a set of platforms. */
export function buildPlatformChecklist(platforms: string[]): string {
  const lines: string[] = ["## 平台适配", ""];
  for (const id of platforms) {
    const def = platformDef(id);
    if (!def) continue;
    lines.push(`### ${def.label}`);
    for (const item of def.checklist) lines.push(`- [ ] ${item}`);
    lines.push("");
  }
  return lines.join("\n");
}

export interface MetricRow {
  date: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers_gained: number;
}

/** Sum metrics per platform for a content item's snapshots (B4.5). */
export function aggregateByPlatform(
  metrics: MetricRow[],
): { platform: string; views: number; likes: number }[] {
  const map = new Map<string, { views: number; likes: number }>();
  for (const m of metrics) {
    const cur = map.get(m.platform) ?? { views: 0, likes: 0 };
    cur.views += Number(m.views) || 0;
    cur.likes += Number(m.likes) || 0;
    map.set(m.platform, cur);
  }
  return [...map.entries()].map(([platform, v]) => ({ platform, ...v }));
}
