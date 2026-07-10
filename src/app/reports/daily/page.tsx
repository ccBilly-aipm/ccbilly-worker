import { Suspense } from "react";
import { DailyPageInner } from "@/features/reports/daily-page-inner";
import { SkeletonCard } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function DailyReportsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl"><SkeletonCard /></div>}>
      <DailyPageInner />
    </Suspense>
  );
}
