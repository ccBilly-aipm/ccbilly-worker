import { cn } from "@/lib/utils/cn";

/** Glass shimmer skeleton (spec §8: 三件套之一). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="glass space-y-3 p-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
