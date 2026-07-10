"use client";

import { usePathname } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GitBadge } from "@/components/layout/git-badge";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { useCommandPalette } from "@/components/command/command-store";

/** Top bar: breadcrumb + global search + git badge + theme toggle + quick-new. */
export function Topbar() {
  const pathname = usePathname();
  const openPalette = useCommandPalette((s) => s.open);
  const current = NAV_ITEMS.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
        <span className="font-display font-medium text-fg">
          {current?.label ?? "ccBilly"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => openPalette()}
        className="glass glass-hover ml-auto flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted"
        aria-label="全局搜索"
      >
        <Search size={15} />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="hidden rounded bg-[rgb(var(--glass-bg)/0.1)] px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <GitBadge />
      <ThemeToggle />

      <button
        type="button"
        onClick={() => openPalette("new")}
        className="btn-brand flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium"
        aria-label="快速新建"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">新建</span>
      </button>
    </header>
  );
}
