"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils/cn";

/** Bottom tab bar for mobile (spec §7). Shows the 5 most-used destinations. */
const MOBILE_ITEMS = NAV_ITEMS.filter((i) =>
  ["/", "/tasks", "/reports/daily", "/skills", "/admin"].includes(i.href),
);

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-around px-2 py-1.5 !rounded-none !border-x-0 !border-b-0 md:hidden">
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px]",
              active ? "text-fg" : "text-muted",
            )}
          >
            <Icon size={20} className={active ? "text-brand-cyan" : ""} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
