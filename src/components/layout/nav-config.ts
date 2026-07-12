import {
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  FileText,
  CalendarRange,
  Sparkles,
  BookOpen,
  AppWindow,
  Settings,
  Inbox,
  Target,
  CircleDashed,
  GitBranch,
  ScrollText,
  Lightbulb,
  PenSquare,
  CalendarDays,
  Rss,
  type LucideIcon,
} from "lucide-react";
import { moduleVisible, type ModuleId, type PresetId } from "@/lib/preset/presets";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which module gates this item (for preset-based visibility). */
  module: ModuleId;
}

/**
 * Primary navigation (spec §6 + V2 modules). Chinese labels, English routes.
 * Each item names its module so the preset layer (ADR-020) can show/hide it.
 * Order groups core → PM → creator → admin.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard, module: "dashboard" },
  { href: "/inbox", label: "收件箱", icon: Inbox, module: "inbox" },
  { href: "/tasks", label: "任务", icon: ListTodo, module: "tasks" },
  { href: "/collections", label: "合集", icon: FolderKanban, module: "collections" },
  // PM modules
  { href: "/requirements", label: "需求池", icon: Target, module: "requirements" },
  { href: "/cycles", label: "周期", icon: CircleDashed, module: "cycles" },
  { href: "/roadmap", label: "路线图", icon: GitBranch, module: "roadmap" },
  { href: "/decisions", label: "决策日志", icon: ScrollText, module: "decisions" },
  // Creator modules
  { href: "/ideas", label: "选题库", icon: Lightbulb, module: "ideas" },
  { href: "/content", label: "内容管道", icon: PenSquare, module: "content" },
  { href: "/calendar", label: "发布日历", icon: CalendarDays, module: "calendar" },
  { href: "/feeds", label: "情报源", icon: Rss, module: "feeds" },
  // reports/skills/knowledge/apps
  { href: "/reports/daily", label: "日报", icon: FileText, module: "reports" },
  { href: "/reports/weekly", label: "周报", icon: CalendarRange, module: "reports" },
  { href: "/skills", label: "Skill", icon: Sparkles, module: "skills" },
  { href: "/knowledge", label: "知识库", icon: BookOpen, module: "knowledge" },
  { href: "/apps", label: "应用中心", icon: AppWindow, module: "apps" },
  { href: "/admin", label: "后台", icon: Settings, module: "admin" },
];

/** Filter nav items to those whose module is visible under the given preset. */
export function navForPreset(preset: PresetId): NavItem[] {
  return NAV_ITEMS.filter((i) => moduleVisible(preset, i.module));
}
