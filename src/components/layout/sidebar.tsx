"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { navForPreset } from "@/components/layout/nav-config";
import type { PresetId } from "@/lib/preset/presets";
import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";

/** Glass sidebar (spec §7): icon+label, collapsible to icons only. Desktop only;
 *  mobile uses the bottom tab bar. Nav items are filtered by the active preset. */
export function Sidebar({ preset }: { preset: PresetId }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = navForPreset(preset);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-1 p-3 md:flex",
        "glass !rounded-none !border-y-0 !border-l-0",
        collapsed ? "w-[68px]" : "w-[224px]",
        "transition-[width] duration-200 ease-space",
      )}
    >
      <Link
        href="/"
        className="mb-4 flex items-center gap-2.5 px-2 py-3"
        aria-label="ccBilly 首页"
      >
        {/* app-icon is a square dark-space image; a rounded container makes its
            black background read as an app icon, not a stray black block. */}
        <Image
          src="/assets/app-icon.png"
          alt="ccBilly"
          width={34}
          height={34}
          priority
          className="shrink-0 rounded-xl border border-[rgb(var(--border)/0.14)] shadow-[0_0_16px_rgba(34,211,238,0.2)]"
        />
        {!collapsed && (
          <span className="font-display text-lg font-semibold text-brand-gradient">
            ccBilly
          </span>
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-fg"
                  : "text-muted hover:text-fg hover:bg-[rgb(var(--glass-bg)/0.06)]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-[rgb(var(--aurora-cyan)/0.12)] ring-1 ring-[rgb(var(--aurora-cyan)/0.25)]"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <Icon size={18} className="relative z-10 shrink-0" />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-fg"
        aria-label={collapsed ? "展开侧栏" : "折叠侧栏"}
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>折叠</span>}
      </button>
    </aside>
  );
}
