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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Primary navigation (spec §6). Chinese labels, English routes. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/tasks", label: "任务", icon: ListTodo },
  { href: "/collections", label: "合集", icon: FolderKanban },
  { href: "/reports/daily", label: "日报", icon: FileText },
  { href: "/reports/weekly", label: "周报", icon: CalendarRange },
  { href: "/skills", label: "Skill", icon: Sparkles },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
  { href: "/apps", label: "应用中心", icon: AppWindow },
  { href: "/admin", label: "后台", icon: Settings },
];
