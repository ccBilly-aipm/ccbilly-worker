import { Suspense } from "react";
import { TasksClient } from "@/features/tasks/tasks-client";
import { SkeletonCard } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      }
    >
      <TasksClient />
    </Suspense>
  );
}
