import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

/** The base glass surface used everywhere (spec §7). */
export function GlassCard({ className, hover, ...props }: GlassCardProps) {
  return (
    <div
      className={cn("glass p-4", hover && "glass-hover", className)}
      {...props}
    />
  );
}
