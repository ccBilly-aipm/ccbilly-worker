import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder for routes whose full feature lands in a later milestone. */
export function ComingSoon({
  title,
  milestone,
  kind = "apps",
}: {
  title: string;
  milestone: string;
  kind?: "tasks" | "reports" | "skills" | "apps" | "knowledge" | "error";
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <EmptyState
        kind={kind}
        title={title}
        description={`此模块将在 ${milestone} 里程碑上线。地基已就绪，数据层与主题壳已可用。`}
      />
    </div>
  );
}
