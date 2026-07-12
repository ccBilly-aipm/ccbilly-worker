/**
 * Persona presets (ADR-020). A preset = which modules are visible + which
 * dashboard layout is the default + a small vocabulary map. Switching a preset
 * only affects the presentation layer — it never migrates or deletes business
 * data (red line). Three built-ins: pm, creator, both (default).
 */

export type PresetId = "pm" | "creator" | "both";

/** Every toggleable module in the app. Nav + dashboard widgets key off these. */
export type ModuleId =
  | "dashboard"
  | "tasks"
  | "collections"
  | "reports"
  | "skills"
  | "knowledge"
  | "apps"
  | "admin"
  // V2 PM modules
  | "requirements"
  | "cycles"
  | "roadmap"
  | "decisions"
  // V2 creator modules
  | "ideas"
  | "content"
  | "calendar"
  | "feeds"
  // V2 shared
  | "inbox";

export interface PresetDef {
  id: PresetId;
  label: string;
  description: string;
  /** Modules visible under this preset. */
  modules: ModuleId[];
}

// Modules every preset shows.
const CORE: ModuleId[] = [
  "dashboard",
  "tasks",
  "collections",
  "reports",
  "knowledge",
  "apps",
  "inbox",
  "admin",
];

const PM_MODULES: ModuleId[] = [
  "requirements",
  "cycles",
  "roadmap",
  "decisions",
  "skills",
];

const CREATOR_MODULES: ModuleId[] = [
  "ideas",
  "content",
  "calendar",
  "feeds",
];

export const PRESETS: Record<PresetId, PresetDef> = {
  pm: {
    id: "pm",
    label: "PM 模式",
    description: "产品经理工作台：需求池、RICE、周期燃尽、路线图、决策日志。",
    modules: [...CORE, ...PM_MODULES],
  },
  creator: {
    id: "creator",
    label: "创作者模式",
    description: "自媒体工作台：选题库、内容管道、发布日历、数据复盘、情报源。",
    modules: [...CORE, ...CREATOR_MODULES],
  },
  both: {
    id: "both",
    label: "双修模式",
    description: "全部模块开启，PM 与创作者能力兼得。",
    modules: [...CORE, ...PM_MODULES, ...CREATOR_MODULES],
  },
};

export const DEFAULT_PRESET: PresetId = "both";

/** Is a module visible under the given preset? */
export function moduleVisible(preset: PresetId, moduleId: ModuleId): boolean {
  return PRESETS[preset].modules.includes(moduleId);
}
