import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

/** The reusable empty-state (spec §8: 三件套之一). */
export function EmptyState({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: "tasks" | "reports" | "skills" | "apps" | "knowledge" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-14 text-center text-muted",
        className,
      )}
    >
      <PlaceholderArt kind={kind} className="opacity-90" />
      <h3 className="font-display text-base font-medium text-fg">{title}</h3>
      {description && <p className="max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
