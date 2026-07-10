import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type EmptyKind = "tasks" | "reports" | "skills" | "apps" | "knowledge" | "error";

/**
 * Maps each empty-state kind to a GPT Image illustration in public/assets/.
 * knowledge reuses the apps illustration (both are card/module themed); error
 * uses the 404 illustration. Kinds without a bespoke asset fall back gracefully.
 */
const ART_SRC: Record<EmptyKind, string> = {
  tasks: "/assets/empty-tasks.png",
  reports: "/assets/empty-reports.png",
  skills: "/assets/empty-skills.png",
  apps: "/assets/empty-apps.png",
  knowledge: "/assets/empty-apps.png",
  error: "/assets/illustration-404.png",
};

/** The reusable empty-state (spec §8: 三件套之一). */
export function EmptyState({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: EmptyKind;
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
      {/* Dark-space illustrations sit in a rounded glass "porthole" so their
          black background reads as intentional on both light and dark themes. */}
      <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border)/0.14)] shadow-[0_0_28px_rgba(34,211,238,0.18)]">
        <Image
          src={ART_SRC[kind]}
          alt=""
          width={160}
          height={160}
          className="h-36 w-36 object-cover"
        />
      </div>
      <h3 className="font-display text-base font-medium text-fg">{title}</h3>
      {description && <p className="max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
