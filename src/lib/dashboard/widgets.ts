import type { ModuleId, PresetId } from "@/lib/preset/presets";
import { moduleVisible } from "@/lib/preset/presets";

/**
 * Widget registry (ADR-021). Each widget declares which module gates it (so it
 * only appears when that module is visible under the active preset) and a default
 * width in a 4-column Bento grid (1..4). Layout (order + per-widget width) is
 * persisted per-preset to vault/config/dashboard.md.
 */

export type WidgetId =
  | "today-orbit"
  | "today-todo"
  | "trend-14"
  | "distribution"
  | "heatmap"
  | "requirement-queue"
  | "cycle-burndown"
  | "content-pipeline"
  | "publish-calendar"
  | "quick-capture";

export interface WidgetDef {
  id: WidgetId;
  title: string;
  /** Module that gates this widget's visibility. */
  module: ModuleId;
  /** Default column span in a 4-col grid. */
  defaultW: 1 | 2 | 3 | 4;
  /** Allowed widths the user can cycle through. */
  widths: (1 | 2 | 3 | 4)[];
}

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  "today-orbit": {
    id: "today-orbit",
    title: "今日轨道",
    module: "dashboard",
    defaultW: 2,
    widths: [2, 3, 4],
  },
  "today-todo": {
    id: "today-todo",
    title: "今日待办",
    module: "tasks",
    defaultW: 2,
    widths: [1, 2],
  },
  "trend-14": {
    id: "trend-14",
    title: "近 14 天完成趋势",
    module: "tasks",
    defaultW: 2,
    widths: [2, 3, 4],
  },
  distribution: {
    id: "distribution",
    title: "合集分布",
    module: "collections",
    defaultW: 2,
    widths: [1, 2],
  },
  heatmap: {
    id: "heatmap",
    title: "年度活动热力图",
    module: "dashboard",
    defaultW: 4,
    widths: [2, 3, 4],
  },
  "requirement-queue": {
    id: "requirement-queue",
    title: "需求分诊队列",
    module: "requirements",
    defaultW: 2,
    widths: [1, 2],
  },
  "cycle-burndown": {
    id: "cycle-burndown",
    title: "周期燃尽环",
    module: "cycles",
    defaultW: 2,
    widths: [1, 2],
  },
  "content-pipeline": {
    id: "content-pipeline",
    title: "内容管道",
    module: "content",
    defaultW: 2,
    widths: [1, 2],
  },
  "publish-calendar": {
    id: "publish-calendar",
    title: "发布日历缩略",
    module: "calendar",
    defaultW: 2,
    widths: [1, 2],
  },
  "quick-capture": {
    id: "quick-capture",
    title: "快速捕捉",
    module: "inbox",
    defaultW: 1,
    widths: [1, 2],
  },
};

export const ALL_WIDGET_IDS = Object.keys(WIDGETS) as WidgetId[];

/** Default layout per preset: ordered widget ids visible under that preset. */
export function defaultLayoutFor(preset: PresetId): { id: WidgetId; w: number }[] {
  // A sensible default ordering; only widgets whose module is visible are kept.
  const order: WidgetId[] = [
    "today-orbit",
    "today-todo",
    "quick-capture",
    "requirement-queue",
    "cycle-burndown",
    "content-pipeline",
    "publish-calendar",
    "trend-14",
    "distribution",
    "heatmap",
  ];
  return order
    .filter((id) => moduleVisible(preset, WIDGETS[id].module))
    .map((id) => ({ id, w: WIDGETS[id].defaultW }));
}

export function isWidgetId(v: unknown): v is WidgetId {
  return typeof v === "string" && v in WIDGETS;
}
