import { cn } from "@/lib/utils/cn";

/** Status + priority visual vocabulary shared across list/kanban/drawer. */

export const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  todo: { label: "待办", dot: "bg-info", text: "text-info" },
  doing: { label: "进行中", dot: "bg-brand-cyan", text: "text-brand-cyan" },
  blocked: { label: "受阻", dot: "bg-danger", text: "text-danger" },
  done: { label: "完成", dot: "bg-success", text: "text-success" },
  archived: { label: "归档", dot: "bg-muted", text: "text-muted" },
};

export const STATUS_ORDER = ["todo", "doing", "blocked", "done"] as const;

const PRIORITY_META: Record<string, string> = {
  P0: "border-danger/40 text-danger",
  P1: "border-warning/40 text-warning",
  P2: "border-info/40 text-info",
  P3: "border-muted/40 text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.todo;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      <span className={m.text}>{m.label}</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular",
        PRIORITY_META[priority] ?? PRIORITY_META.P2,
      )}
    >
      {priority}
    </span>
  );
}
