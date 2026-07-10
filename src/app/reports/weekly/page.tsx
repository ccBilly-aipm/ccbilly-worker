import { Suspense } from "react";
import { WeeklyPageInner } from "@/features/reports/weekly-page-inner";
import { SkeletonCard } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function WeeklyReportsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl"><SkeletonCard /></div>}>
      <WeeklyPageInner />
    </Suspense>
  );
}
