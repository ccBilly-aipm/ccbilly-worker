"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * Light/dark toggle with a smooth celestial swap micro-animation (spec §7).
 * Cycles the *resolved* theme; long-press / system tri-state is handled in the
 * admin personalization panel. Renders a stable placeholder pre-mount to avoid
 * hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="切换主题"
      title="切换明暗主题"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative grid h-9 w-9 place-items-center overflow-hidden rounded-full glass glass-hover",
        className,
      )}
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ y: 12, opacity: 0, rotate: -30 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -12, opacity: 0, rotate: 30 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="text-fg"
          >
            {isDark ? <Moon size={17} /> : <Sun size={17} />}
          </motion.span>
        </AnimatePresence>
      ) : (
        <span className="h-[17px] w-[17px]" />
      )}
    </button>
  );
}
