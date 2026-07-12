"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navForPreset } from "@/components/layout/nav-config";
import type { PresetId } from "@/lib/preset/presets";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom tab bar for mobile (spec §7). Shows up to 5 destinations for the active
 * preset: dashboard + inbox + the first role-specific modules + admin.
 */
export function MobileNav({ preset }: { preset: PresetId }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const all = navForPreset(preset);
  // Always keep dashboard + admin; fill the middle with the next visible items.
  const dashboard = all.find((i) => i.href === "/");
  const admin = all.find((i) => i.href === "/admin");
  const middle = all
    .filter((i) => i.href !== "/" && i.href !== "/admin")
    .slice(0, 3);
  const items = [dashboard, ...middle, admin].filter(
    (i): i is NonNullable<typeof i> => Boolean(i),
  );

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-around px-2 py-1.5 !rounded-none !border-x-0 !border-b-0 md:hidden">
      {items.map((item) => {
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
