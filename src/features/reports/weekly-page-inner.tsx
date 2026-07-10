"use client";

import { useSearchParams } from "next/navigation";
import { WeeklyClient } from "@/features/reports/weekly-client";

export function WeeklyPageInner() {
  const params = useSearchParams();
  return <WeeklyClient openCurrent={params.get("current") === "1"} />;
}
