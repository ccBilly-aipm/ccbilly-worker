"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin", label: "数据概览" },
  { href: "/admin/git", label: "Git 同步" },
  { href: "/admin/apps", label: "应用管理" },
  { href: "/admin/skills", label: "Skill 目录" },
  { href: "/admin/settings", label: "个性化" },
  { href: "/admin/export", label: "数据导出" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="glass flex flex-wrap gap-1 rounded-full p-1">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              active ? "btn-brand" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
