"use client";

import dynamic from "next/dynamic";

/**
 * Recharts is heavy; lazy-load the below-the-fold dashboard charts so they don't
 * block the LCP (the 今日轨道 card). SSR disabled — these are decorative and
 * hydrate after the critical paint.
 */
const chartFallback = (
  <div className="skeleton h-40 w-full rounded-xl" aria-hidden />
);

export const LazyTrendArea = dynamic(
  () => import("@/features/dashboard/dashboard-charts").then((m) => m.TrendArea),
  { ssr: false, loading: () => chartFallback },
);

export const LazyDistributionPie = dynamic(
  () =>
    import("@/features/dashboard/dashboard-charts").then(
      (m) => m.DistributionPie,
    ),
  { ssr: false, loading: () => chartFallback },
);

export const LazyBurndownChart = dynamic(
  () =>
    import("@/features/dashboard/dashboard-charts").then((m) => m.BurndownChart),
  { ssr: false, loading: () => chartFallback },
);
